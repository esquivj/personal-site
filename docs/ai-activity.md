# AI activity on Now

`AIActivity.astro` renders a native, static-first panel beneath Now → Building. It has combined, Claude, and Codex filters, a year selector, keyboard/touch day inspection, and a dated snapshot. It makes no third-party requests. The latest year's combined view works without JavaScript.

## Refresh locally

```sh
npm ci
npm run activity:refresh
git diff -- src/data/ai-activity.json
```

This invokes the pinned `claude-count-tokens@1.2.0` collector in export mode, with `TZ=America/Los_Angeles`. It reads local agent logs, writes a raw export into a temporary directory, and deletes it afterward. An allowlist keeps only the collection timestamp and daily Claude/Codex totals. The refresh never logs in, uploads, commits, pushes, or deploys. Run it on the Mac with the usage history; CI and the production build must never collect personal data.

An existing combined export generated in Los Angeles time can also be imported with `npm run activity:import -- /absolute/path/to/combined-export.json`.

The JSON snapshot lives in `src/data/ai-activity.json`; its shape is defined in `schemas.mjs`. Import errors and empty refreshes preserve the previous snapshot. Build-time validation rejects malformed, duplicate, negative, and future records. Changes go through the normal branch/PR workflow.

## Coverage

The collector supports local Claude Code, Conductor, Zed, and Codex sources. Its Claude grouping can include Conductor/Zed if those sources are available. Update the public explanation to match the sources being published. The owner approved publishing daily Claude/Codex totals for this widget. Only the sanitized daily snapshot is committed; raw records and hourly usage remain local.

Tokens include cached context. The collector may estimate old Claude sessions from prompt history and Codex sessions from thread totals when rollout events are missing. The panel does not imply billing accuracy, productivity, complete account usage, or coverage across devices. Gaps mean no recorded data, not confirmed inactivity. Totals, active days, and peak days are recomputed for the selected provider/year. Heatmap levels are relative quartiles of active days. Dates after the snapshot are outlined and noninteractive.

## Automatic updates

This version is a reviewed snapshot. An hourly local export alone does not update the deployed site. Automatic updates require a separately configured publishing path and a visible freshness/error state. Do not silently enable hosted sync or upload raw exports. The renderer keeps that future choice independent of the UI.

## Verification

Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`. Check `/now#ai-activity` at desktop and phone widths, including source/year controls, arrow keys, day taps, and the compact About disclosure. The chart scrolls horizontally on narrow screens; the page must not overflow. No snapshot produces an honest empty state, never synthetic usage.
