# Agent guide: personal-site (Astro)

## Ground rules
- Never push to `main`, merge PRs, or deploy without Juan's explicit approval. Work on a branch and open a PR.
- Structured content lives in `src/data/` (`travels.ts`, `writing.ts`) and the projects list in `src/pages/projects.astro`. Shapes are defined once in `src/data/schemas.mjs` (zod); types are inferred from it and data is parsed at load, so invalid data fails the build. Change the schema, not ad-hoc types.
- Update travel stats with `npx tsx scripts/update-travels.ts`, don't hand-edit totals.
- Don't reformat unrelated files (the repo is not fully Prettier-clean yet).

## Before opening a PR (CI runs the same)
```bash
npm ci && npm run typecheck && npm test && npm run build
```

## Commits by agents
Add a trailer naming the agent, e.g. `Co-authored-by: <Agent name> <agent@grokbot.invalid>`. Set identity per commit (`git -c user.name=... commit`), never in global git config. Don't skip hooks.
