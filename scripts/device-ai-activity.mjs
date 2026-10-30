import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { aiActivitySchema, deviceActivitySchema } from '../src/data/schemas.mjs';
import { collectActivity, collectCodexRecords } from './collect-ai-activity.mjs';

const add = (map, date, tokens) => {
  if (tokens > 0) map.set(date, (map.get(date) ?? 0) + tokens);
};
const sum = (values) => values.reduce((total, value) => total + value, 0);
const day = (timestamp) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));

export async function exportDevice(device, options = {}) {
  const { snapshot, transfer, audit } = await collectActivity({
    ...options,
    includeTransfer: true,
  });
  const bundle = deviceActivitySchema.parse({
    kind: 'personal-site-device-usage',
    version: 1,
    device,
    exportedAt: snapshot.updatedAt,
    timeZone: snapshot.timeZone,
    ...transfer,
  });
  if (!snapshot.days.length) throw new Error('No recorded usage found. Nothing exported.');
  return { bundle, audit };
}

/** Merge records, never daily snapshots. Order and repeated imports do not affect totals. */
export function mergeDeviceActivity(inputs) {
  if (!inputs.length) throw new Error('Provide at least one device export.');
  const bundles = inputs.map((input) => deviceActivitySchema.parse(input));
  const responses = new Map();
  const threads = new Map();
  let duplicateClaudeRecords = 0;
  for (const bundle of bundles) {
    for (const record of bundle.claude) {
      const previous = responses.get(record.id);
      if (previous) duplicateClaudeRecords++;
      responses.set(record.id, {
        date: previous && previous.date < record.date ? previous.date : record.date,
        values: record.values.map((value, index) => Math.max(value, previous?.values[index] ?? 0)),
      });
    }
    for (const thread of bundle.codex) {
      const previous = threads.get(thread.id) ?? { events: new Map(), fallback: null };
      for (const event of thread.events) previous.events.set(JSON.stringify(event), event);
      if (
        thread.fallback &&
        (!previous.fallback ||
          thread.fallback.tokens > previous.fallback.tokens ||
          (thread.fallback.tokens === previous.fallback.tokens &&
            thread.fallback.timestamp > previous.fallback.timestamp))
      ) {
        previous.fallback = thread.fallback;
      }
      threads.set(thread.id, previous);
    }
  }
  const claude = new Map();
  const codex = new Map();
  for (const record of responses.values()) add(claude, record.date, sum(record.values));
  let fallbackTokens = 0;
  let fallbackThreads = 0;
  const usage = (counters) =>
    counters && { input_tokens: counters.input, output_tokens: counters.output };
  for (const thread of threads.values()) {
    const entries = [...thread.events.values()].map((event) =>
      event.type === 'response'
        ? {
            type: 'token_usage_record',
            timestamp: event.timestamp,
            payload: { response_id: event.id, usage: usage(event.usage) },
          }
        : {
            type: 'event_msg',
            timestamp: event.timestamp,
            payload: {
              type: 'token_count',
              info: { total_token_usage: usage(event.total), last_token_usage: usage(event.last) },
            },
          }
    );
    const result = collectCodexRecords(entries);
    for (const [date, tokens] of result.daily) add(codex, date, tokens);
    // A copied thread total is a floor, not additional usage on top of its responses.
    // Where only totals survive on both machines, use the largest known total.
    const residual = Math.max(0, (thread.fallback?.tokens ?? 0) - sum([...result.daily.values()]));
    if (residual) {
      add(codex, day(thread.fallback.timestamp), residual);
      fallbackTokens += residual;
      fallbackThreads++;
    }
  }
  const dates = [...new Set([...claude.keys(), ...codex.keys()])].sort();
  const snapshot = aiActivitySchema.parse({
    version: 1,
    updatedAt: bundles
      .map((bundle) => bundle.exportedAt)
      .sort()
      .at(-1),
    timeZone: 'America/Los_Angeles',
    collector: 'merged-local-usage-v1',
    days: dates.map((date) => ({
      date,
      claude: claude.get(date) ?? 0,
      codex: codex.get(date) ?? 0,
    })),
  });
  const devices = [
    ...new Map(
      bundles
        .map((bundle) => [bundle.device, bundle.exportedAt])
        .sort((a, b) => a[1].localeCompare(b[1]))
    ),
  ].map(([device, exportedAt]) => ({ device, exportedAt }));
  return {
    snapshot,
    report: {
      devices,
      duplicateClaudeRecords,
      uniqueClaudeResponses: responses.size,
      uniqueCodexThreads: threads.size,
      fallbackThreads,
      fallbackTokens,
      claude: sum([...claude.values()]),
      codex: sum([...codex.values()]),
    },
  };
}

export async function writeActivitySnapshot(
  snapshot,
  target = new URL('../src/data/ai-activity.json', import.meta.url)
) {
  const data = aiActivitySchema.parse(snapshot);
  if (!data.days.some((record) => record.claude + record.codex > 0)) {
    throw new Error('No recorded usage found. Existing snapshot preserved.');
  }
  const path = target instanceof URL ? fileURLToPath(target) : target;
  const temporary = `${path}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + '\n');
  await rename(temporary, path);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (command === 'export') {
    const { values } = parseArgs({
      args: process.argv.slice(3),
      options: {
        device: { type: 'string' },
        out: { type: 'string' },
      },
    });
    if (!values.device || !/^[a-z0-9-]{1,40}$/.test(values.device)) {
      throw new Error('Use --device macbook (lowercase letters, digits, and hyphens only).');
    }
    const target = resolve(values.out || `private-activity/${values.device}.activity.json`);
    const repo = fileURLToPath(new URL('..', import.meta.url));
    const inside = relative(repo, target);
    if (
      !target.endsWith('.activity.json') ||
      (!inside.startsWith('..') && !isAbsolute(inside) && !inside.startsWith('private-activity/'))
    ) {
      throw new Error(
        'Save as *.activity.json outside the repository or inside private-activity/.'
      );
    }
    const { bundle, audit } = await exportDevice(values.device);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(`${target}.tmp`, JSON.stringify(bundle) + '\n', { mode: 0o600 });
    await rename(`${target}.tmp`, target);
    console.log(JSON.stringify(audit, null, 2));
    console.log(`Export saved to ${target}. Transfer this file privately; do not commit it.`);
  } else if (command === 'merge') {
    const paths = process.argv.slice(3);
    if (paths.length < 2)
      throw new Error('Usage: npm run activity:merge -- first.activity.json second.activity.json');
    const inputs = await Promise.all(
      paths.map(async (path) => JSON.parse(await readFile(path, 'utf8')))
    );
    const { snapshot, report } = mergeDeviceActivity(inputs);
    await writeActivitySnapshot(snapshot);
    console.log(JSON.stringify(report, null, 2));
    console.log('Updated daily snapshot only. Review the diff before publishing.');
  } else throw new Error('Expected export or merge.');
}
