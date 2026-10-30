import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeDeviceActivity, exportDevice, writeActivitySnapshot } from './device-ai-activity.mjs';

const id = (character) => character.repeat(64);
const bundle = (device, claude = [], codex = []) => ({
  kind: 'personal-site-device-usage',
  version: 1,
  device,
  exportedAt: '2026-01-03T12:00:00.000Z',
  timeZone: 'America/Los_Angeles',
  claude,
  codex,
});
const response = (key, input, output) => ({
  type: 'response',
  id: id(key),
  timestamp: '2026-01-02T12:00:00.000Z',
  usage: { input, output },
});

test('merges unique usage, collapses shared streaming records, and is order independent', () => {
  const first = bundle('desktop', [{ id: id('a'), date: '2026-01-01', values: [100, 2, 50, 200] }]);
  const second = bundle('macbook', [
    { id: id('a'), date: '2026-01-01', values: [100, 10, 50, 200] },
    { id: id('b'), date: '2026-01-02', values: [20, 5, 0, 0] },
  ]);
  const merged = mergeDeviceActivity([first, second]);
  assert.deepEqual(merged.snapshot.days, [
    { date: '2026-01-01', claude: 360, codex: 0 },
    { date: '2026-01-02', claude: 25, codex: 0 },
  ]);
  assert.deepEqual(mergeDeviceActivity([second, first, first]).snapshot, merged.snapshot);
  assert.equal(merged.report.duplicateClaudeRecords, 1);
});

test('copied Codex thread totals are not added to their detailed response records', () => {
  const first = bundle(
    'desktop',
    [],
    [{ id: id('c'), events: [], fallback: { timestamp: '2026-01-02T12:00:00.000Z', tokens: 150 } }]
  );
  const second = bundle(
    'macbook',
    [],
    [{ id: id('c'), events: [response('d', 100, 10), response('e', 50, 5)], fallback: null }]
  );
  const merged = mergeDeviceActivity([first, second, second]);
  assert.equal(merged.report.codex, 165);
  assert.equal(merged.report.fallbackTokens, 0);
  assert.equal(merged.report.uniqueCodexThreads, 1);
});

test('partial Codex logs retain only the missing portion of the largest thread total', () => {
  const first = bundle(
    'desktop',
    [],
    [
      {
        id: id('c'),
        events: [response('d', 100, 10)],
        fallback: { timestamp: '2026-01-03T10:00:00.000Z', tokens: 300 },
      },
    ]
  );
  const second = bundle(
    'macbook',
    [],
    [
      {
        id: id('c'),
        events: [response('d', 100, 10)],
        fallback: { timestamp: '2026-01-02T12:00:00.000Z', tokens: 200 },
      },
    ]
  );
  const merged = mergeDeviceActivity([first, second]);
  assert.equal(merged.report.codex, 300);
  assert.equal(merged.report.fallbackTokens, 190);
  assert.deepEqual(mergeDeviceActivity([second, first]).snapshot, merged.snapshot);
});

test('overlapping legacy rollouts are united before cumulative counters are differenced', () => {
  const event = (timestamp, input) => ({
    type: 'counter',
    timestamp,
    total: { input, output: 0 },
    last: { input, output: 0 },
  });
  const a = event('2026-01-01T12:00:00.000Z', 100);
  const b = event('2026-01-02T12:00:00.000Z', 250);
  const first = bundle('desktop', [], [{ id: id('f'), events: [a, b], fallback: null }]);
  const second = bundle('macbook', [], [{ id: id('f'), events: [b], fallback: null }]);
  const merged = mergeDeviceActivity([first, second]);
  assert.deepEqual(merged.snapshot.days, [
    { date: '2026-01-01', claude: 0, codex: 100 },
    { date: '2026-01-02', claude: 0, codex: 150 },
  ]);
});

test('rejects daily snapshots, unknown fields, invalid counts, and future device records', () => {
  assert.throws(() =>
    mergeDeviceActivity([{ days: [{ date: '2026-01-01', claude: 5, codex: 5 }] }])
  );
  assert.throws(() => mergeDeviceActivity([{ ...bundle('macbook'), prompt: 'private' }]));
  assert.throws(() =>
    mergeDeviceActivity([
      bundle('macbook', [{ id: id('a'), date: '2026-01-01', values: [-1, 0, 0, 0] }]),
    ])
  );
  assert.throws(() =>
    mergeDeviceActivity([
      bundle('macbook', [{ id: id('a'), date: '2026-01-04', values: [1, 0, 0, 0] }]),
    ])
  );
});

test('device export excludes prompts, code, paths and raw IDs; empty writes preserve snapshot', async () => {
  const root = await mkdtemp(join(tmpdir(), 'device-activity-test-'));
  try {
    const claudeRoot = join(root, 'claude');
    const codexRoot = join(root, 'codex');
    await mkdir(join(claudeRoot, 'projects'), { recursive: true });
    await mkdir(join(codexRoot, 'sessions'), { recursive: true });
    await writeFile(
      join(claudeRoot, 'projects', 'usage.jsonl'),
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-01-01T12:00:00Z',
        uuid: 'private-uuid',
        requestId: 'private-request',
        message: {
          id: 'private-response',
          content: 'private code',
          usage: { input_tokens: 100, output_tokens: 10 },
        },
      }) + '\n'
    );
    await writeFile(
      join(codexRoot, 'sessions', 'one.jsonl'),
      [
        { type: 'session_meta', payload: { id: 'private-thread', cwd: root } },
        {
          type: 'token_usage_record',
          timestamp: '2026-01-02T12:00:00Z',
          payload: {
            response_id: 'private-codex-response',
            usage: { input_tokens: 20, output_tokens: 2 },
            extra: 'private content',
          },
        },
      ]
        .map((entry) => JSON.stringify(entry))
        .join('\n')
    );
    const exported = await exportDevice('test-mac', { claudeRoot, codexRoot });
    assert.equal(JSON.stringify(exported.bundle).includes('private'), false);
    assert.equal(JSON.stringify(exported.bundle).includes(root), false);
    const merged = mergeDeviceActivity([exported.bundle, exported.bundle]);
    assert.equal(merged.report.claude, 110);
    assert.equal(merged.report.codex, 22);
    const target = join(root, 'snapshot.json');
    await writeActivitySnapshot(merged.snapshot, target);
    const before = await readFile(target, 'utf8');
    await assert.rejects(writeActivitySnapshot({ ...merged.snapshot, days: [] }, target));
    assert.equal(await readFile(target, 'utf8'), before);
    assert.equal(before.includes(id('a')), false);
    assert.deepEqual(Object.keys(JSON.parse(before)), [
      'version',
      'updatedAt',
      'timeZone',
      'collector',
      'days',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
