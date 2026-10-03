// Transactions: every roster move, newest first, sorted into the kinds the page
// filters by, with what each move produced in locked points (the Value Desk).
// Values come from frontoffice.js: a pickup is worth what the player scored for
// the team that added him (until he left), a drop shows what he scored for the
// next team that picked him up, and a trade shows each side's net.

export const KINDS = [
  ['all', 'All'], ['trades', 'Trades'], ['picks', 'Picks'], ['waivers', 'Waivers'],
  ['fa', 'FA'], ['drops', 'Drops'], ['commish', 'Commish'],
];

// fo: the result of frontOffice(DATA) for all seasons.
export function transactionLog(DATA, fo) {
  const tradeByTx = new Map(fo.trades.map(t => [t.tx, t]));
  const pickupBy = new Map(fo.pickups.map(p => [`${p.tx}|${p.pid}`, p]));
  const letGoBy = new Map(fo.letGo.map(p => [`${p.tx}|${p.pid}`, p]));
  const moves = (DATA.transactions ?? []).map((x, i) => {
    const adds = Object.entries(x.adds ?? {}).map(([pid, o]) => ({ pid, o, pickup: pickupBy.get(`${i}|${pid}`) ?? null }));
    const drops = Object.entries(x.drops ?? {}).map(([pid, o]) => ({ pid, o, later: letGoBy.get(`${i}|${pid}`) ?? null }));
    const kind = x.type === 'trade' ? 'trades'
      : x.type === 'waiver' ? 'waivers'
      : x.type === 'commissioner' ? 'commish'
      : adds.length ? 'fa' : 'drops';
    return { i, s: x.s, w: x.w, ts: x.ts ?? 0, type: x.type, kind, owners: x.owners ?? [], adds, drops, picks: x.picks ?? [], trade: tradeByTx.get(i) ?? null };
  });
  moves.sort((a, b) => Number(b.s) - Number(a.s) || b.w - a.w || b.ts - a.ts);
  return moves;
}

// "Picks" lists the trades that moved at least one draft pick.
export const matchesKind = (m, kind) => kind === 'all' || m.kind === kind || (kind === 'picks' && m.kind === 'trades' && m.picks.length > 0);

// Totals for the Ledger strip. Commissioner moves aren't a manager's decision,
// so they count in the total but not toward the busiest manager.
export function ledgerTotals(moves) {
  const per = {};
  for (const m of moves) {
    if (m.kind === 'commish') continue;
    for (const o of new Set(m.owners)) per[o] = (per[o] ?? 0) + 1;
  }
  const ranking = Object.entries(per).sort((a, b) => b[1] - a[1]).map(([o, n]) => ({ o, n }));
  const busiest = ranking[0] ? [ranking[0].o, ranking[0].n] : null;
  return {
    ranking,
    trades: moves.filter(m => m.kind === 'trades').length,
    waivers: moves.filter(m => m.kind === 'waivers').length,
    addsDrops: moves.filter(m => m.kind === 'fa' || m.kind === 'drops').length,
    total: moves.length,
    busiest: busiest && { o: busiest[0], n: busiest[1] }, // most moves, commissioner moves aside
  };
}
