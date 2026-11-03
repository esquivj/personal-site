# My portfolio

I'm Juan Esquivel. I built juanesquivel.xyz as my portfolio site. It covers my work and writing, with pages for projects and speaking. I also share my travels and what I'm doing on my Now page.

[Visit the site](PERSONAL_SITE_URL)

![Screenshot of the site](docs/screenshot.png)
<!-- screenshot: add docs/screenshot.png -->

## How I built it

I directed Claude and Codex to build the site with Astro. Their `Co-authored-by` trailers in the git history document their contributions.

The site uses React islands and TypeScript. Zod schemas in `src/data/schemas.mjs` validate structured content. Vercel hosts the site.

## Run it locally

Install dependencies and start the dev server:

```sh
npm ci
npm run dev
```

Build the site:

```sh
npm run build
```
