import { z } from 'astro/zod';

const nonEmptyString = z.string().refine((value) => value.trim().length > 0, {
  message: 'Must not be empty or whitespace',
});
const nonnegativeInteger = z.number().int().nonnegative();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected ISO date (YYYY-MM-DD)')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Expected a valid calendar date');

// Public activity contains only daily totals, never raw agent records.
export const aiActivitySchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().datetime().nullable(),
  timeZone: z.literal('America/Los_Angeles'),
  collector: z.enum(['claude-count-tokens@1.2.0', 'local-usage-v2', 'merged-local-usage-v1']),
  days: z.array(z.object({
    date: isoDate,
    claude: nonnegativeInteger.max(Number.MAX_SAFE_INTEGER),
    codex: nonnegativeInteger.max(Number.MAX_SAFE_INTEGER),
  }).strict()).superRefine((days, context) => {
    const dates = new Set();
    days.forEach((day, index) => {
      if (dates.has(day.date)) context.addIssue({
        code: z.ZodIssueCode.custom, path: [index, 'date'], message: 'Duplicate activity date',
      });
      dates.add(day.date);
    });
  }),
}).strict().superRefine((data, context) => {
  if (!data.updatedAt && data.days.length) context.addIssue({
    code: z.ZodIssueCode.custom, path: ['updatedAt'], message: 'Activity requires a snapshot date',
  });
  const end = data.updatedAt && new Intl.DateTimeFormat('en-CA', {
    timeZone: data.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(data.updatedAt));
  if (end && data.days.some(day => day.date > end)) context.addIssue({
    code: z.ZodIssueCode.custom, path: ['days'], message: 'Activity cannot follow its snapshot date',
  });
});

// Private, portable device export. Never embed this ledger in the website.
const usageFingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const usageCount = nonnegativeInteger.max(Number.MAX_SAFE_INTEGER);
const codexUsageCounters = z.object({ input: usageCount, output: usageCount }).strict();
export const deviceActivitySchema = z.object({
  kind: z.literal('personal-site-device-usage'),
  version: z.literal(1),
  device: z.string().regex(/^[a-z0-9-]{1,40}$/),
  exportedAt: z.string().datetime(),
  timeZone: z.literal('America/Los_Angeles'),
  claude: z.array(z.object({
    id: usageFingerprint,
    date: isoDate,
    values: z.tuple([usageCount, usageCount, usageCount, usageCount]),
  }).strict()),
  codex: z.array(z.object({
    id: usageFingerprint,
    events: z.array(z.discriminatedUnion('type', [
      z.object({ type: z.literal('response'), id: usageFingerprint,
        timestamp: z.string().datetime(), usage: codexUsageCounters }).strict(),
      z.object({ type: z.literal('counter'), timestamp: z.string().datetime(),
        total: codexUsageCounters.nullable(), last: codexUsageCounters.nullable() }).strict(),
    ])),
    fallback: z.object({ timestamp: z.string().datetime(), tokens: usageCount }).strict().nullable(),
  }).strict()),
}).strict().superRefine((data, context) => {
  const end = new Intl.DateTimeFormat('en-CA', {
    timeZone: data.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(data.exportedAt));
  if (data.claude.some(record => record.date > end) || data.codex.some(thread =>
    thread.events.some(event => Date.parse(event.timestamp) > Date.parse(data.exportedAt)) ||
    (thread.fallback && Date.parse(thread.fallback.timestamp) > Date.parse(data.exportedAt))
  )) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Usage cannot follow its device export date' });
});

/**
 * Report duplicate slugs at the offending item rather than silently overwriting it.
 * @param {{ slug: string }[]} items
 * @param {import('astro/zod').RefinementCtx} context
 */
const uniqueSlugs = (items, context) => {
  const seen = new Set();
  items.forEach((item, index) => {
    if (seen.has(item.slug)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'slug'],
        message: `Duplicate slug: ${item.slug}`,
      });
    }
    seen.add(item.slug);
  });
};

