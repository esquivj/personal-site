export interface WritingPost {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  publishedTime: string;
  cover: string;
  readingTime?: string;
}

export const writingPosts: WritingPost[] = [
  {
    slug: 'owning-stock-onchain',
    title: "What does 'owning stock' mean onchain?",
    subtitle: "They're all called tokenized stocks and they're not the same thing",
    date: '2026.03.15',
    publishedTime: '2026-03-15',
    cover: '/images/tokenized-stocks-cover.jpg',
  },
  {
    slug: 'institutional-grade',
    title: "'Institutional Grade' Is a Category Vibe",
    subtitle: 'On positioning, borrowed language, and the translation problem',
    date: '2026.03.05',
    publishedTime: '2026-03-05',
    cover: '/images/institutional-grade-cover.jpg',
  },
  {
    slug: 'where-tokenization-actually-stands',
    title: 'Where tokenization actually stands',
    subtitle:
      "A primer on what's actually happening across tokenized treasuries, funds, private credit, and equities",
    date: '2026.03.02',
    publishedTime: '2026-03-02',
    cover: '/images/tokenization-cover.jpg',
  },
  {
    slug: 'building-way-in',
    title: 'A Story About Building Your Way In',
    subtitle: 'I had no network, no connections, and no clear path in.',
    date: '2026.01.31',
    publishedTime: '2026-01-31',
    cover: '/images/building-way-in-cover.jpg',
  },
  {
    slug: 'crypto-native',
    title: "Crypto-native isn't everything. But it's still something.",
    subtitle: 'Why being native to this industry still matters as its adoption accelerates',
    date: '2026.01.27',
    publishedTime: '2026-01-27',
    readingTime: 'RT: 3 MIN',
    cover: '/images/crypto-native-cover.jpg',
  },
  {
    slug: 'stablepod-lessons',
    title: 'The best crypto founders and leaders do this on podcasts',
    subtitle: 'What I learned from interviewing nearly 30 guests on StablePod',
    date: '2026.01.22',
    publishedTime: '2026-01-22',
    readingTime: 'RT: 5 MIN',
    cover: '/images/podcast-tips-cover.jpg',
  },
];

export const postsNewestFirst = [...writingPosts].sort((a, b) =>
  b.publishedTime.localeCompare(a.publishedTime)
);

export const writingPostBySlug = Object.fromEntries(
  writingPosts.map((post) => [post.slug, post])
) as Record<string, WritingPost>;
