// Player Index: every player who has scored locked points in this league, with
// his totals and a breakdown by fantasy team (manager) and by season.
// Locked points only (starters' points; bench points never count), every game type.

const r1 = n => Math.round(n * 10) / 10;

export const SORTS = [
  ['pts', 'Locked points', r => r.pts],
  ['weeks', 'Weeks started', r => r.weeks],
  ['avg', 'Points per start', r => r.avg],
];

// season: 'all' or a season; manager: 'all' or an owner id (only his teams' points).
export function playerIndex(DATA, { season = 'all', manager = 'all' } = {}) {
  const by = {};
  for (const x of DATA.playerWeeks ?? []) {
    if (season !== 'all' && x.s !== season) continue;
    if (manager !== 'all' && x.o !== manager) continue;
    const r = (by[x.pid] ??= { pid: x.pid, pts: 0, weeks: 0, owners: {}, seasons: {} });
    r.pts += x.p;
    r.weeks++;
    const o = (r.owners[x.o] ??= { o: x.o, pts: 0, weeks: 0, seasons: new Set() });
    o.pts += x.p;
    o.weeks++;
    o.seasons.add(x.s);
    r.seasons[x.s] = (r.seasons[x.s] ?? 0) + x.p;
  }
  return Object.values(by).map(r => ({
    ...r,
    pts: r1(r.pts),
    avg: r.weeks ? r1(r.pts / r.weeks) : 0,
    owners: Object.values(r.owners)
      .map(o => ({ ...o, pts: r1(o.pts), seasons: [...o.seasons].sort() }))
      .sort((a, b) => b.pts - a.pts),
    seasons: Object.entries(r.seasons).map(([s, p]) => ({ s, pts: r1(p) })).sort((a, b) => a.s.localeCompare(b.s)),
  }));
}
