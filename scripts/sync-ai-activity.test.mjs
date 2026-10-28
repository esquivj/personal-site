import test from 'node:test';
import assert from 'node:assert/strict';
import {
  retainDeviceHistory,
  uploadDevice,
  publishActivity,
  STORE_REPO,
  WEBSITE_REPO,
} from './sync-ai-activity.mjs';

const record = (id, tokens) => ({
  id: id.repeat(64),
  date: '2026-01-01',
  values: [tokens, 0, 0, 0],
});
const bundle = (device, records) => ({
  kind: 'personal-site-device-usage',
  version: 1,
  device,
  exportedAt: '2026-01-02T12:00:00.000Z',
  timeZone: 'America/Los_Angeles',
  claude: records,
  codex: [],
});
const snapshot = (claude = 1) => ({
  version: 1,
  updatedAt: '2026-01-02T12:00:00.000Z',
  timeZone: 'America/Los_Angeles',
  collector: 'merged-local-usage-v1',
  days: [{ date: '2026-01-01', claude, codex: 0 }],
});
const pr = {
  head: { ref: 'codex/ai-activity-panel', repo: { full_name: WEBSITE_REPO } },
  html_url: 'https://github.com/esquivj/personal-site/pull/16',
};

function mock({
  privateRepo = true,
  missingMacbook = false,
  previous = snapshot(),
  open = [pr],
  largeBlob = false,
  conflict = false,
} = {}) {
  const writes = [];
  const files = new Map([
    ['devices/desktop.activity.json', bundle('desktop', [record('a', 10)])],
    ['devices/macbook.activity.json', bundle('macbook', [record('b', 20)])],
  ]);
  if (missingMacbook) files.delete('devices/macbook.activity.json');
  let conflicts = 0;
  const api = async (method, endpoint, body) => {
    if (method !== 'GET') {
      if (conflict && method === 'PUT' && endpoint.includes(STORE_REPO) && !conflicts++)
        throw Object.assign(new Error('conflict'), { status: 409 });
      writes.push({ method, endpoint, body });
      return { html_url: 'https://github.com/esquivj/personal-site/pull/new' };
    }
    if (endpoint === `repos/${STORE_REPO}`) return { private: privateRepo, default_branch: 'main' };
    if (endpoint.includes('/pulls?')) return open;
    if (endpoint.includes('/git/ref/heads/main')) return { object: { sha: 'main-commit' } };
    if (endpoint.includes('/git/blobs/'))
      return {
        encoding: 'base64',
        content: Buffer.from(JSON.stringify(files.get('devices/desktop.activity.json'))).toString(
          'base64'
        ),
      };
    if (endpoint.includes('/contents/')) {
      const path = endpoint.split('/contents/')[1].split('?')[0];
      const data = endpoint.includes(STORE_REPO) ? files.get(path) : previous;
      if (!data) throw Object.assign(new Error('missing'), { status: 404 });
      return {
        type: 'file',
        sha: 'file-sha',
        encoding: largeBlob && path.includes('desktop') ? 'none' : 'base64',
        content: Buffer.from(JSON.stringify(data)).toString('base64'),
      };
    }
    throw new Error(`Unexpected test API path: ${endpoint}`);
  };
  return { api, writes };
}

test('hourly upload preserves pruned history and deduplicates streaming counters', () => {
  const old = bundle('desktop', [record('a', 100), record('b', 20)]);
  const fresh = bundle('desktop', [record('a', 110)]);
  const result = retainDeviceHistory(old, fresh);
  assert.equal(result.claude.length, 2);
  assert.equal(
    result.claude.reduce((n, r) => n + r.values[0], 0),
    130
  );
  assert.throws(() => retainDeviceHistory(old, bundle('macbook', [])));
});

test('private upload supports large GitHub blobs and retries concurrent writes', async () => {
  const { api, writes } = mock({ largeBlob: true, conflict: true });
  const result = await uploadDevice({
    api,
    device: 'desktop',
    bundle: bundle('desktop', [record('c', 30)]),
  });
  assert.equal(result.uploaded, true);
  assert.equal(writes.length, 1);
  const data = JSON.parse(Buffer.from(writes[0].body.content, 'base64'));
  assert.equal(data.claude.length, 2);
  assert.ok(
    writes[0].endpoint.startsWith(`repos/${STORE_REPO}/contents/devices/desktop.activity.json`)
  );
});

test('public storage and mismatched device files fail before any upload', async () => {
  const { api, writes } = mock({ privateRepo: false });
  await assert.rejects(
    uploadDevice({ api, device: 'desktop', bundle: bundle('desktop', []) }),
    /private/
  );
  await assert.rejects(
    uploadDevice({ api, device: 'desktop', bundle: bundle('macbook', []) }),
    /destination/
  );
  assert.equal(writes.length, 0);
});

test('publication writes only daily aggregates to the existing feature branch', async () => {
  const { api, writes } = mock();
  const result = await publishActivity({ api });
  assert.equal(result.claude, 30);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].body.branch, 'codex/ai-activity-panel');
  assert.equal(writes[0].endpoint, `repos/${WEBSITE_REPO}/contents/src/data/ai-activity.json`);
  const data = JSON.parse(Buffer.from(writes[0].body.content, 'base64'));
  assert.deepEqual(Object.keys(data), ['version', 'updatedAt', 'timeZone', 'collector', 'days']);
  assert.deepEqual(data.days, [{ date: '2026-01-01', claude: 30, codex: 0 }]);
});

test('missing devices and decreased totals preserve the website snapshot', async () => {
  for (const options of [{ missingMacbook: true }, { previous: snapshot(100) }]) {
    const { api, writes } = mock(options);
    await assert.rejects(publishActivity({ api }));
    assert.equal(writes.length, 0);
  }
});

test('unchanged data and dry runs create no commits or PRs', async () => {
  const same = mock({ previous: snapshot(30) });
  assert.equal((await publishActivity({ api: same.api })).unchanged, true);
  assert.equal(same.writes.length, 0);
  const dry = mock();
  assert.equal((await publishActivity({ api: dry.api, dryRun: true })).wouldUpdate, true);
  assert.equal(dry.writes.length, 0);
});

test('after the initial PR, publication creates a draft data PR without writing to main', async () => {
  const { api, writes } = mock({ open: [] });
  await publishActivity({ api });
  assert.equal(writes[0].endpoint, `repos/${WEBSITE_REPO}/git/refs`);
  assert.match(writes[1].body.branch, /^codex\/activity-refresh-/);
  assert.equal(writes[2].body.draft, true);
  assert.equal(writes[2].body.base, 'main');
  assert.equal(
    writes.some((write) => write.method === 'PUT' && write.body.branch === 'main'),
    false
  );
});
