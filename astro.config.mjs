// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://juanesquivel.xyz',
  trailingSlash: 'never',
  integrations: [sitemap({
    filter: (page) => !['/resume', '/404'].includes(new URL(page).pathname.replace(/\/$/, '')),
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: new Date(),
  }), react()],
});