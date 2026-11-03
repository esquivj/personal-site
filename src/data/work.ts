import { z } from 'astro/zod';
import { workCaseSchema, workCasesSchema } from './schemas.mjs';

export type WorkCase = z.infer<typeof workCaseSchema>;

export const workCases: WorkCase[] = workCasesSchema.parse([
  {
    slug: 'compound', title: 'Compound Foundation',
    summary: 'Product launches, partner co-marketing, and growth stories.',
    company: 'Compound Foundation', role: 'Founding Social & Community Lead',
    image: { src: '/work/compound/institutional-market-cover.jpg', alt: 'Artwork from the Compound Institutional Market launch.' },
    intro: 'As the foundation’s first dedicated social hire, I managed X and LinkedIn across product launches, ecosystem partnerships, and governance. Our own channels were small, so partner co-marketing became a central part of the approach.',
    sections: [
      {
        title: 'The Institutional Market launch',
        text: 'I owned the social launch sequence and partner coordination: partner-specific copy, publishing dates, direct outreach, and amplification.',
        evidence: [{
          src: '/work/compound/institutional-market-launch.png',
          alt: 'Compound Foundation post announcing the September 8 Institutional Market launch.',
          width: 776, height: 794,
          href: 'https://x.com/Compound_xyz/status/2093022559017349460',
          linkLabel: 'Read the launch post',
        }],
      },
      {
        title: 'Partner Spotlight',
        text: 'I developed and ran a co-marketing series with Kiln, DeFi Saver, Chainlink, and Sky. The series earned 2.9× the median X views of other posts published during the same period. That comparison uses cumulative views; it does not isolate the effect of partner amplification.',
        evidence: [
          {
            src: '/work/compound/sky-spotlight.png',
            alt: 'Sky Partner Spotlight: From DAI to USDS, highlighting the longstanding Compound integration.',
            width: 776, height: 731,
            href: 'https://x.com/Compound_xyz/status/2075260694069690813',
            linkLabel: 'Read the Sky Spotlight',
          },
          {
            src: '/work/compound/chainlink-spotlight.png',
            alt: 'Chainlink Partner Spotlight: Price Integrity, Value Recapture.',
            width: 776, height: 705,
            href: 'https://x.com/Compound_xyz/status/2082499430373372231',
            linkLabel: 'Read the Chainlink Spotlight',
          },
        ],
      },
      {
        title: 'Making traction visible',
        text: 'There wasn’t a centralized view of Institutional Market traction. I built a Dune dashboard with Claude and worked with the team to establish the metrics we wanted to show: deposits and collateral supplied, rather than TVL. Growth stories gave BD proof to use in allocator conversations as the combined total reached $60M.',
        evidence: [{
          src: '/work/compound/institutional-market-dashboard.png',
          alt: 'Compound Institutional Market dashboard by cadena on Dune, tracking deposits, loans, utilization, rates, and deposits plus collateral.',
          caption: 'Dashboard snapshot; figures change as the market updates.',
          width: 1817, height: 1225,
          href: 'https://dune.com/cadena/compound-institutional-market',
          linkLabel: 'Explore the Dune dashboard',
        }],
      },
      { title: 'AI & agentic workflows', text: 'I also built a shared social analytics workflow with Claude, Hermes, and MCP to compare posts, track partner amplification, and produce weekly reports.' },
    ],
  },
  {
    slug: 'forse', title: 'Forse', summary: 'Building the brand, launching it, and finding the right buyer.',
    company: 'StableLab', role: 'Head of Marketing',
    image: { src: '/work/forse-rebrand-hero.png', alt: 'Forse: The Intelligence Layer Fueling Web3 Growth' },
    intro: 'I led Forse’s naming, brand, and launch as StableLab expanded into analytics products. When the buyers turned out to be foundations and protocol teams, we changed the positioning and how the product presented itself.',
    sections: [
      { title: 'A different buyer', text: 'The early positioning spoke to DAOs and their communities. We shifted toward growth intelligence for foundations and core protocol teams: the people making decisions about incentives and growth programs.' },
      { title: 'My part', text: 'I owned positioning, messaging, website structure and copy, and sales materials. I directed the visual refresh and worked with product and design through reviews and launch.' },
    ],
    gallery: [
      { src: '/work/forse-landing-hero.avif', alt: 'Forse landing page', caption: 'Website structure and messaging' },
      { src: '/work/forse-workshop.png', alt: 'Forse brand workshop', caption: 'Naming and brand workshop' },
      { src: '/work/forse-brand-architecture.png', alt: 'Forse brand architecture', caption: 'Brand architecture' },
      { src: '/work/forse-insights.jpg', alt: 'Forse Insights sales one-pager', caption: 'Sales materials' },
    ],
    links: [{ label: 'Read the relaunch', href: 'https://stablelab.xyz/blog/reintroducing-forse-the-intelligence-layer-fueling-web3-growth' }],
  },
  {
    slug: 'governance-lab', title: 'Governance Lab', summary: 'A newsletter following governance across the crypto ecosystem.',
    company: 'StableLab', role: 'Editorial direction, writing & distribution',
    image: { src: '/work/governance-lab-cover.jpg', alt: 'Governance Lab newsletter cover' },
    intro: 'I built Governance Lab from zero as a recurring resource for people following governance across the crypto ecosystem.',
    sections: [
      { title: 'The work', text: 'I handled editorial direction, writing, curation, and distribution. The newsletter also gave StableLab a regular place to share research, announcements, and product launches.' },
      { title: 'The result', text: '121 issues, 920+ subscribers, and a 38% average open rate.' },
    ],
    links: [{ label: 'Read Governance Lab', href: 'https://stablelab.substack.com' }],
  },
  {
    slug: 'stablepod', title: 'StablePod', summary: 'Conversations with the people building crypto protocols.',
    company: 'StableLab', role: 'Producer & co-host',
    image: { src: '/work/stablepod-cover.jpg', alt: 'StablePod podcast cover' }, imageStyle: 'contain',
    intro: 'I produced and co-hosted 29 episodes of StablePod, a podcast covering crypto protocols and governance with founders and industry leaders.',
    sections: [
      { title: 'The work', text: 'I handled guest coordination, episode planning, production, and promotion. Guests included teams from Morpho, Euler, Gnosis, and the Uniswap Foundation.' },
      { title: 'Why it mattered', text: 'The series gave guests another channel to share their work and launches. It helped the wider industry learn about their projects while deepening partner relationships and supporting business development.' },
    ],
    links: [{ label: 'Explore the episodes', href: 'https://stablepod.vercel.app' }, { label: 'Listen on Spotify', href: 'https://open.spotify.com/show/4LZVPrxKohIaLjgvQRbVwI' }],
  },
  {
    slug: 'governance-gathering', title: 'Governance Gathering', summary: 'Bringing partners and prospective clients together at EthCC Brussels.',
    company: 'StableLab', role: 'Event lead',
    image: { src: '/work/agg/event-4.jpg', alt: 'Guests at Governance Gathering in Brussels' },
    intro: 'Governance Gathering was a sales and business development event during EthCC Brussels. It brought industry partners and prospective clients into one venue to deepen relationships and find opportunities.',
    sections: [{ title: 'My part', text: 'I led the event, secured co-sponsors, and managed event delivery. The aim was to spend time with people we worked with and meet the teams we wanted to work with.' }],
    gallery: [{ src: '/work/agg/event-5.jpg', alt: 'Governance Gathering event', caption: 'EthCC Brussels' }, { src: '/work/agg/event-6.jpg', alt: 'Conversations at Governance Gathering', caption: 'Partners and guests' }],
    links: [{ label: 'View the event', href: 'https://lu.ma/l5tvcrcb' }],
  },
]);
