# AI activity on Now

`AIActivity.astro` renders a compact panel beneath Now → Building. It has combined, Claude, and Codex filters with local brand icons, a year selector, keyboard/touch day inspection, muted heatmap palettes, and a dated snapshot. It makes no third-party requests. The latest year's combined view works without JavaScript.

## Audit and refresh locally

Requires Node 22.13 or newer (uses the read-only SQLite API).

```sh
npm ci
npm run activity:audit
npm run activity:refresh
git diff -- src/data/ai-activity.json
```

`activity:audit` prints aggregate coverage and counting diagnostics without modifying the snapshot. `activity:refresh` runs the same collector and atomically replaces the public daily totals. Neither command logs in, uploads, commits, pushes, or deploys. Run on the Mac with usage history; CI and production builds must never collect personal data.

Default roots are `~/.claude` and `~/.codex`. `CLAUDE_CONFIG_DIR` and `CODEX_HOME` can override them. The output contains only collection metadata and daily Claude/Codex totals, validated by `schemas.mjs`. No prompts, response IDs, thread IDs, project paths, models, or hourly records are published. The owner approved publishing the daily totals. Empty refreshes preserve the previous snapshot.

The original `activity:import` command is retained for historical combined exports from `claude-count-tokens@1.2.0`. Those exports use the upstream counting behavior described below; prefer the audited local collector for new snapshots.

## Add another Mac

Run this in Terminal **on the MacBook**, with Node 22.13 or newer. Use a new checkout so existing work is untouched:

```sh
git clone --branch codex/ai-activity-panel --single-branch https://github.com/esquivj/personal-site.git "$HOME/personal-site-token-export"
cd "$HOME/personal-site-token-export"
npm ci
npm run activity:export -- --device macbook --out "$HOME/Desktop/macbook.activity.json"
```

Transfer `macbook.activity.json` privately to the coordinating Mac (AirDrop, or attach it in the working conversation). Do not transfer the entire Claude/Codex folders. This file contains token counters, dates/timestamps, and one-way fingerprints needed to recognize duplicated responses and threads. It excludes prompts, code, paths, raw IDs, credentials, and models. It is private reconciliation data, not a website asset; do not commit it. The default export directory `private-activity/` and `*.activity.json` files are ignored by Git, and export rejects destinations inside the website source/public directories.

On the coordinating Mac, refresh its local data and combine it with the transferred export:

```sh
npm run activity:refresh -- /absolute/path/to/macbook.activity.json
git diff -- src/data/ai-activity.json
```

Or explicitly export each machine and merge the files:

```sh
npm run activity:export -- --device desktop
npm run activity:merge -- private-activity/desktop.activity.json /absolute/path/to/macbook.activity.json
```

The merge unions response records, keeps final streaming counters, and combines legacy events before calculating increments. Importing the same export twice does not increase the total. A Codex thread summary is a lower bound for that thread, not another amount to add to detailed responses. If both machines only retain summaries of the same thread, the largest total is kept; exact overlap and daily timing cannot be recovered without detailed logs. Distinct thread IDs remain separate.

Only the usual daily snapshot is written to `src/data/ai-activity.json`. The console report shows each source's export date, overlaps, and fallback coverage. Older exports remain older data; the merge does not make them current. Keep exports from all machines for future refreshes. After a merged snapshot exists, a plain `activity:refresh` refuses to replace it with just one Mac; pass the other exports again. Neither command publishes the website automatically.

Signing into the same account is not a device merge. This workflow can recover records present on the MacBook, but cannot recover deleted logs, other omitted machines, or cloud-only usage.

## Counting and coverage

- **Claude Code:** recursively reads project and subagent JSONL logs. Deduplicates by message ID and request ID (message ID alone if no request ID, UUID only as a fallback). Keeps the maximum counters for each streamed response, rather than summing content fragments. Includes input, output, cache creation, and cache reads.
- **Claude history:** prompt history has no measured token counts. It is used only to report missing coverage in the local audit, never to invent public totals or active days.
- **Codex:** reads the live SQLite database with WAL support and discovers session/archived logs, including unindexed files. Unions copied logs by thread. Prefers response-level `token_usage_record` counters, deduplicated by response ID. Input already contains cached input; output already contains reasoning output. Neither subset is added again.
- **Legacy Codex:** differences cumulative counters, ignores repeated totals, and handles counter resets. Legacy history preceding a format upgrade is preserved. With response-level records available, those are authoritative for the subsequent segment.
- **Missing Codex logs:** retains the recorded thread total from SQLite and assigns it to the thread's last update date. This preserves volume but cannot reconstruct daily timing. The audit reports how many threads and tokens use this fallback.

This is locally recorded usage, not complete account usage or a billing report. Web/cloud conversations, other devices, custom roots not selected, and deleted logs may be absent. Missing days mean no recorded tokens, not confirmed inactivity. Token volume includes repeated cached context and is not a productivity metric.

## Why the original collector was replaced

Inspection of pinned `claude-count-tokens@1.2.0` found:

1. Claude deduplication used entry UUIDs, so multiple streaming fragments for one response could be counted repeatedly.
2. History-only Claude days received 4,000 tokens per prompt, but stopped after the running day exceeded 40,000—creating repeated 44,000-token days unrelated to measured volume.
3. Codex discovery depended on database-indexed rollouts and ignored newer response-level usage records. Reading a raw SQLite file also omitted uncheckpointed WAL data.

The replacement is independently covered with synthetic streaming, duplicate, legacy/reset, format-upgrade, discovery, privacy, missing-history, and live-WAL fixtures. These corrections do not recover deleted or remote history. The upstream widget's sync feature provides freshness, not additional account coverage.

## Display and updates

Totals and peaks are recomputed for the selected provider/year. Heatmap levels use active-day quartiles with restrained warm, clay, and sage palettes. Dates after the snapshot are outlined and noninteractive. Explanations remain in the collapsed About disclosure.

Automatic publishing is not enabled. An hourly local export alone does not update the deployed site. Any future publishing job needs a visible freshness/error state and must publish only the daily snapshot.

## Verification

Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`. Check `/now#ai-activity` at desktop and phone widths, including icons, source/year controls, arrow keys, day taps, and About. The page must not overflow. No snapshot produces an empty state, never synthetic usage.
