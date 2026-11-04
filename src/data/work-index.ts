// The /work index: one expandable row per employer. Case pages live in ./work.ts.

export type WorkHighlight = {
  title: string;
  text: string;
  result?: string;
  image: string;
  href?: string;
};

export type WorkPhase = {
  title: string;
  text?: string;
  items: WorkHighlight[];
};

export type WorkEmployer = {
  id: string;
  name: string;
  role: string;
  years: string;
  summary: string;
  stat: { value: string; label: string };
  intro: string;
  figures: { value: string; label: string }[];
  phases: WorkPhase[];
  cta?: { label: string; href: string };
};

export const workEmployers: WorkEmployer[] = [
  {
    id: 'compound',
    name: 'Compound Foundation',
    role: 'Founding Social & Community Lead',
    years: 'May-Oct 2026',
    summary: 'Product launches, partner co-marketing, and growth stories for the Institutional Market.',
    stat: { value: '$60M', label: 'Market milestone' },
    intro:
      'Compound is one of DeFi’s original lending protocols. As the foundation’s first dedicated social hire, I managed X and LinkedIn across product launches, ecosystem partnerships, and governance.',
    figures: [
      { value: '$60M', label: 'Institutional Market deposits and collateral' },
      { value: '2.9×', label: 'Median X views for Partner Spotlight' },
    ],
    phases: [
      {
        title: 'Highlights',
        items: [
          {
            title: 'Institutional Market Launch',
            text: 'Owned the social launch sequence and partner co-marketing.',
            image: '/work/compound/institutional-market-launch.png',
            href: '/work/compound',
          },
          {
            title: 'Partner Spotlight',
            text: 'A co-marketing series with Kiln, DeFi Saver, Chainlink, and Sky.',
            result: '2.9× median views',
            image: '/work/compound/sky-spotlight.png',
            href: '/work/compound',
          },
          {
            title: 'Making Traction Visible',
            text: 'A Dune dashboard built with Claude, turned into growth stories for BD.',
            result: '$60M milestone',
            image: '/work/compound/institutional-market-dashboard.png',
            href: '/work/compound',
          },
          {
            title: 'AI & Agentic Workflows',
            text: 'A shared social analytics workflow with Claude, Hermes, and MCP.',
            image: '/work/compound/social-analytics-workflow.png',
            href: '/work/compound',
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
    intro:
      'StableLab is a governance and data infrastructure company serving 40+ protocol partners, including Uniswap, Aave, and Arbitrum. I built its marketing function from zero.',
    figures: [],
    phases: [
      {
        title: 'Services Era',
        text: 'Making StableLab credible enough that business development conversations didn’t start from zero.',
        items: [
          {
            title: 'StablePod',
            text: 'Conversations with the people building crypto protocols.',
            result: '29 episodes',
            image: '/work/stablepod-cover.jpg',
            href: '/work/stablepod',
          },
          {
            title: 'Governance Lab',
            text: 'A newsletter following governance across the crypto ecosystem.',
            result: '121 issues · 38% open rate',
            image: '/work/governance-lab-cover.jpg',
            href: '/work/governance-lab',
          },
          {
            title: 'Proposal Amplification',
            text: 'Comms for every governance proposal the team submitted. Approvals kept contracts running.',
            result: '50+ proposals',
            image: '/work/proposals/unichain.jpg',
          },
          {
            title: 'Governance Gathering',
            text: 'A side event at EthCC Brussels, co-hosted with UMA, Wormhole, and Tally.',
            result: '150+ attendees',
            image: '/work/agg/event-4.jpg',
            href: '/work/governance-gathering',
          },
        ],
      },
      {
        title: 'GTM for a Data Product',
        text: 'Taking Forse, StableLab’s analytics product, to market, then repositioning it for the right buyer.',
        items: [
          {
            title: 'Forse Launch',
            text: 'Naming, visual identity, and the launch campaign.',
            result: 'From zero to launch',
            image: '/work/forse-launch-hero.webp',
            href: '/work/forse',
          },
          {
            title: 'Repositioning',
            text: 'From DAO analytics to growth intelligence for foundations and protocol teams.',
            result: 'New buyer, one brand',
            image: '/work/forse-landing-hero.webp',
            href: '/work/forse',
          },
          {
            title: 'Sales Materials',
            text: 'One-pagers that became the primary collateral in every pitch.',
            image: '/work/forse-insights.jpg',
            href: '/work/forse',
          },
        ],
      },
    ],
  },
];
