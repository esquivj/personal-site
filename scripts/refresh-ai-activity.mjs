import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeActivity } from './import-ai-activity.mjs';

// Local only: no login, network upload, commit or deployment.
const directory = await mkdtemp(join(tmpdir(), 'personal-site-activity-'));
try {
  const file = join(directory, 'combined.json');
  const { stderr } = await promisify(execFile)(
    process.execPath,
    [fileURLToPath(import.meta.resolve('claude-count-tokens')), 'export', '--combined', '-o', file],
    { env: { ...process.env, TZ: 'America/Los_Angeles' }, maxBuffer: 1024 * 1024 }
  );
  if (stderr.trim())
    throw new Error(`Collector reported a problem; existing snapshot preserved.\n${stderr}`);
  const data = sanitizeActivity(JSON.parse(await readFile(file, 'utf8')));
  if (!data.days.some((day) => day.claude + day.codex > 0)) {
    throw new Error('No usage records found. Existing snapshot preserved.');
  }
  const target = new URL('../src/data/ai-activity.json', import.meta.url);
  const temporary = new URL('../src/data/ai-activity.json.tmp', import.meta.url);
  await writeFile(temporary, JSON.stringify(data, null, 2) + '\n');
  await rename(temporary, target);
  console.log(
    `Refreshed ${data.days.length} dates. Review the daily totals in git diff before publishing.`
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
