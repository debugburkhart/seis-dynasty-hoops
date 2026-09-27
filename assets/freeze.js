// Frozen seasons. A completed season doesn't change, so once its data is known
// to be good it's saved in data/frozen/<season>.json and loaded from there
// instead of Sleeper, whose API has at times served stale or partial weeks for
// old seasons. corrections.js is still applied on top (see build-data.js).

const r1 = n => Math.round(n * 10) / 10;

// Everything the site keeps for one season, from a full league data object.
export function extractSeason(data, season) {
  const bySeason = list => (list ?? []).filter(x => x.s === season);
  return {
    season,
    frozenFrom: data.generatedAt,
    seasonInfo: data.seasons.find(s => s.season === season),
    games: bySeason(data.games),
    medianGames: bySeason(data.medianGames),
    schedule: bySeason(data.schedule),
    playerWeeks: bySeason(data.playerWeeks),
    transactions: bySeason(data.transactions),
    drafts: bySeason(data.drafts),
  };
}

// The same checks the nightly run makes, for one frozen season: every team's
// regular-season points and wins match Sleeper's official standings, and every
// lineup adds up to its team's score.
export function verifySeason(b) {
  const problems = [];
  const s = b.seasonInfo;
  if (!s || s.status !== 'complete') problems.push('season is not complete');
  for (const t of s?.teams ?? []) {
    const mine = b.games.filter(g => g.t === 'R' && (g.a === t.owner || g.b === t.owner));
    const pf = mine.reduce((x, g) => x + (g.a === t.owner ? g.ap : g.bp), 0);
    const wins = mine.filter(g => (g.a === t.owner && g.win === 'a') || (g.b === t.owner && g.win === 'b')).length
      + b.medianGames.filter(m => m.o === t.owner && m.res === 'W').length;
    if (Math.abs(pf - t.pf) >= 0.5) problems.push(`${t.owner}: points ${r1(pf)} vs official ${t.pf}`);
    if (wins !== t.w) problems.push(`${t.owner}: wins ${wins} vs official ${t.w}`);
  }
  const locked = {};
  for (const x of b.playerWeeks) locked[`${x.w}|${x.o}`] = (locked[`${x.w}|${x.o}`] ?? 0) + x.p;
  for (const g of b.games) {
    for (const [o, p] of [[g.a, g.ap], [g.b, g.bp]]) {
      if (Math.abs(r1(locked[`${g.w}|${o}`] ?? 0) - p) >= 0.05) problems.push(`week ${g.w} ${o}: lineup ${r1(locked[`${g.w}|${o}`] ?? 0)} vs score ${p}`);
    }
  }
  return { ok: problems.length === 0, problems };
}

// Two pulls of a season give the same games and lineups (used before freezing
// a newly completed season, so one glitchy night can't be locked in).
export function sameSeason(a, b) {
  const key = x => JSON.stringify([x.games, x.playerWeeks]);
  return Boolean(a && b) && key(a) === key(b);
}
