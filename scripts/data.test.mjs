import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { travelStatsSchema, writingPostsSchema, projectsSchema, compoundFeedSchema } from '../src/data/schemas.mjs';

// Node cannot load TypeScript directly. Transpile the real data modules in memory;
// their shared runtime schemas are ordinary ESM and need no loader or tsx.
async function loadData(name) {
  const source = await readFile(new URL(`../src/data/${name}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const schemaUrl = new URL('../src/data/schemas.mjs', import.meta.url).href;
  const code = outputText.replace(/(['"])\.\/schemas\.mjs\1/g, JSON.stringify(schemaUrl));
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

const { travelStats } = await loadData('travels');
const { writingPosts, postsNewestFirst, writingPostBySlug } = await loadData('writing');

function rejectsMutation(schema, original, mutate, path) {
  const data = structuredClone(original);
  mutate(data);
  assert.throws(() => schema.parse(data), (error) => {
    assert.ok(error.issues.some((issue) => issue.path.join('.') === path), error.message);
    return true;
  });
}

test('current data passes and writing exports retain their behavior', () => {
  assert.deepEqual(travelStatsSchema.parse(travelStats), travelStats);
  assert.deepEqual(writingPostsSchema.parse(writingPosts), writingPosts);
  assert.equal(Object.keys(writingPostBySlug).length, writingPosts.length);
  assert.deepEqual(postsNewestFirst.map((post) => post.publishedTime),
    writingPosts.map((post) => post.publishedTime).sort().reverse());
});

for (const field of ['totalFlights', 'totalDistance', 'totalCountries', 'totalAirports',
  'totalAirlines', 'totalAircraftTypes']) {
  test(`${field} requires a nonnegative integer`, () => {
    for (const value of [-1, 1.5, '1', NaN, Infinity]) {
      rejectsMutation(travelStatsSchema, travelStats, (data) => { data[field] = value; }, field);
    }
  });
}

for (const field of ['firstFlight', 'lastUpdated']) {
  test(`${field} requires an ISO calendar date`, () => {
    for (const value of ['2026.01.01', '2026-2-01', '2026-02-30', '2026-01-01T00:00:00Z']) {
      rejectsMutation(travelStatsSchema, travelStats, (data) => { data[field] = value; }, field);
    }
  });
}

test('airport codes require exactly three uppercase letters', () => {
  for (const value of ['lax', 'LA', 'LAXX', 'L4X']) {
    rejectsMutation(travelStatsSchema, travelStats, (data) => { data.airports[0] = value; }, 'airports.0');
  }
});

test('writing requires nonempty slugs and titles', () => {
  for (const field of ['slug', 'title']) {
    for (const value of ['', '   ']) {
      rejectsMutation(writingPostsSchema, writingPosts, (data) => { data[0][field] = value; }, `0.${field}`);
    }
  }
});

test('duplicate slugs fail with the offending index and slug', () => {
  rejectsMutation(writingPostsSchema, writingPosts,
    (data) => { data[1].slug = data[0].slug; }, '1.slug');
});

test('writing date formats and calendar dates are validated', () => {
  for (const [field, values] of [
    ['date', ['2026-03-15', '2026.3.15', '2026.02.30']],
    ['publishedTime', ['2026.03.15', '2026-3-15', '2026-02-30']],
  ]) {
    for (const value of values) {
      rejectsMutation(writingPostsSchema, writingPosts, (data) => { data[0][field] = value; }, `0.${field}`);
    }
  }
  const leapDay = structuredClone(writingPosts);
  leapDay[0].date = '2024.02.29';
  leapDay[0].publishedTime = '2024-02-29';
  assert.doesNotThrow(() => writingPostsSchema.parse(leapDay));
});

test('current projects pass and invalid image dimensions fail', async () => {
  const page = await readFile(new URL('../src/pages/projects.astro', import.meta.url), 'utf8');
  const literal = page.match(/const projects = projectsSchema\.parse\(([\s\S]*?)\);/)[1];
  // This is the repository's trusted literal, not external input.
  const projects = Function(`return (${literal});`)();
  assert.deepEqual(projectsSchema.parse(projects), projects);
  rejectsMutation(projectsSchema, projects, (data) => { data[0].image.width = -1; }, '0.image.width');
});


test('Compound feed passes and rejects invalid post data', async () => {
  const feed = JSON.parse(await readFile(new URL('../src/data/compound-feed.json', import.meta.url), 'utf8'));
  assert.deepEqual(compoundFeedSchema.parse(feed), feed);
  const index = feed.findIndex((entry) => entry.kind === 'post' && entry.image);
  rejectsMutation(compoundFeedSchema, feed, (data) => { data[index].image.width = -1; }, `${index}.image.width`);
  rejectsMutation(compoundFeedSchema, feed, (data) => { data[index].metrics.views = -1; }, `${index}.metrics.views`);
  rejectsMutation(compoundFeedSchema, feed, (data) => { data[index].date = 'invalid'; }, `${index}.date`);
});
