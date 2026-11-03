# juanesquivel.xyz

This repo holds the source for my portfolio site at [juanesquivel.xyz](https://juanesquivel.xyz). The site covers my work and writing, with pages for projects and speaking.

## How I built it

I directed Claude and Codex to build the site. Their `Co-authored-by` trailers in the git history show each contribution.

## Stack

The site runs on Astro 5 and TypeScript, with React islands for the interactive parts. Zod schemas in `src/data/schemas.mjs` validate structured content, so bad data fails the build. The travels page draws its globe and map with d3-geo and MapLibre GL. Vercel hosts the site.

## Run it locally

```sh
npm ci
npm run dev
```

`npm run build` builds the static site.
