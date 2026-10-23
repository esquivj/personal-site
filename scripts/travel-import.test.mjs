import assert from 'node:assert/strict';
import test from 'node:test';
import { computeTravelStats, parseCSV } from './travel-import.mjs';

const airports = {
  AAA: { lat: 0, lon: 0, country: 'Country A' },
  BBB: { lat: 0, lon: 90, country: 'Country B' },
  CCC: { lat: 0, lon: 180, country: 'Country C' },
};
const header = 'Date,From,To,Canceled,Airline,Aircraft Type Name,Diverted To';

test('CSV preserves commas, multiline notes, escaped quotes, and CRLF', () => {
  assert.deepEqual(parseCSV('\uFEFFA,B\r\n"one, two","said ""hi""\nnext"\r\n'),
    [['A', 'B'], ['one, two', 'said "hi"\nnext']]);
  assert.throws(() => parseCSV('A\n"unfinished'), /Unclosed/);
});

test('future and cancelled flights cannot inflate past stats or airport list', () => {
  const stats = computeTravelStats(`${header}\n2026-10-20,AAA,BBB,false,Airline,Plane,\n2026-11-20,AAA,CCC,false,Future,Future,\n2026-10-20,AAA,CCC,true,Cancelled,Cancelled,`, airports, '2026-10-21');
  assert.equal(stats.totalFlights, 1);
  assert.deepEqual(stats.airports, ['AAA', 'BBB']);
  assert.deepEqual(stats.landedAirports, ['BBB']);
  assert.equal(stats.totalCountries, 2);
  assert.equal(stats.totalAirlines, 1);
  assert.equal(stats.totalAircraftTypes, 1);
  assert.equal(stats.lastUpdated, '2026-10-21');
});

test('great-circle distances replace arbitrary defaults and aggregate return routes', () => {
  const stats = computeTravelStats(`${header}\n2026-01-01,AAA,BBB,false,Airline,Plane,\n2026-01-02,BBB,AAA,false,Airline,Plane,`, airports, '2026-10-21');
  assert.ok(Math.abs(stats.totalDistance - 20015) < 2);
  assert.deepEqual(stats.routes, [{ from: 'AAA', to: 'BBB', count: 2 }]);
});

test('diversions use the actual destination', () => {
  const stats = computeTravelStats(`${header}\n2026-01-01,AAA,BBB,false,Airline,Plane,CCC`, airports, '2026-10-21');
  assert.deepEqual(stats.airports, ['AAA', 'CCC']);
  assert.deepEqual(stats.landedAirports, ['CCC']);
});

test('unknown airports and malformed dates fail instead of inventing stats', () => {
  assert.throws(() => computeTravelStats(`${header}\n2026-01-01,AAA,XXX,false,Airline,Plane,`, airports, '2026-10-21'), /Missing airport/);
  assert.throws(() => computeTravelStats(`${header}\n2026-02-30,AAA,BBB,false,Airline,Plane,`, airports, '2026-10-21'), /Invalid flight date/);
  assert.throws(() => computeTravelStats(header, airports, '2026-02-30'), /as-of date/);
  assert.throws(() => computeTravelStats('Date,From\n2026-01-01,AAA', airports, '2026-10-21'), /Missing Flighty column/);
});

test('public summary only contains aggregate data', () => {
  const stats = computeTravelStats(`${header},PNR,Seat,Notes\n2026-01-01,AAA,BBB,false,Airline,Plane,,SECRET,4A,Private`, airports, '2026-10-21');
  assert.doesNotMatch(JSON.stringify(stats), /SECRET|Private|4A|PNR|Notes/);
});
