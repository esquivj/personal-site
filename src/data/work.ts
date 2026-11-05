import { z } from 'astro/zod';
import { workCaseSchema, workCasesSchema } from './schemas.mjs';

export type WorkCase = z.infer<typeof workCaseSchema>;

export const workCases: WorkCase[] = workCasesSchema.parse([
  {
    slug: 'compound', title: 'Compound Foundation', accent: '#1f5c3a',
    summary: 'First social hire. Launches, partner co-marketing, governance, and the reporting that showed what worked.',
    company: 'Compound Foundation', role: 'Founding Social & Community Lead',
    image: { src: '/work/compound/institutional-market-cover.jpg', alt: 'Artwork from the Compound Institutional Market launch.' },
    intro: 'Compound is one of crypto’s original lending protocols, where anyone can lend and borrow without a bank. As the foundation’s first dedicated social hire, I ran X and LinkedIn through product launches, partnerships, and governance votes. Partner co-marketing was a core part of the strategy, helping us reach relevant audiences through Compound’s existing relationships.',
    sections: [
      {
        title: 'Introducing Compound’s Institutional Strategy',
        text: 'Compound announced a new leadership team and a $52M development program approved by Compound’s token holders to build lending infrastructure for financial institutions. The roadmap included Compound v4, improvements to v3, and institutional integrations. Our Head of Marketing led the announcement campaign; I contributed social copy and helped with campaign execution. The lead X post reached 156.6K views.',
        evidence: [{
          src: '/work/compound/52m-announcement.png',
          alt: 'Compound’s new leadership and $52M development program announcement, showing 156.6K views on X.',
          width: 776, height: 705,
          href: 'https://x.com/Compound_xyz/status/2089386082441871388',
          linkLabel: 'Read the announcement',
        }],
      },
      {
        id: 'institutional-market', title: 'The Institutional Market Launch',
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
        id: 'partner-spotlight', title: 'Partner Spotlight',
        text: 'I developed and ran Partner Spotlight to show how longtime partners Kiln, DeFi Saver, Chainlink, and Sky built on and supported Compound’s markets. Partner amplification helped us reach beyond our own channels. The series earned 2.9× the median X views of other posts published during the same period, measured using cumulative views.',
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
        id: 'traction', title: 'Making Traction Visible',
        text: 'There wasn’t a centralized view of Institutional Market traction. I built a Dune dashboard with Claude and worked with the team to establish the metrics we wanted to show: deposits and collateral supplied, rather than TVL, the usual headline number. Growth stories gave business development proof to use with institutional capital allocators as the combined total reached $60M.',
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
        id: 'ai-workflows', title: 'AI & Agentic Workflows',
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
    slug: 'stablelab', title: 'StableLab',
    summary: 'Built marketing from zero at a company that worked with 40+ crypto protocols, then took its data product to market.',
    company: 'StableLab', role: 'Head of Marketing',
    image: { src: '/work/partners.jpg', alt: 'The StableLab logo surrounded by partner logos, including Uniswap, Aave, Arbitrum, Lido, and Sky.' },
    intro: 'StableLab worked with 40+ crypto protocols, including Uniswap, Aave, and Arbitrum, on governance, the way these networks make decisions. As Head of Marketing, I built the marketing function from zero. In the services era, the job was to make StableLab the name protocols knew and trusted, so sales conversations started warm. Later, I took Forse, the company’s data product, to market.',
    sections: [
      {
        id: 'stablepod', kicker: 'Services Era', title: 'StablePod',
        text: 'I produced and co-hosted 29 episodes of StablePod, a podcast on crypto protocols and governance. I handled guest coordination, episode planning, production, and promotion. Guests came from Morpho, Euler, Gnosis, the Uniswap Foundation, Optimism, dYdX, and Ethena, some of the biggest names in decentralized finance. The show gave partners another channel for their launches, and one guest conversation turned into an active business discussion.',
        evidence: [{
          src: '/work/stablepod-cover.jpg',
          alt: 'StablePod podcast cover.',
          width: 600, height: 600,
          href: 'https://stablepod.vercel.app',
          linkLabel: 'Explore the episodes',
        }],
      },
      {
        id: 'governance-lab', title: 'Governance Lab',
        text: 'I built Governance Lab, StableLab’s newsletter on how crypto networks make decisions, from zero. I handled editorial direction, writing, curation, and distribution, and it doubled as our channel for research, announcements, and product launches. It became a go-to read for people tracking crypto governance: 121 issues, 920+ subscribers, and a 38% average open rate, about twice the industry average.',
        evidence: [{
          src: '/work/governance-lab-cover.jpg',
          alt: 'Governance Lab newsletter cover.',
          size: 'wide',
          width: 1280, height: 640,
          href: 'https://stablelab.substack.com',
          linkLabel: 'Read Governance Lab',
        }],
      },
      {
        id: 'proposal-amplification', title: 'Proposal Amplification',
        text: 'Our own governance proposals asked protocol communities to fund StableLab initiatives, and each community had its own dynamics. I built a campaign for every proposal, from forum post to temperature check, onchain vote, and outcome. We amplified 50+ of them. Passed proposals meant renewed contracts, so this work directly supported revenue.',
        evidence: [
          { src: '/work/proposals/unichain.jpg', alt: 'StableLab governance proposal graphic for Unichain.', width: 800, height: 400 },
          { src: '/work/proposals/gnosis.jpg', alt: 'StableLab governance proposal graphic for Gnosis.', width: 800, height: 400 },
          { src: '/work/proposals/scroll.jpg', alt: 'StableLab governance proposal graphic for Scroll.', width: 800, height: 400 },
          { src: '/work/proposals/compound.jpg', alt: 'StableLab governance proposal graphic for Compound.', width: 800, height: 400 },
        ],
      },
      {
        id: 'governance-gathering', title: 'Governance Gathering',
        text: 'I led Governance Gathering, a business development side event at EthCC Brussels, Europe’s biggest Ethereum conference, co-hosted with UMA, Wormhole, and Tally. I secured the co-sponsors and managed delivery. 258 people registered and 150+ attended, bringing partners and prospective clients into one room.',
        evidence: [
          { src: '/work/agg/event-5.jpg', alt: 'Guests at Governance Gathering during EthCC Brussels.', width: 800, height: 800, href: 'https://lu.ma/l5tvcrcb', linkLabel: 'View the event' },
          { src: '/work/agg/event-6.jpg', alt: 'Conversations at Governance Gathering.', width: 800, height: 800 },
        ],
      },
      {
        id: 'forse-launch', kicker: 'GTM for a Data Product', title: 'Launching Forse',
        text: 'Forse was StableLab’s analytics product for measuring whether crypto incentive and grant programs worked. It was our first product launch, with no brand or playbook to start from. I ran naming workshops with the CEO, Head of Product, and our designer, and we landed on Forse, inspired by forsker, the Danish word for researcher. I built the visual identity with our designer, framed the product as Built by StableLab to carry over the trust we had earned, and ran the launch across the website, blog, X, LinkedIn, and email. Going live before EthCC gave BD a reason to reach out.',
        evidence: [{
          src: '/work/forse-brand-system.jpg',
          alt: 'Forse launch brand board: name origin, color palette, wordmark, and the first product interface.',
          caption: 'The launch brand system: name, palette, wordmark, and product.',
          size: 'wide',
          width: 1920, height: 1080,
          href: 'https://stablelab.xyz/blog/introducing-forse-by-stablelab',
          linkLabel: 'Read the launch announcement',
        }, {
          src: '/work/forse-workshop.png',
          alt: 'Forse naming and brand workshop in FigJam, covering vision, audience, competition, and brand heart.',
          caption: 'Naming and brand workshop.',
          size: 'wide',
          width: 3024, height: 1686,
        }],
      },
      {
        id: 'forse-repositioning', title: 'Finding the Right Buyer',
        text: 'We first pitched Forse to DAOs, the communities that govern protocols, and it wasn’t landing. The buyers with budget were the foundations and core teams behind those protocols. We repositioned Forse from DAO analytics to the intelligence layer fueling web3 growth. I pushed to keep everything under one brand instead of launching a third, directed a modern, minimal visual refresh, and owned the messaging, website structure, and copy.',
        evidence: [{
          src: '/work/forse-landing-hero.webp',
          alt: 'Forse landing page: The Intelligence Layer Fueling Web3 Growth.',
          size: 'wide',
          width: 2992, height: 1680,
          href: 'https://stablelab.xyz/blog/reintroducing-forse-the-intelligence-layer-fueling-web3-growth',
          linkLabel: 'Read the relaunch',
        }],
      },
      {
        id: 'forse-sales', title: 'Arming Sales',
        text: 'Long B2B sales cycles meant every pitch needed targeted material. I wrote the copy for the Forse Insights one-pager and shaped the messaging for Grants Management and the Incentive Analyzer; product set the direction and our designer built them. They became the primary sales collateral. The positioning held up, but budgets shrank and sales cycles stretched past our runway.',
        evidence: [
          { src: '/work/forse-insights.jpg', alt: 'Forse Insights sales one-pager.', width: 800, height: 1351 },
          { src: '/work/forse-incentive.jpg', alt: 'Forse Incentive Analyzer sales one-pager.', width: 800, height: 1633 },
        ],
      },
    ],
    links: [
      { label: 'Explore StablePod', href: 'https://stablepod.vercel.app' },
      { label: 'Read Governance Lab', href: 'https://stablelab.substack.com' },
      { label: 'Read the Forse relaunch', href: 'https://stablelab.xyz/blog/reintroducing-forse-the-intelligence-layer-fueling-web3-growth' },
    ],
  },
]);