export const travelStatsSchema = z.object({
  totalFlights: nonnegativeInteger,
  totalDistance: nonnegativeInteger,
  totalCountries: nonnegativeInteger,
  totalAirports: nonnegativeInteger,
  totalAirlines: nonnegativeInteger,
  totalAircraftTypes: nonnegativeInteger,
  firstFlight: isoDate,
  lastUpdated: isoDate,
  airports: z.array(z.string().regex(/^[A-Z]{3}$/, 'Expected a three-letter uppercase airport code')),
  landedAirports: z.array(z.string().regex(/^[A-Z]{3}$/)),
  countries: z.array(nonEmptyString),
  routes: z.array(z.object({
    from: z.string().regex(/^[A-Z]{3}$/),
    to: z.string().regex(/^[A-Z]{3}$/),
    count: z.number().int().positive(),
  })),
});

export const writingPostSchema = z.object({
  slug: nonEmptyString,
  title: nonEmptyString,
  subtitle: z.string(),
  date: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/, 'Expected date (YYYY.MM.DD)')
    .refine((value) => isoDate.safeParse(value.replaceAll('.', '-')).success,
      'Expected a valid calendar date'),
  publishedTime: isoDate,
  cover: nonEmptyString,
  readingTime: nonEmptyString.optional(),
});

export const writingPostsSchema = z.array(writingPostSchema).superRefine(uniqueSlugs);

export const projectsSchema = z.array(z.object({
  number: nonEmptyString,
  slug: nonEmptyString,
  kicker: nonEmptyString,
  title: nonEmptyString,
  line: nonEmptyString,
  description: nonEmptyString,
  facts: z.array(nonEmptyString),
  href: z.string().url().optional(),
  linkLabel: nonEmptyString.optional(),
  image: z.object({
    src: nonEmptyString,
    alt: nonEmptyString,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).optional(),
})).superRefine(uniqueSlugs);

const workImageSchema = z.object({
  src: nonEmptyString,
  alt: nonEmptyString,
  caption: nonEmptyString.optional(),
});
const workEvidenceSchema = workImageSchema.extend({
  size: z.enum(['standard', 'wide']).default('standard'),
  href: z.string().url().or(z.string().startsWith('/work/')).optional(),
  linkLabel: nonEmptyString.optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).refine(item => Boolean(item.href) === Boolean(item.linkLabel), {
  message: 'Evidence links require both a URL and a label.',
});
export const workCaseSchema = z.object({
  slug: nonEmptyString,
  title: nonEmptyString,
  summary: nonEmptyString,
  company: nonEmptyString,
  role: nonEmptyString,
  image: workImageSchema,
  imageStyle: z.enum(['cover', 'contain']).default('cover'),
  intro: nonEmptyString,
  sections: z.array(z.object({
    title: nonEmptyString,
    text: nonEmptyString,
    evidence: z.array(workEvidenceSchema).default([]),
  })).min(1),
  gallery: z.array(workImageSchema).default([]),
  links: z.array(z.object({ label: nonEmptyString, href: z.string().url() })).default([]),
});
export const workCasesSchema = z.array(workCaseSchema).superRefine(uniqueSlugs);

// The /work index: one expandable row per employer.
const workHighlightSchema = z.object({
  title: nonEmptyString,
  text: nonEmptyString,
  result: nonEmptyString.optional(),
  image: nonEmptyString,
  href: nonEmptyString.optional(),
});
export const workEmployerSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: nonEmptyString,
  role: nonEmptyString,
  years: nonEmptyString,
  summary: nonEmptyString,
  stat: z.object({ value: nonEmptyString, label: nonEmptyString }),
  cover: z.object({ src: nonEmptyString, alt: nonEmptyString }),
  intro: nonEmptyString,
  figures: z.array(z.object({ value: nonEmptyString, label: nonEmptyString })).default([]),
  phases: z.array(z.object({
    title: nonEmptyString,
    text: nonEmptyString.optional(),
    items: z.array(workHighlightSchema).min(1),
  })).min(1),
  cta: z.object({ label: nonEmptyString, href: nonEmptyString }).optional(),
});
export const workEmployersSchema = z.array(workEmployerSchema);
