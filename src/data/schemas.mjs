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
  collector: z.literal('claude-count-tokens@1.2.0'),
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
