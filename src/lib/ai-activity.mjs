/** @typedef {import('astro/zod').infer<typeof import('../data/schemas.mjs').aiActivitySchema>} Activity */
/** @typedef {'all' | 'claude' | 'codex'} Source */

export const compactTokens = (/** @type {number} */ value) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export const formatDay = (/** @type {string} */ date) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`));

/** @param {Activity} data */
export function snapshotDay(data) {
  return data.updatedAt
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: data.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(data.updatedAt))
    : null;
}

/** @param {Activity} data @param {number} year @param {Source} source */
export function activityView(data, year, source = 'all') {
  const end = snapshotDay(data);
  const rows = data.days.filter(
    (day) => day.date.startsWith(`${year}-`) && (!end || day.date <= end)
  );
  const amounts = new Map(
    rows.map((day) => [day.date, source === 'all' ? day.claude + day.codex : day[source]])
  );
  const active = [...amounts.entries()].filter(([, tokens]) => tokens > 0);
  const total = active.reduce((sum, [, tokens]) => sum + tokens, 0);
  const peak = active.reduce(
    (max, day) => (day[1] > max[1] ? day : max),
    /** @type {[string, number]} */ ['', 0]
  );
  const sorted = active.map(([, tokens]) => tokens).sort((a, b) => a - b);
  const thresholds = [0.25, 0.5, 0.75].map((q) => sorted[Math.floor((sorted.length - 1) * q)] || 0);
  const first = new Date(Date.UTC(year, 0, 1));
  const last = new Date(Date.UTC(year, 11, 31));
  const start = first.getTime() - first.getUTCDay() * 86400000;
  const columns = Math.ceil(((last.getTime() - start) / 86400000 + 1) / 7);
  const cells = Array.from({ length: columns * 7 }, (_, i) => {
    const date = new Date(start + i * 86400000).toISOString().slice(0, 10);
    const inYear = date.startsWith(`${year}-`);
    const future = !!end && date > end;
    const tokens = amounts.get(date) || 0;
    const level = tokens === 0 ? 0 : 1 + thresholds.filter((t) => tokens > t).length;
    return {
      date,
      tokens,
      level,
      inYear,
      future,
      label: `${formatDay(date)}: ${future ? 'after this snapshot' : tokens.toLocaleString('en-US') + ' recorded tokens'}`,
    };
  });
  const months = Array.from({ length: 12 }, (_, month) => ({
    label: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(year, month, 1))
    ),
    column: Math.floor((Date.UTC(year, month, 1) - start) / 86400000 / 7) + 1,
  }));
  return { total, activeDays: active.length, peak, cells, months, columns };
}
