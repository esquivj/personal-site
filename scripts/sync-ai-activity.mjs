import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { aiActivitySchema, deviceActivitySchema } from '../src/data/schemas.mjs';
import { exportDevice, mergeDeviceActivity } from './device-ai-activity.mjs';

export const STORE_REPO = 'esquivj/personal-site-activity';
export const WEBSITE_REPO = 'esquivj/personal-site';
const DEVICES = ['desktop', 'macbook'];
const SNAPSHOT_PATH = 'src/data/ai-activity.json';
const SETUP_BRANCH = 'codex/ai-activity-panel';
const UPDATE_PREFIX = 'codex/activity-refresh-';

export async function github(method, endpoint, body) {
  const directory = body ? await mkdtemp(join(tmpdir(), 'activity-api-')) : null;
  try {
    const args = ['api', endpoint, '--method', method, '-H', 'Accept: application/vnd.github+json'];
    if (body) {
      const path = join(directory, 'request.json');
      await writeFile(path, JSON.stringify(body), { mode: 0o600 });
      args.push('--input', path);
    }
    const { stdout } = await promisify(execFile)('gh', args, {
      maxBuffer: 32 * 1024 * 1024,
      timeout: 60000,
    });
    return stdout.trim() ? JSON.parse(stdout) : null;
  } catch (error) {
    const status = /HTTP (\d+)/.exec(error.stderr || error.message)?.[1];
    throw Object.assign(
      new Error(
        `GitHub request failed${status ? ` (HTTP ${status})` : ''}. Check gh authentication, connectivity, and repository access.`
      ),
      { status: Number(status) || null }
    );
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

async function privateStore(api) {
  const repo = await api('GET', `repos/${STORE_REPO}`);
  if (repo.private !== true)
    throw new Error('Activity storage must be private. No usage uploaded or published.');
  return repo.default_branch;
}

async function getJson(api, repo, path, branch) {
  let file;
  try {
    file = await api('GET', `repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
  if (file.type !== 'file' || !file.sha) throw new Error('Expected a regular repository file.');
  // Contents responses omit data above 1 MB. Fetch the exact immutable blob in that case.
  const blob =
    file.encoding === 'base64' ? file : await api('GET', `repos/${repo}/git/blobs/${file.sha}`);
  if (blob.encoding !== 'base64') throw new Error('Unsupported repository file encoding.');
  return { sha: file.sha, data: JSON.parse(Buffer.from(blob.content, 'base64').toString('utf8')) };
}

/** Preserve older records when local applications prune their history. */
export function retainDeviceHistory(previous, fresh) {
  const current = deviceActivitySchema.parse(fresh);
  if (!previous) return current;
  const old = deviceActivitySchema.parse(previous);
  if (old.device !== current.device)
    throw new Error('Device identity does not match the stored export.');
  const claude = new Map();
  const codex = new Map();
  for (const bundle of [old, current]) {
    for (const record of bundle.claude) {
      const saved = claude.get(record.id);
      claude.set(record.id, {
        id: record.id,
        date: saved && saved.date < record.date ? saved.date : record.date,
        values: record.values.map((value, index) => Math.max(value, saved?.values[index] ?? 0)),
      });
    }
    for (const thread of bundle.codex) {
      const saved = codex.get(thread.id) ?? { id: thread.id, events: new Map(), fallback: null };
      for (const event of thread.events) saved.events.set(JSON.stringify(event), event);
      if (
        thread.fallback &&
        (!saved.fallback ||
          thread.fallback.tokens > saved.fallback.tokens ||
          (thread.fallback.tokens === saved.fallback.tokens &&
            thread.fallback.timestamp > saved.fallback.timestamp))
      )
        saved.fallback = thread.fallback;
      codex.set(thread.id, saved);
    }
  }
  return deviceActivitySchema.parse({
    ...current,
    exportedAt: [old.exportedAt, current.exportedAt].sort().at(-1),
    claude: [...claude.values()].sort((a, b) => a.id.localeCompare(b.id)),
    codex: [...codex.values()]
      .map((thread) => ({ ...thread, events: [...thread.events.values()] }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export async function uploadDevice({ device, bundle, api = github, dryRun = false }) {
  if (!DEVICES.includes(device)) throw new Error('Device must be desktop or macbook.');
  const fresh = deviceActivitySchema.parse(bundle ?? (await exportDevice(device)).bundle);
  if (fresh.device !== device)
    throw new Error('Export device does not match the upload destination.');
  const branch = await privateStore(api);
  const path = `devices/${device}.activity.json`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const stored = await getJson(api, STORE_REPO, path, branch);
    const retained = retainDeviceHistory(stored?.data, fresh);
    const result = {
      device,
      exportedAt: retained.exportedAt,
      claudeResponses: retained.claude.length,
      codexThreads: retained.codex.length,
      dryRun,
    };
    if (dryRun) return result;
    if (stored && JSON.stringify(stored.data) === JSON.stringify(retained))
      return { ...result, unchanged: true };
    try {
      await api('PUT', `repos/${STORE_REPO}/contents/${path}`, {
        branch,
        ...(stored ? { sha: stored.sha } : {}),
        message: `Sync ${device} usage counters`,
        content: Buffer.from(JSON.stringify(retained) + '\n').toString('base64'),
      });
      return { ...result, uploaded: true };
    } catch (error) {
      if (error.status !== 409 || attempt === 2) throw error;
    }
  }
}

export function assertNoUsageLoss(previous, next) {
  const totals = (data, source) => data.days.reduce((sum, row) => sum + row[source], 0);
  for (const source of ['claude', 'codex']) {
    if (totals(next, source) < totals(previous, source))
      throw new Error(
        `Merged ${source} total decreased. Existing website snapshot preserved for review.`
      );
  }
}

export async function publishActivity({ api = github, dryRun = false } = {}) {
  const storeBranch = await privateStore(api);
  const bundles = [];
  for (const device of DEVICES) {
    const file = await getJson(api, STORE_REPO, `devices/${device}.activity.json`, storeBranch);
    if (!file) throw new Error(`Missing ${device} export. Website snapshot preserved.`);
    const bundle = deviceActivitySchema.parse(file.data);
    if (bundle.device !== device)
      throw new Error('Stored export device identity does not match its filename.');
    bundles.push(bundle);
  }
  const { snapshot, report } = mergeDeviceActivity(bundles);
  const open = await api('GET', `repos/${WEBSITE_REPO}/pulls?state=open&per_page=100`);
  const candidates = open.filter(
    (pr) =>
      pr.head?.repo?.full_name === WEBSITE_REPO &&
      (pr.head.ref === SETUP_BRANCH || pr.head.ref.startsWith(UPDATE_PREFIX))
  );
  if (candidates.length > 1)
    throw new Error('Multiple activity PRs are open. Resolve them before publishing.');
  const existingPR = candidates[0];
  const baselineBranch = existingPR?.head.ref || 'main';
  const baseline = await getJson(api, WEBSITE_REPO, SNAPSHOT_PATH, baselineBranch);
  if (!baseline)
    throw new Error('Merge the initial activity widget PR before creating automated data updates.');
  const previous = aiActivitySchema.parse(baseline.data);
  assertNoUsageLoss(previous, snapshot);
  const result = {
    devices: report.devices,
    claude: report.claude,
    codex: report.codex,
    fallbackTokens: report.fallbackTokens,
    dryRun,
  };
  if (JSON.stringify(previous.days) === JSON.stringify(snapshot.days))
    return { ...result, unchanged: true, url: existingPR?.html_url };
  if (dryRun) return { ...result, wouldUpdate: true, branch: baselineBranch };
  let branch = baselineBranch;
  if (!existingPR) {
    branch = `${UPDATE_PREFIX}${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
    const main = await api('GET', `repos/${WEBSITE_REPO}/git/ref/heads/main`);
    await api('POST', `repos/${WEBSITE_REPO}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: main.object.sha,
    });
  }
  if (branch === 'main') throw new Error('Refusing to write directly to main.');
  const target = await getJson(api, WEBSITE_REPO, SNAPSHOT_PATH, branch);
  // Re-read after branch selection so an intervening approved update cannot be overwritten.
  assertNoUsageLoss(aiActivitySchema.parse(target.data), snapshot);
  await api('PUT', `repos/${WEBSITE_REPO}/contents/${SNAPSHOT_PATH}`, {
    branch,
    sha: target.sha,
    message: 'Refresh combined daily token totals\n\nCo-authored-by: Codex <codex@openai.com>',
    content: Buffer.from(JSON.stringify(aiActivitySchema.parse(snapshot), null, 2) + '\n').toString(
      'base64'
    ),
  });
  if (existingPR) return { ...result, updated: true, url: existingPR.html_url };
  const pr = await api('POST', `repos/${WEBSITE_REPO}/pulls`, {
    title: 'Refresh AI activity totals',
    head: branch,
    base: 'main',
    draft: true,
    body: 'Refreshes daily Claude and Codex totals from both device exports. Shared records are deduplicated, missing devices and decreasing totals block updates, and only the validated daily snapshot is published. Private exports remain in private storage.\n\nOlder Codex thread summaries preserve volume but may have approximate daily timing. CI validates the update before review. No automatic merge.',
  });
  return { ...result, updated: true, url: pr.html_url };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      device: { type: 'string' },
      file: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  let result;
  if (command === 'upload')
    result = await uploadDevice({
      device: values.device,
      bundle: values.file ? JSON.parse(await readFile(values.file, 'utf8')) : undefined,
      dryRun: values['dry-run'],
    });
  else if (command === 'publish') result = await publishActivity({ dryRun: values['dry-run'] });
  else
    throw new Error(
      'Usage: npm run activity:sync -- upload --device desktop|macbook OR activity:sync -- publish'
    );
  console.log(JSON.stringify(result, null, 2));
}
