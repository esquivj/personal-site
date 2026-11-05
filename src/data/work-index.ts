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
    accent: '#1f5c3a',
    cover: { src: '/work/compound/institutional-market-cover.jpg', alt: 'Artwork from the Compound Institutional Market launch' },
    intro:
      'Compound is one of crypto’s original lending protocols, where anyone can lend and borrow without a bank. As the foundation’s first dedicated social hire, I ran X and LinkedIn through product launches, partnerships, and governance votes.',
    figures: [
      { value: '$60M', label: 'In deposits and collateral on the new Institutional Market' },
      { value: '2.9×', label: 'the median X views, for Partner Spotlight' },
    ],
    phases: [
      {
        title: 'Highlights',
        items: [
          {
            title: 'Institutional Market Launch',
            text: 'Owned the social launch of Compound’s market built for institutions, plus the partner co-marketing around it.',
            image: '/work/compound/institutional-market-launch.png',
            href: '/work/compound#institutional-market',
          },
          {
            title: 'Partner Spotlight',
            text: 'A co-marketing series with longtime partners Kiln, DeFi Saver, Chainlink, and Sky.',
            result: '2.9× median views',
            image: '/work/compound/sky-spotlight.png',
            href: '/work/compound#partner-spotlight',
          },
          {
            title: 'Making Traction Visible',
            text: 'Built a live Dune dashboard with Claude, then turned the numbers into growth stories for business development.',
            result: '$60M milestone',
            image: '/work/compound/institutional-market-dashboard.png',
            href: '/work/compound#traction',
          },
          {
            title: 'AI & Agentic Workflows',
            text: 'An AI workflow with Claude, Hermes, and MCP that measured post performance and wrote weekly reports.',
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
    summary: 'Built marketing from zero at a company that worked with 40+ crypto protocols, then took its data product to market.',
    stat: { value: '40+', label: 'Crypto protocols' },
    cover: { src: '/work/partners.jpg', alt: 'The StableLab logo surrounded by partner logos, including Uniswap, Aave, Arbitrum, Lido, and Sky' },
    intro:
      'StableLab worked with 40+ crypto protocols, including Uniswap, Aave, and Arbitrum, on governance, the way these networks make decisions. It later built Forse, a data product for crypto growth teams.',
    figures: [],
    phases: [
      {
        title: 'Services Era',
        text: 'The job was to make StableLab the name protocols knew and trusted, so sales conversations started warm.',
        items: [
          {
            title: 'StablePod',
            text: 'A podcast with founders and leaders from Morpho, Euler, Gnosis, and the Uniswap Foundation.',
            result: '29 episodes',
            image: '/work/stablepod-cover.jpg',
            href: '/work/stablelab#stablepod',
          },
          {
            title: 'Governance Lab',
            text: 'A go-to newsletter on how crypto networks make decisions.',
            result: '121 issues · 920+ subscribers · 38% open rate',
            image: '/work/governance-lab-cover.jpg',
            href: '/work/stablelab#governance-lab',
          },
          {
            title: 'Proposal Amplification',
            text: 'Campaigns to get our funding proposals voted through by protocol communities. Passed proposals meant renewed contracts.',
            result: '50+ proposals',
            image: '/work/proposals/unichain.jpg',
            href: '/work/stablelab#proposal-amplification',
          },
          {
            title: 'Governance Gathering',
            text: 'A side event at EthCC, Europe’s biggest Ethereum conference, co-hosted with UMA, Wormhole, and Tally.',
            result: '150+ attendees',
            image: '/work/agg/event-4.jpg',
            href: '/work/stablelab#governance-gathering',
          },
        ],
      },
      {
        title: 'GTM for a Data Product',
        text: 'Launching Forse, StableLab’s analytics product for crypto growth programs, then repositioning it for the buyers who actually had budget.',
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
            text: 'From analytics for crypto communities to growth intelligence for the teams behind the protocols.',
            result: 'Communities → core teams',
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
