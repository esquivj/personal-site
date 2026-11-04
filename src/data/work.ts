import { z } from 'astro/zod';
import { workCaseSchema, workCasesSchema } from './schemas.mjs';

export type WorkCase = z.infer<typeof workCaseSchema>;

export const workCases: WorkCase[] = workCasesSchema.parse([
  {
    slug: 'compound', title: 'Compound Foundation',
    summary: 'Product launches, partner co-marketing, and growth stories.',
    company: 'Compound Foundation', role: 'Founding Social & Community Lead',
    image: { src: '/work/compound/institutional-market-cover.jpg', alt: 'Artwork from the Compound Institutional Market launch.' },
    intro: 'Compound is one of DeFi’s original lending protocols. As the foundation’s first dedicated social hire, I managed X and LinkedIn across product launches, ecosystem partnerships, and governance. Partner co-marketing was a core part of the strategy, helping us reach relevant audiences through Compound’s existing relationships.',
    sections: [
      {
        title: 'Introducing Compound’s Institutional Strategy',
        text: 'Compound announced a new leadership team and a $52M DAO-approved development program to build lending infrastructure for financial institutions. The roadmap included Compound v4, improvements to v3, and institutional integrations. Our Head of Marketing led the announcement campaign; I contributed social copy and helped with campaign execution. The lead X post reached 156.6K views.',
        evidence: [{
          src: '/work/compound/52m-announcement.png',
          alt: 'Compound’s new leadership and $52M development program announcement, showing 156.6K views on X.',
          width: 776, height: 705,
          href: 'https://x.com/Compound_xyz/status/2089386082441871388',
          linkLabel: 'Read the announcement',
        }],
      },
      {
        title: 'The Institutional Market Launch',
        text: 'The Institutional Market introduced a USDC lending market with collateral requirements and risk parameters designed for institutional borrowers. I owned the social launch sequence and partner co-marketing: preparing partner-specific copy, coordinating publishing dates, managing direct outreach, and amplifying partner posts.',
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
        text: 'I developed and ran Partner Spotlight to show how longstanding integrations with Kiln, DeFi Saver, Chainlink, and Sky supported Compound’s markets. Partner amplification helped us reach beyond our own channels. The series earned 2.9× the median X views of other posts published during the same period, measured using cumulative views.',
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
        title: 'Making Traction Visible',
        text: 'There wasn’t a centralized view of Institutional Market traction. I built a Dune dashboard with Claude and worked with the team to establish the metrics we wanted to show: deposits and collateral supplied, rather than TVL. Growth stories gave BD proof to use in allocator conversations as the combined total reached $60M.',
        evidence: [{
          src: '/work/compound/institutional-market-dashboard.png',
          alt: 'Compound Institutional Market dashboard by cadena on Dune, tracking deposits, loans, utilization, rates, and deposits plus collateral.',
          caption: 'Dashboard snapshot; figures change as the market updates.',
          size: 'wide',
          width: 1817, height: 1225,
          href: 'https://dune.com/cadena/compound-institutional-market',
          linkLabel: 'Explore the Dune dashboard',
        }, {
          src: '/work/compound/60m-market-milestone.png',
          alt: 'Published Compound Institutional Market milestone: over $60M in total deposits and collateral supplied, with over $18M in outstanding USDC loans.',
          caption: 'The $60M milestone, turned into a public growth update.',
          width: 776, height: 705,
          href: 'https://x.com/Compound_xyz/status/2103517844831125686',
          linkLabel: 'Read the $60M milestone post',
        }],
      },
      {
        title: 'AI & Agentic Workflows',
        text: 'I built an AI-assisted workflow that pulled Compound v3 data from the protocol API, Dune, and DeFiLlama, surfaced potential stories, and filtered out misleading signals. I reviewed candidates with Claude and turned selected stories into social cards in Figma. Separately, I built a Claude/Hermes workflow with MCP to compare post performance, track partner amplification, and produce weekly reports.',
        evidence: [{
          src: '/work/compound/v3-story-workflow.png',
          alt: 'Compound v3 story workflow: scheduled data refreshes feed story detection and quality checks, followed by human review with Claude and social-card production in Figma.',
          caption: 'Compound v3 story discovery and publishing workflow.',
          size: 'wide',
          width: 1282, height: 855,
          href: '/work/compound/v3-story-workflow.png',
          linkLabel: 'View workflow full size',
        }, {
          src: '/work/compound/social-analytics-workflow.png',
          alt: 'Social analytics workflow: Claude delegates to Hermes, which queries X through MCP servers. Post comparisons, partner amplification receipts, and reports feed my review of what to repeat.',
          caption: 'Claude, Hermes, and MCP: measuring content performance and partner distribution.',
          size: 'wide',
          width: 2476, height: 2268,
          href: '/work/compound/social-analytics-workflow.png',
          linkLabel: 'View social analytics workflow full size',
        }],
      },
    ],
  },
  {
    slug: 'forse', title: 'Forse', summary: 'GTM for StableLab’s data product: naming, brand, launch, and repositioning.',
    company: 'StableLab', role: 'Head of Marketing',
    image: { src: '/work/forse-rebrand-hero.png', alt: 'Forse: The Intelligence Layer Fueling Web3 Growth' },
    intro: 'Forse was StableLab’s analytics product for tracking protocol incentives and growth programs. I led its naming, brand, and launch as the company expanded beyond governance services. When the buyers turned out to be foundations and protocol teams, we changed the positioning and how the product presented itself.',
    sections: [
      { title: 'A Different Buyer', text: 'The early positioning spoke to DAOs and their communities. We shifted toward growth intelligence for foundations and core protocol teams: the people making decisions about incentives and growth programs.' },
      { title: 'My Part', text: 'I owned positioning, messaging, website structure and copy, and sales materials. I directed the visual refresh and worked with product and design through reviews and launch.' },
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
    company: 'StableLab', role: 'Editorial Direction, Writing & Distribution',
    image: { src: '/work/governance-lab-cover.jpg', alt: 'Governance Lab newsletter cover' },
    intro: 'I built Governance Lab, StableLab’s newsletter, from zero as a recurring resource covering governance across the crypto ecosystem.',
    sections: [
      { title: 'The Work', text: 'I handled editorial direction, writing, curation, and distribution. The newsletter also gave StableLab a regular place to share research, announcements, and product launches.' },
      { title: 'The Result', text: '121 issues, 920+ subscribers, and a 38% average open rate.' },
    ],
    links: [{ label: 'Read Governance Lab', href: 'https://stablelab.substack.com' }],
  },
  {
    slug: 'stablepod', title: 'StablePod', summary: 'Conversations with the people building crypto protocols.',
    company: 'StableLab', role: 'Producer & Co-Host',
    image: { src: '/work/stablepod-cover.jpg', alt: 'StablePod podcast cover' }, imageStyle: 'contain',
    intro: 'I produced and co-hosted 29 episodes of StablePod, a podcast covering crypto protocols and governance with founders and industry leaders.',
    sections: [
      { title: 'The Work', text: 'I handled guest coordination, episode planning, production, and promotion. Guests included teams from Morpho, Euler, Gnosis, and the Uniswap Foundation.' },
      { title: 'Why It Mattered', text: 'The series gave guests another channel to share their work and launches. It helped the wider industry learn about their projects while deepening partner relationships and supporting business development.' },
    ],
    links: [{ label: 'Explore the episodes', href: 'https://stablepod.vercel.app' }, { label: 'Listen on Spotify', href: 'https://open.spotify.com/show/4LZVPrxKohIaLjgvQRbVwI' }],
  },
  {
    slug: 'governance-gathering', title: 'Governance Gathering', summary: 'A side event at EthCC Brussels with 150+ attendees.',
    company: 'StableLab', role: 'Event Lead',
    image: { src: '/work/agg/event-4.jpg', alt: 'Guests at Governance Gathering in Brussels' },
    intro: 'Governance Gathering was a sales and business development event during EthCC Brussels, co-hosted with UMA, Wormhole, and Tally. It brought 150+ industry partners and prospective clients into one venue to deepen relationships and find opportunities.',
    sections: [{ title: 'My Part', text: 'I led the event, secured co-sponsors, and managed event delivery, bringing industry partners and prospective clients together for business development conversations.' }],
    gallery: [{ src: '/work/agg/event-5.jpg', alt: 'Governance Gathering event', caption: 'EthCC Brussels' }, { src: '/work/agg/event-6.jpg', alt: 'Conversations at Governance Gathering', caption: 'Partners and guests' }],
    links: [{ label: 'View the event', href: 'https://lu.ma/l5tvcrcb' }],
  },
]);
