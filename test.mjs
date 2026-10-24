import test from 'node:test';
import assert from 'node:assert/strict';
import { rankBids } from './index.mjs';

const tested = 'Approach: I will implement the module with node:test coverage of every branch, deterministic fixtures, and integration tests asserting the store side effects.';
const untested = 'I will just write the code quickly and it should work fine.';

const bundle = { bounty_usdc: 100 };
const bids = [
  { id: 'cheap-untested', price_usdc: 10, approach_md: untested, created_at: '2026-10-20T00:00:00Z' },
  { id: 'tested-mid', price_usdc: 80, approach_md: tested, created_at: '2026-10-20T01:00:00Z' },
  { id: 'tested-cheap', price_usdc: 50, approach_md: tested, created_at: '2026-10-20T02:00:00Z' },
];
const records = { 'tested-cheap': { tier: 'silver' }, 'tested-mid': { tier: 'bronze' } };

test('deterministic: same input, same order', () => {
  const a = rankBids(bundle, bids, records);
  const b = rankBids(bundle, [...bids].reverse(), records);
  assert.deepEqual(a.map(x => x.bid_id), b.map(x => x.bid_id));
});

test('cheap untested bid never outranks tested bids', () => {
  const r = rankBids(bundle, bids, records);
  const untestedRank = r.find(x => x.bid_id === 'cheap-untested').rank;
  assert.ok(untestedRank > r.find(x => x.bid_id === 'tested-mid').rank);
  assert.ok(untestedRank > r.find(x => x.bid_id === 'tested-cheap').rank);
});

test('every bid gets a reason of at least 10 words', () => {
  for (const row of rankBids(bundle, bids, records))
    assert.ok(row.reason.split(/\s+/).filter(Boolean).length >= 10, row.reason);
});

test('ranks are sequential from 1', () => {
  const r = rankBids(bundle, bids, records);
  assert.deepEqual(r.map(x => x.rank), [1, 2, 3]);
});

test('record tier lifts an otherwise equal bid', () => {
  const eq = [
    { id: 'a', price_usdc: 50, approach_md: tested, created_at: '2026-10-20T00:00:00Z' },
    { id: 'b', price_usdc: 50, approach_md: tested, created_at: '2026-10-20T00:00:00Z' },
  ];
  const r = rankBids(bundle, eq, { b: { tier: 'gold' } });
  assert.equal(r[0].bid_id, 'b');
});
