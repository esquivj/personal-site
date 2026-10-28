import { writeFile, rename } from 'node:fs/promises';
import { collectActivity } from './collect-ai-activity.mjs';

// Local only: no login, upload, commit, or deployment.
const { snapshot, audit } = await collectActivity();
if (!snapshot.days.some((day) => day.claude + day.codex > 0)) {
  throw new Error('No usage records found. Existing snapshot preserved.');
}
const target = new URL('../src/data/ai-activity.json', import.meta.url);
const temporary = new URL('../src/data/ai-activity.json.tmp', import.meta.url);
await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
await rename(temporary, target);
console.log(JSON.stringify(audit, null, 2));
console.log(`Refreshed ${snapshot.days.length} dates. Review daily totals before publishing.`);
