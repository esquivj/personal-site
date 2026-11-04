// The /work index: one expandable row per employer. Case pages live in ./work.ts.

import { z } from 'astro/zod';
import { workEmployerSchema, workEmployersSchema } from './schemas.mjs';

export type WorkEmployer = z.infer<typeof workEmployerSchema>;

export const workEmployers: WorkEmployer[] = workEmployersSchema.parse([
  {
    id: 'compound',
    name: 'Compound Foundation',
    role: 'Founding Social & Community Lead',
    years: 'May-Oct 2026',
    summary: 'First social hire. Launches, partner co-marketing, governance, and the reporting that showed what worked.',
    stat: { value: '$60M', label: 'Institutional Market' },
    cover: { src: '/work/compound/institutional-market-cover.jpg', alt: 'Artwork from the Compound Institutional Market launch' },
    intro:
      'Compound is one of DeFi’s original lending protocols. As the foundation’s first dedicated social hire, I ran X and LinkedIn through product launches, partnerships, and governance.',
    figures: [
      { value: '$60M', label: 'Institutional Market deposits and collateral' },
      { value: '2.9×', label: 'the median X views, for Partner Spotlight' },
    ],
    phases: [
      {
        title: 'Highlights',
        items: [
          {
            title: 'Institutional Market Launch',
            text: 'Owned the social launch and the partner co-marketing around it.',
            image: '/work/compound/institutional-market-launch.png',
            href: '/work/compound#institutional-market',
          },
          {
            title: 'Partner Spotlight',
            text: 'A co-marketing series with Kiln, DeFi Saver, Chainlink, and Sky.',
            result: '2.9× median views',
            image: '/work/compound/sky-spotlight.png',
            href: '/work/compound#partner-spotlight',
          },
          {
            title: 'Making Traction Visible',
            text: 'Built a Dune dashboard with Claude, then turned the numbers into growth stories for BD.',
            result: '$60M milestone',
            image: '/work/compound/institutional-market-dashboard.png',
            href: '/work/compound#traction',
          },
          {
            title: 'AI & Agentic Workflows',
            text: 'A shared workflow with Claude, Hermes, and MCP for post performance and weekly reports.',
            image: '/work/compound/social-analytics-workflow.png',
            href: '/work/compound#ai-workflows',
          },
        ],
      },
    ],
    cta: { label: 'Read the Compound case', href: '/work/compound' },
  },
  {
    id: 'stablelab',
    name: 'StableLab',
    role: 'Head of Marketing',
    years: '2023-2026',
    summary: 'Built the marketing function from zero, first for governance services, then for a data product.',
    stat: { value: '40+', label: 'Protocol partners' },
    cover: { src: '/work/partners.jpg', alt: 'The StableLab logo surrounded by partner logos, including Uniswap, Aave, Arbitrum, Lido, and Sky' },
    intro:
      'StableLab was a governance and data infrastructure company that worked with 40+ protocols, including Uniswap, Aave, and Arbitrum.',
    figures: [],
    phases: [
      {
        title: 'Services Era',
        text: 'The job was to make StableLab known and trusted, so BD conversations started warm.',
        items: [
          {
            title: 'StablePod',
            text: 'A podcast with builders from Morpho, Euler, Gnosis, and the Uniswap Foundation.',
            result: '29 episodes',
            image: '/work/stablepod-cover.jpg',
            href: '/work/stablelab#stablepod',
          },
          {
            title: 'Governance Lab',
            text: 'A newsletter on governance across crypto.',
            result: '121 issues · 920+ subscribers · 38% open rate',
            image: '/work/governance-lab-cover.jpg',
            href: '/work/stablelab#governance-lab',
          },
          {
            title: 'Proposal Amplification',
            text: 'Comms for every governance proposal we submitted. Passed proposals meant renewed contracts.',
            result: '50+ proposals',
            image: '/work/proposals/unichain.jpg',
            href: '/work/stablelab#proposal-amplification',
          },
          {
            title: 'Governance Gathering',
            text: 'A side event at EthCC Brussels, co-hosted with UMA, Wormhole, and Tally.',
            result: '150+ attendees',
            image: '/work/agg/event-4.jpg',
            href: '/work/stablelab#governance-gathering',
          },
        ],
      },
      {
        title: 'GTM for a Data Product',
        text: 'Launching Forse, StableLab’s analytics product, then repositioning it when the buyer turned out to be foundations, not DAOs.',
        items: [
          {
            title: 'Forse Launch',
            text: 'Naming, visual identity, and the launch campaign.',
            result: 'Name to launch',
            image: '/work/forse-launch-hero.webp',
            href: '/work/stablelab#forse-launch',
          },
          {
            title: 'Repositioning',
            text: 'From DAO analytics to growth intelligence for foundations and protocol teams.',
            result: 'DAOs → foundations',
            image: '/work/forse-landing-hero.webp',
            href: '/work/stablelab#forse-repositioning',
          },
          {
            title: 'Sales Materials',
            text: 'One-pagers that became the primary collateral in every pitch.',
            image: '/work/forse-insights.jpg',
            href: '/work/stablelab#forse-sales',
          },
        ],
      },
    ],
    cta: { label: 'Read the StableLab case', href: '/work/stablelab' },
  },
]);
