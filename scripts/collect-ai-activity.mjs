import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { aiActivitySchema } from '../src/data/schemas.mjs';

const zone = 'America/Los_Angeles';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: zone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const fields = [
  'input_tokens',
  'output_tokens',
  'cache_creation_input_tokens',
  'cache_read_input_tokens',
];
const number = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : 0);
const day = (timestamp) => {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? dateFormatter.format(date) : null;
};
const sum = (values) => values.reduce((total, value) => total + value, 0);
const codexTokens = (usage) => number(usage?.input_tokens) + number(usage?.output_tokens);
const add = (map, date, tokens) => {
  if (date && tokens > 0) map.set(date, (map.get(date) ?? 0) + tokens);
};

async function filesUnder(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(path);
  }
  return files.sort();
}

async function* records(path, audit) {
  const reader = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of reader) {
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      audit.invalidLines++;
      continue;
    }
    yield record;
  }
}

/** Collapse content-block splits and streaming updates into one response. */
export function createClaudeAccumulator() {
  const responses = new Map();
  let usageRecords = 0;
  let unidentifiedRecords = 0;
  return {
    accept(entry) {
      if (entry.type !== 'assistant' || !entry.message?.usage) return;
      const date = day(entry.timestamp);
      if (!date) return;
      usageRecords++;
      const message = entry.message;
      const key = message.id ? JSON.stringify([message.id, entry.requestId ?? '']) : entry.uuid;
      if (!key) {
        unidentifiedRecords++;
        return;
      }
      const values = fields.map((field) => number(message.usage[field]));
      const previous = responses.get(key);
      responses.set(key, {
        date: previous?.date < date ? previous.date : date,
        // Streaming output grows. Keep final counters, never sum fragments.
        values: values.map((value, index) => Math.max(value, previous?.values[index] ?? 0)),
      });
    },
    result() {
      const daily = new Map();
      const totals = fields.map(() => 0);
      for (const response of responses.values()) {
        add(daily, response.date, sum(response.values));
        response.values.forEach((value, index) => (totals[index] += value));
      }
      return {
        daily,
        audit: {
          usageRecords,
          uniqueResponses: responses.size,
          unidentifiedRecords,
          duplicateFragments: usageRecords - responses.size - unidentifiedRecords,
          measuredDays: daily.size,
          tokens: sum(totals),
          cacheTokens: totals[2] + totals[3],
        },
      };
    },
  };
}

/** Prefer response-level records; cumulative legacy counters must never be summed. */
export function collectCodexRecords(entries) {
  entries = [...entries].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  const modern = new Map();
  const legacy = new Map();
  const legacyPrefix = new Map();
  const firstModern = entries.find(
    (entry) => entry.type === 'token_usage_record' && entry.payload?.response_id
  )?.timestamp;
  let previousTotal = 0;
  let legacyEvents = 0;
  for (const entry of entries) {
    const date = day(entry.timestamp);
    if (!date) continue;
    const payload = entry.payload;
    if (entry.type === 'token_usage_record' && payload?.response_id) {
      const key = payload.response_id;
      const tokens = codexTokens(payload.usage);
      const previous = modern.get(key);
      if (!previous || tokens > previous.tokens) modern.set(key, { date, tokens });
    }
    if (entry.type !== 'event_msg' || payload?.type !== 'token_count' || !payload.info) continue;
    legacyEvents++;
    const info = payload.info;
    const total = info.total_token_usage && codexTokens(info.total_token_usage);
    let tokens;
    if (total != null) {
      // A reset starts a new segment; duplicate totals contribute zero.
      tokens = total >= previousTotal ? total - previousTotal : codexTokens(info.last_token_usage);
      previousTotal = total;
    } else tokens = codexTokens(info.last_token_usage);
    add(legacy, date, tokens);
    if (firstModern && entry.timestamp < firstModern) add(legacyPrefix, date, tokens);
  }
  const daily = new Map();
  if (modern.size) {
    for (const [date, tokens] of legacyPrefix) add(daily, date, tokens);
    for (const response of modern.values()) add(daily, response.date, response.tokens);
  } else {
    for (const [date, tokens] of legacy) add(daily, date, tokens);
  }
  return { daily, responseIds: new Set(modern.keys()), modernResponses: modern.size, legacyEvents };
}

