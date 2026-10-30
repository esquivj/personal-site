import { readFile, writeFile, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { aiActivitySchema } from '../src/data/schemas.mjs';

/** Explicit allowlist: discard hourly data, models, paths and all other export fields. */
export function sanitizeActivity(raw) {
  if (raw?.product !== 'combined' || !raw.products?.claude?.daily || !raw.products?.codex?.daily) {
    throw new Error('Expected a combined claude-count-tokens export with both product maps.');
  }
  const claude = raw.products.claude.daily;
  const codex = raw.products.codex.daily;
  const dates = [...new Set([...Object.keys(claude), ...Object.keys(codex)])].sort();
  return aiActivitySchema.parse({
    version: 1,
    updatedAt: raw.generatedAt,
    timeZone: 'America/Los_Angeles',
    collector: 'claude-count-tokens@1.2.0',
    days: dates.map((date) => ({
      date,
      claude: claude[date]?.tokens ?? 0,
      codex: codex[date]?.tokens ?? 0,
    })),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: npm run activity:import -- /path/to/combined-export.json');
  const data = sanitizeActivity(JSON.parse(await readFile(file, 'utf8')));
  if (!data.days.some((day) => day.claude + day.codex > 0)) {
    throw new Error('No recorded usage found. Refusing to overwrite the current snapshot.');
  }
  const output = new URL('../src/data/ai-activity.json', import.meta.url);
  const temp = new URL('../src/data/ai-activity.json.tmp', import.meta.url);
  await writeFile(temp, JSON.stringify(data, null, 2) + '\n');
  await rename(temp, output);
  console.log(`Imported ${data.days.length} dates. Only daily Claude/Codex totals will be public.`);
}
