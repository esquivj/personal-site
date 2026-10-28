import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createClaudeAccumulator,
  collectCodexRecords,
  collectActivity,
} from './collect-ai-activity.mjs';

const timestamp = '2026-01-02T06:00:00Z';
const usage = (input, output) => ({
  input_tokens: input,
  output_tokens: output,
  cached_input_tokens: input / 2,
  reasoning_output_tokens: output / 2,
});
const modern = (id, input, output, time = timestamp) => ({
  type: 'token_usage_record',
  timestamp: time,
  payload: { response_id: id, usage: usage(input, output) },
});
const legacy = (input, output, time = timestamp) => ({
  type: 'event_msg',
  timestamp: time,
  payload: {
    type: 'token_count',
    info: { total_token_usage: usage(input, output), last_token_usage: usage(input, output) },
  },
});

test('Claude counts one complete response across streaming fragments and copied logs', () => {
  const collector = createClaudeAccumulator();
  for (const [uuid, output] of [
    ['a', 2],
    ['b', 10],
    ['c', 10],
    ['a', 2],
  ]) {
    collector.accept({
      type: 'assistant',
      uuid,
      timestamp,
      requestId: 'request',
      message: {
        id: 'message',
        usage: {
          input_tokens: 100,
          output_tokens: output,
          cache_read_input_tokens: 200,
          cache_creation_input_tokens: 50,
        },
      },
    });
  }
  const { daily, audit } = collector.result();
  assert.equal(daily.get('2026-01-01'), 360);
  assert.equal(audit.uniqueResponses, 1);
  assert.equal(audit.duplicateFragments, 3);
});

test('Claude keeps distinct requests and deduplicates messages without request IDs', () => {
  const collector = createClaudeAccumulator();
  for (const requestId of [undefined, undefined, 'another'])
    collector.accept({
      type: 'assistant',
      timestamp,
      requestId,
      message: { id: 'message', usage: { input_tokens: 20, output_tokens: 2 } },
    });
  assert.equal(collector.result().daily.get('2026-01-01'), 44);
});

test('Codex prefers response records and does not add cached/reasoning subsets twice', () => {
  const result = collectCodexRecords([
    modern('a', 100, 10),
    modern('a', 100, 10),
    modern('b', 200, 20),
    legacy(300, 30, '2026-01-02T06:01:00Z'),
  ]);
  assert.equal(result.daily.get('2026-01-01'), 330);
  assert.equal(result.modernResponses, 2);
});

test('legacy cumulative counters ignore repeats and preserve dates across a reset', () => {
  const reset = legacy(10, 2, '2026-01-03T06:00:00Z');
  const result = collectCodexRecords([
    legacy(100, 10),
    legacy(100, 10),
    legacy(300, 30, '2026-01-02T06:01:00Z'),
    reset,
  ]);
  assert.equal(result.daily.get('2026-01-01'), 330);
  assert.equal(result.daily.get('2026-01-02'), 12);
});

test('a format upgrade preserves legacy history preceding response-level records', () => {
  const result = collectCodexRecords([
    legacy(100, 10),
    modern('new', 20, 2, '2026-01-03T06:00:00Z'),
    legacy(120, 12, '2026-01-03T06:01:00Z'),
  ]);
  assert.equal(result.daily.get('2026-01-01'), 110);
  assert.equal(result.daily.get('2026-01-02'), 22);
});

test('local audit reads live SQLite WAL, discovers unindexed logs, and excludes guessed Claude usage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'activity-test-'));
  const claudeRoot = join(root, 'claude');
  const codexRoot = join(root, 'codex');
  const { DatabaseSync } = await import('node:sqlite');
  let db;
  try {
    await mkdir(claudeRoot);
    await mkdir(join(codexRoot, 'sessions'), { recursive: true });
    await mkdir(join(codexRoot, 'archived_sessions'));
    await writeFile(
      join(claudeRoot, 'history.jsonl'),
      JSON.stringify({ timestamp: Date.parse(timestamp), display: 'private prompt' }) + '\n'
    );
    const events = [
      { type: 'session_meta', payload: { id: 'unindexed-thread' } },
      modern('response', 100, 10),
    ];
    const log = events.map((entry) => JSON.stringify(entry)).join('\n');
    await writeFile(join(codexRoot, 'sessions', 'one.jsonl'), log);
    await writeFile(join(codexRoot, 'archived_sessions', 'copy.jsonl'), log);
    db = new DatabaseSync(join(codexRoot, 'state_5.sqlite'));
    db.exec(
      'PRAGMA journal_mode=WAL; CREATE TABLE threads (id TEXT, rollout_path TEXT, updated_at INTEGER, created_at INTEGER, tokens_used INTEGER, model_provider TEXT)'
    );
    db.prepare('INSERT INTO threads VALUES (?, ?, ?, ?, ?, ?)').run(
      'missing',
      join(root, 'missing.jsonl'),
      Date.parse(timestamp) / 1000,
      0,
      50,
      'openai'
    );
    const result = await collectActivity({ claudeRoot, codexRoot });
    assert.deepEqual(result.snapshot.days, [{ date: '2026-01-01', claude: 0, codex: 160 }]);
    assert.equal(result.audit.claude.historyOnlyPrompts, 1);
    assert.equal(result.audit.codex.fallbackThreads, 1);
    assert.equal(result.audit.codex.modernResponses, 1);
    assert.equal(JSON.stringify(result).includes('private prompt'), false);
    assert.equal(JSON.stringify(result).includes(root), false);
  } finally {
    db?.close();
    await rm(root, { recursive: true, force: true });
  }
});
