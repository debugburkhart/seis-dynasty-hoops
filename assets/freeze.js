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
export function verifySeason(b, { requireComplete = true } = {}) {
  const problems = [];
  const s = b.seasonInfo;
  if (requireComplete && (!s || s.status !== 'complete')) problems.push('season is not complete');
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

// ---------- Week guard (the season in progress) ----------
// The current season is pulled fresh every night, so a finished week can come
// back from Sleeper stale or half-rebuilt. Each finished week is compared with
// last night's saved copy:
//   - regular-season week: a change is kept only if the season still matches
//     Sleeper's official standings (or last night's version didn't either);
//   - playoff week (no official totals): a change is kept unless some team's
//     score drops by more than 10% and 20 points, the signature of a partial week.
// A held-back week is accepted anyway once Sleeper sends the same new version
// three nights running, since a glitch doesn't usually stay identical that long.

const HOLD_NIGHTS = 3;
const weekOf = (data, s, w) => ({
  games: (data.games ?? []).filter(g => g.s === s && g.w === w),
  medianGames: (data.medianGames ?? []).filter(g => g.s === s && g.w === w),
  playerWeeks: (data.playerWeeks ?? []).filter(g => g.s === s && g.w === w),
});
const weekKey = wk => JSON.stringify([
  wk.games.map(g => [g.t, ...[g.a, g.b].sort(), g.a < g.b ? g.ap : g.bp, g.a < g.b ? g.bp : g.ap]).sort(),
  wk.playerWeeks.map(x => [x.o, x.pid, x.p]).sort(),
]);
// data with one week of season s replaced by that week from another pull.
const withWeek = (data, from, s, w) => {
  const other = weekOf(from, s, w);
  const keep = x => !(x.s === s && x.w === w);
  return {
    ...data,
    games: [...data.games.filter(keep), ...other.games],
    medianGames: [...(data.medianGames ?? []).filter(keep), ...other.medianGames],
    playerWeeks: [...(data.playerWeeks ?? []).filter(keep), ...other.playerWeeks],
  };
};
const seasonProblems = (data, s) => verifySeason(extractSeason(data, s), { requireComplete: false }).problems.length;

// Returns the guarded data, the updated hold state (saved in data/week-guard.json),
// log lines, and alerts worth an email.
export function guardSeason(data, previous, state = {}) {
  const log = [];
  const alerts = [];
  const next = {};
  const current = data.seasons.find(s => !s.frozen && s.status !== 'complete' && s.weeksPlayed);
  if (!current || !previous?.seasons?.some(s => s.season === current.season)) return { data, state: next, log, alerts };
  const S = current.season;
  const weeks = [...new Set(data.games.filter(g => g.s === S).map(g => g.w))]
    .filter(w => (previous.games ?? []).some(g => g.s === S && g.w === w))
    .sort((a, b) => a - b);

  let out = data;
  for (const w of weeks) {
    const fresh = weekOf(out, S, w);
    const saved = weekOf(previous, S, w);
    const freshKey = weekKey(fresh);
    if (freshKey === weekKey(saved)) continue;

    let suspicious;
    let why;
    if (w < current.playoffStart) {
      const withSaved = withWeek(out, previous, S, w);
      suspicious = seasonProblems(out, S) > seasonProblems(withSaved, S);
      why = 'the new version no longer matches Sleeper\'s official standings';
    } else {
      const before = {};
      for (const g of saved.games) { before[g.a] = g.ap; before[g.b] = g.bp; }
      const drops = fresh.games.flatMap(g => [[g.a, g.ap], [g.b, g.bp]])
        .filter(([o, p]) => before[o] != null && before[o] - p > 20 && (before[o] - p) / before[o] > 0.1);
      suspicious = drops.length > 0;
      why = 'some teams\' scores dropped sharply, like a partially loaded week';
    }
    if (!suspicious) {
      log.push(`${S} week ${w} changed in Sleeper; the change passed the checks, so it's accepted (likely a stat correction).`);
      continue;
    }
    const k = `${S}|${w}`;
    const nights = state[k]?.key === freshKey ? state[k].nights + 1 : 1;
    if (nights >= HOLD_NIGHTS) {
      log.push(`${S} week ${w}: Sleeper has sent the same new version ${nights} nights running, so it's accepted.`);
      alerts.push(`${S} week ${w} changed in Sleeper and was held back because ${why}. Sleeper has now sent the same new version ${nights} nights in a row, so the site accepted it. Check that week's scores in the Sleeper app; if they don't match, add the app's numbers to assets/corrections.js.`);
      continue;
    }
    next[k] = { key: freshKey, nights };
    out = withWeek(out, previous, S, w);
    log.push(`${S} week ${w} changed in Sleeper, but ${why}. Kept last night's version (night ${nights} of ${HOLD_NIGHTS}).`);
  }
  return { data: out, state: next, log, alerts };
}

// Two pulls of a season give the same games and lineups (used before freezing
// a newly completed season, so one glitchy night can't be locked in).
export function sameSeason(a, b) {
  const key = x => JSON.stringify([x.games, x.playerWeeks]);
  return Boolean(a && b) && key(a) === key(b);
}
