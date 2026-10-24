// CEO ranking scorer for tender bids. Pure function, zero deps.
// rankBids(bundle, bids, records) -> [{bid_id, rank, score, reason}]
//
// Weights (per published selection): audit 30, innovation 20, approach 20,
// price 20, record 10. A bid with no tests gets approach+audit zeroed so a
// cheap untested bid can never outrank a tested one on price alone.

const W = { audit: 30, innovation: 20, approach: 20, price: 20, record: 10 };
const TIERS = { unproven: 0, bronze: 0.4, silver: 0.7, gold: 1.0 };

function hasTests(bid) {
  const a = `${bid.approach_md || ''}`.toLowerCase();
  return /\btest|coverage|fixture|node:test|assert\b/.test(a);
}

export function rankBids(bundle, bids, records = {}) {
  const ceiling = bundle.bounty_usdc || bundle.ceiling_usdc || Math.max(...bids.map(b => b.price_usdc));
  const scored = bids.map(b => {
    const rec = records[b.id] || records[b.bid_id] || records[b.offer_id] || {};
    const tested = hasTests(b);
    const subs = {
      price: ceiling > 0 ? Math.max(0, 1 - b.price_usdc / ceiling) : 0,
      approach: tested ? Math.min(1, (b.approach_md || '').length / 1200) : 0,
      audit: tested ? 1 : 0,
      innovation: Math.min(1, (b.approach_md || '').length / 2000),
      record: TIERS[rec.tier || 'unproven'] ?? 0,
    };
    const score =
      subs.price * W.price + subs.approach * W.approach + subs.audit * W.audit +
      subs.innovation * W.innovation + subs.record * W.record;
    const top = Object.entries({ price: subs.price * W.price, approach: subs.approach * W.approach,
      audit: subs.audit * W.audit, innovation: subs.innovation * W.innovation,
      record: subs.record * W.record }).sort((a, b2) => b2[1] - a[1])[0][0];
    const reason = tested
      ? `Tested approach; dominant subscore ${top}; price ${b.price_usdc} vs ceiling ${ceiling}; tier ${rec.tier || 'unproven'}; overall score ${score.toFixed(1)} of 100.`
      : `No tests in approach, so audit and approach scores are zeroed; price alone (${b.price_usdc} vs ceiling ${ceiling}) cannot outrank tested bids; overall score ${score.toFixed(1)} of 100.`;
    return { bid_id: b.id || b.bid_id, _ts: b.created_at || '', score, reason };
  });
  scored.sort((a, b) => b.score - a.score || String(a._ts).localeCompare(String(b._ts)) || String(a.bid_id).localeCompare(String(b.bid_id)));
  return scored.map((s, i) => ({ bid_id: s.bid_id, rank: i + 1, score: +s.score.toFixed(2), reason: s.reason }));
}