/** Read-only audit. No prompts, identifiers, paths, or raw records in the output. */
export async function collectActivity({
  claudeRoot = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'),
  codexRoot = process.env.CODEX_HOME || join(homedir(), '.codex'),
} = {}) {
  const audit = { invalidLines: 0 };
  const claudeFiles = await filesUnder(join(claudeRoot, 'projects'));
  const claude = createClaudeAccumulator();
  for (const file of claudeFiles)
    for await (const entry of records(file, audit)) claude.accept(entry);
  const claudeResult = claude.result();
  const history = new Map();
  const historyPath = join(claudeRoot, 'history.jsonl');
  if (
    await stat(historyPath).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    })
  ) {
    for await (const entry of records(historyPath, audit)) add(history, day(entry.timestamp), 1);
  }
  const missingDays = [...history].filter(([date]) => !claudeResult.daily.has(date));
  audit.claude = {
    files: claudeFiles.length,
    ...claudeResult.audit,
    historyOnlyDays: missingDays.length,
    historyOnlyPrompts: sum(missingDays.map(([, count]) => count)),
  };

  // Read SQLite through its engine so live WAL records are included.
  const { DatabaseSync } = await import('node:sqlite');
  const dbPath = join(codexRoot, 'state_5.sqlite');
  let threads = [];
  if (
    await stat(dbPath).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    })
  ) {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      threads = db
        .prepare(
          "SELECT id, rollout_path, updated_at, created_at, tokens_used FROM threads WHERE model_provider = 'openai'"
        )
        .all();
    } finally {
      db.close();
    }
  }
  const discovered = [
    ...(await filesUnder(join(codexRoot, 'sessions'))),
    ...(await filesUnder(join(codexRoot, 'archived_sessions'))),
  ];
  const paths = new Set(
    [...discovered, ...threads.map((thread) => thread.rollout_path).filter(Boolean)].map((path) =>
      resolve(path)
    )
  );
  const parsed = new Map();
  const threadIds = new Set();
  const groups = new Map();
  const codexDaily = new Map();
  let modernResponses = 0;
  let legacyFiles = 0;
  for (const path of paths) {
    if (
      !(await stat(path).catch((error) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      }))
    )
      continue;
    const entries = [];
    let threadId;
    for await (const entry of records(path, audit)) {
      if (entry.type === 'session_meta') threadId = entry.payload?.id;
      if (
        entry.type === 'token_usage_record' ||
        (entry.type === 'event_msg' && entry.payload?.type === 'token_count')
      )
        entries.push(entry);
    }
    const key =
      threadId ||
      threads.find((thread) => thread.rollout_path && resolve(thread.rollout_path) === path)?.id ||
      path;
    const group = groups.get(key) || { entries: [], paths: [] };
    group.entries.push(...entries);
    group.paths.push(path);
    groups.set(key, group);
  }
  for (const [threadId, group] of groups) {
    // Union copied/archived rollouts; deduplicate repeated legacy events before differencing.
    const entries = [
      ...new Map(group.entries.map((entry) => [JSON.stringify(entry), entry])).values(),
    ];
    const result = collectCodexRecords(entries);
    const tokens = sum([...result.daily.values()]);
    group.paths.forEach((path) => parsed.set(path, tokens));
    if (tokens > 0 && threadId) threadIds.add(threadId);
    modernResponses += result.modernResponses;
    if (!result.modernResponses && result.legacyEvents) legacyFiles++;
    for (const [date, amount] of result.daily) add(codexDaily, date, amount);
  }
  let fallbackThreads = 0;
  let fallbackTokens = 0;
  for (const thread of threads) {
    if (
      threadIds.has(thread.id) ||
      (thread.rollout_path && parsed.get(resolve(thread.rollout_path)) > 0)
    )
      continue;
    const tokens = number(thread.tokens_used);
    if (!tokens) continue;
    add(codexDaily, day((thread.updated_at || thread.created_at) * 1000), tokens);
    fallbackTokens += tokens;
    fallbackThreads++;
    threadIds.add(thread.id);
  }
  audit.codex = {
    indexedThreads: threads.length,
    discoveredFiles: discovered.length,
    modernResponses,
    legacyFiles,
    fallbackThreads,
    fallbackTokens,
    tokens: sum([...codexDaily.values()]),
    measuredDays: codexDaily.size,
  };
  const dates = [...new Set([...claudeResult.daily.keys(), ...codexDaily.keys()])].sort();
  const snapshot = aiActivitySchema.parse({
    version: 1,
    updatedAt: new Date().toISOString(),
    timeZone: zone,
    collector: 'local-usage-v2',
    days: dates.map((date) => ({
      date,
      claude: claudeResult.daily.get(date) ?? 0,
      codex: codexDaily.get(date) ?? 0,
    })),
  });
  return { snapshot, audit };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify((await collectActivity()).audit, null, 2));
}
