import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeActivity } from './import-ai-activity.mjs';
import { aiActivitySchema } from '../src/data/schemas.mjs';
import { activityView, snapshotDay } from '../src/lib/ai-activity.mjs';

const raw = {
  product: 'combined',
  generatedAt: '2026-01-02T07:30:00.000Z',
  models: { privateModel: 999 },
  hourly: { private: [999] },
  path: '/private/project',
  products: {
    claude: { daily: { '2026-01-01': { tokens: 100, prompt: 'private', inputTokens: 50 } } },
    codex: { daily: { '2026-01-01': { tokens: 50 } } },
  },
};

test('export allowlist publishes only daily totals and metadata', () => {
  const data = sanitizeActivity(raw);
  assert.deepEqual(data.days, [{ date: '2026-01-01', claude: 100, codex: 50 }]);
  assert.equal(JSON.stringify(data).includes('private'), false);
  assert.equal(snapshotDay(data), '2026-01-01');
  assert.deepEqual(Object.keys(data), ['version', 'updatedAt', 'timeZone', 'collector', 'days']);
});

test('reject malformed, duplicate and future records', () => {
  const data = sanitizeActivity(raw);
  for (const tokens of [-1, NaN, Infinity, '100', 0.5]) {
    assert.throws(() =>
      sanitizeActivity({
        ...raw,
        products: { ...raw.products, claude: { daily: { '2026-01-01': { tokens } } } },
      })
    );
  }
  assert.throws(() => sanitizeActivity({ ...raw, product: 'claude' }));
  assert.throws(() => aiActivitySchema.parse({ ...data, days: [...data.days, ...data.days] }));
  assert.throws(() =>
    aiActivitySchema.parse({ ...data, days: [{ date: '2026-02-30', claude: 1, codex: 0 }] })
  );
  assert.throws(() =>
    aiActivitySchema.parse({ ...data, days: [{ date: '2026-01-02', claude: 1, codex: 0 }] })
  );
});

test('combined view sums providers once and filters source and year', () => {
  const data = sanitizeActivity(raw);
  assert.equal(activityView(data, 2026).total, 150);
  assert.equal(activityView(data, 2026, 'claude').total, 100);
  assert.equal(activityView(data, 2026, 'codex').total, 50);
  assert.equal(activityView(data, 2025).total, 0);
  assert.equal(activityView(data, 2026).activeDays, 1);
});

test('calendar handles leap years, Sunday alignment and snapshot cutoff', () => {
  const data = sanitizeActivity(raw);
  const leap = activityView(data, 2024);
  assert.equal(leap.cells.filter((cell) => cell.inYear).length, 366);
  assert.equal(new Date(`${leap.cells[0].date}T12:00Z`).getUTCDay(), 0);
  assert.ok(leap.cells.some((cell) => cell.date === '2024-02-29'));
  const view = activityView(data, 2026);
  assert.equal(view.cells.find((cell) => cell.date === '2026-01-02').future, true);
  assert.equal(view.cells.length % 7, 0);
});

test('zero-only sources never invent an active day or peak', () => {
  const data = sanitizeActivity(raw);
  data.days[0].codex = 0;
  const view = activityView(data, 2026, 'codex');
  assert.equal(view.total, 0);
  assert.equal(view.activeDays, 0);
  assert.deepEqual(view.peak, ['', 0]);
});
