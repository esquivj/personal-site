# Juan Esquivel’s personal site

The site presents Juan’s work, projects, and writing. Astro builds the site with TypeScript and React. Zod validates structured content in `src/data/`.

Run `npm ci` to install dependencies. Run `npm run dev` to start development and `npm run preview` to inspect a production build.

Run `npm run typecheck`, `npm test`, and `npm run build` to validate changes. Run `node scripts/check-internal-links.mjs` after the build to check local links.

Vercel hosts the site. Juan approves production deployments. Agents work on branches and leave deployment approval to Juan.

Run `node scripts/optimize-images.mjs` to optimize portfolio images and generate avatar formats. Run `node scripts/generate-og.mjs` to regenerate the share image.

Run `node scripts/download-work-thumbnails.mjs` to refresh the StableLab blog thumbnails in `public/work/stablelab/`.
