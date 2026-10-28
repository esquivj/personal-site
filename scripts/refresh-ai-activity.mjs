import { readFile } from 'node:fs/promises';
import { collectActivity } from './collect-ai-activity.mjs';
import { exportDevice, mergeDeviceActivity, writeActivitySnapshot } from './device-ai-activity.mjs';

// Local only: no login, upload, commit, or deployment.
const target = new URL('../src/data/ai-activity.json', import.meta.url);
const imports = process.argv.slice(2);
if (imports.length) {
  const inputs = await Promise.all(
    imports.map(async (path) => JSON.parse(await readFile(path, 'utf8')))
  );
  const { bundle } = await exportDevice('this-mac');
  const { snapshot, report } = mergeDeviceActivity([bundle, ...inputs]);
  await writeActivitySnapshot(snapshot, target);
  console.log(JSON.stringify(report, null, 2));
} else {
  const existing = JSON.parse(await readFile(target, 'utf8'));
  if (existing.collector === 'merged-local-usage-v1') {
    throw new Error(
      'This snapshot includes multiple device exports. Pass those exports to activity:refresh, or use activity:merge; refusing to replace them with this Mac alone.'
    );
  }
  const { snapshot, audit } = await collectActivity();
  await writeActivitySnapshot(snapshot, target);
  console.log(JSON.stringify(audit, null, 2));
}
console.log('Refreshed daily snapshot. Review the diff before publishing.');
