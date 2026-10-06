// Draft Kit: the draft boards, draft grades and manager report cards, and the
// projected order of the next rookie draft.
//
// Grades (decided with the owner): a pick's value is the player's NBA fantasy
// points per game since he was drafted, under each season's league scoring,
// whoever rostered him. Only seasons with at least MIN_GAMES games count, so a
// season lost to injury (or spent off the court) neither helps nor hurts. A pick
// with no such season isn't graded: "Barely played" once his first season is a
// quarter done, "Incomplete" before that. The value is compared with what that
// draft spot is expected to produce: a smooth curve fitted to every graded pick of
// that kind (rookie or startup), so an earlier pick is always expected to produce
// more. A class's grade comes from its picks' total above or below expectation.
// Startup picks get colors on the board but no letter grades.

const r1 = n => Math.round(n * 10) / 10;

// Fantasy points and games for a set of players in one NBA season.
// stats: Sleeper's /stats/nba/regular/{season}; scoring: that season's league scoring.
export function seasonPoints(stats, scoring, pids) {
  const rules = Object.entries(scoring ?? {});
  const out = {};
  for (const pid of pids) {
    const x = stats?.[pid];
    if (!x) continue;
    const fp = rules.reduce((sum, [k, v]) => sum + (Number(x[k]) || 0) * v, 0);
    if (fp || x.gp) out[pid] = [r1(fp), x.gp ?? 0];
  }
  return out;
}

export const draftedPlayers = DATA => [...new Set((DATA.drafts ?? []).flatMap(d => d.picks.map(p => p.pid)))];

// How much of each league season's NBA regular season has been played (0 to 1).
function seasonShare(DATA) {
  const share = {};
  for (const s of DATA.seasons) {
    const regular = Math.max(1, (s.playoffStart ?? 2) - 1);
    share[s.season] = s.status === 'complete' ? 1 : Math.min(1, (s.weeksPlayed ?? 0) / regular);
  }
  return share;
}

export const MIN_GAMES = 20; // games in a season for it to count toward a grade
const MIN_SHARE = 0.25; // share of his first season played before "Barely played"

export const TIERS = [
  { id: 'steal', label: 'Steal', min: 1 },
  { id: 'hit', label: 'Hit', min: 0.35 },
  { id: 'fair', label: 'Fair', min: -0.35 },
  { id: 'miss', label: 'Miss', min: -1 },
  { id: 'bust', label: 'Bust', min: -Infinity },
];

const LETTERS = [
  ['A+', 2, 4.3], ['A', 1.4, 4], ['A-', 1, 3.7], ['B+', 0.6, 3.3], ['B', 0.25, 3], ['B-', 0, 2.7],
  ['C+', -0.25, 2.3], ['C', -0.6, 2], ['C-', -1, 1.7], ['D', -1.5, 1], ['F', -Infinity, 0],
];
export const letterFor = score => LETTERS.find(([, min]) => score >= min)[0];
const pointsFor = letter => LETTERS.find(([l]) => l === letter)[2];
export const letterForGpa = gpa => LETTERS.find(([, , p]) => gpa >= p - 0.15)?.[0] ?? 'F';

// Every pick of every draft, with its board position and (once it has enough
// NBA games behind it) its value against expectation.
export function draftGrades(DATA) {
  const share = seasonShare(DATA);
  const stats = DATA.draftStats ?? {};
  const seasons = DATA.seasons.map(s => s.season);
  const picks = [];
  for (const d of DATA.drafts ?? []) {
    const teams = DATA.seasons.find(s => s.season === d.s)?.teams ?? [];
    const ownerOfRoster = Object.fromEntries(teams.map(t => [t.rosterId, t.owner]));
    const perRound = teams.length || d.picks.filter(p => p.round === 1).length;
    // Board column = the draft slot, taken from where the original team picked in round 1
    // (works for straight and snake drafts).
    const slotOf = {};
    for (const p of d.picks.filter(x => x.round === 1)) slotOf[p.orig] = p.no;
    for (const p of d.picks) {
      const inRound = p.no - (p.round - 1) * perRound;
      let pts = 0; // in the seasons that count
      let gp = 0;
      let allGp = 0;
      let played = 0; // seasons elapsed since the draft
      let skipped = 0; // seasons under MIN_GAMES games
      for (const y of seasons) {
        if (Number(y) < Number(d.s)) continue;
        played += share[y] ?? 0;
        const [p1, g1] = stats[y]?.[p.pid] ?? [0, 0];
        allGp += g1;
        if (g1 >= MIN_GAMES) { pts += p1; gp += g1; } else if ((share[y] ?? 0) >= MIN_SHARE) skipped++;
      }
      picks.push({
        s: d.s, kind: d.kind, round: p.round, no: p.no, inRound, slot: slotOf[p.orig] ?? inRound,
        pid: p.pid, o: p.o, orig: ownerOfRoster[p.orig] ?? p.o,
        pts: r1(pts), gp, allGp, skipped,
        value: gp ? pts / gp : null, // fantasy points per game in the seasons that count
        limited: !gp && played >= MIN_SHARE, // "Barely played": no season of MIN_GAMES yet
      });
    }
  }

  // Expected value by overall pick number: value = a + b * ln(pick), fitted per kind.
  const curves = {};
  for (const kind of ['rookie', 'startup']) {
    const pts = picks.filter(p => p.kind === kind && p.value != null);
    if (pts.length < 4) continue;
    const xs = pts.map(p => Math.log(p.no));
    const ys = pts.map(p => p.value);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const b = Math.min(0, sxx ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx : 0);
    const a = my - b * mx;
    const expect = no => Math.max(0, a + b * Math.log(no));
    const sd = Math.sqrt(pts.reduce((s, p) => s + (p.value - expect(p.no)) ** 2, 0) / pts.length) || 1;
    curves[kind] = { expect, sd, n: pts.length };
  }

  for (const p of picks) {
    const c = curves[p.kind];
    p.expected = c ? c.expect(p.no) : null;
    if (p.value == null || !c) { p.tier = null; continue; }
    p.diff = p.value - p.expected; // points per season above or below the slot
    p.z = p.diff / c.sd;
    p.tier = TIERS.find(t => p.z >= t.min).id;
  }
  return { picks, curves };
}

// One manager's class in one rookie draft.
function classOf(list) {
  const graded = list.filter(p => p.z != null);
  if (!graded.length) return { picks: list, graded, grade: null };
  const score = graded.reduce((s, p) => s + p.z, 0);
  return {
    picks: list,
    graded,
    score,
    diff: graded.reduce((s, p) => s + p.diff, 0),
    grade: letterFor(score),
    best: [...graded].sort((a, b) => b.z - a.z)[0],
  };
}

// Class grades for one rookie draft: one row per manager who made a pick.
export function draftClasses(grades, season) {
  const picks = grades.picks.filter(p => p.s === season && p.kind === 'rookie');
  const owners = [...new Set(picks.map(p => p.o))];
  const rows = owners.map(o => ({ owner: o, ...classOf(picks.filter(p => p.o === o)) }));
  rows.sort((a, b) => (b.score ?? -99) - (a.score ?? -99) || b.picks.length - a.picks.length);
  const graded = picks.filter(p => p.z != null);
  return {
    picks,
    rows,
    complete: graded.length > 0,
    steal: [...graded].sort((a, b) => b.z - a.z)[0] ?? null,
    bust: [...graded].sort((a, b) => a.z - b.z)[0] ?? null,
  };
}

// Draft of the Year (Awards banner, decided with the owner): the best class grade
// from that season's rookie draft, judged on the rookies' first season only, with
// the league's data as it stood when that season ended. Later seasons and drafts
// are left out, so a banner never changes. The Draft Grades tab keeps the living
// grade. Steal of the Draft (its own award, 09) = that draft's pick furthest above
// its spot after year one; steals = the top 3 for the race.
export function draftOfYear(DATA, season) {
  if (!(DATA.drafts ?? []).some(d => d.s === season && d.kind === 'rookie')) return { none: true };
  if (!DATA.draftStats) return null;
  const asOf = {
    ...DATA,
    seasons: DATA.seasons.filter(s => s.season <= season),
    drafts: DATA.drafts.filter(d => d.s <= season),
    draftStats: Object.fromEntries(Object.entries(DATA.draftStats).filter(([y]) => y <= season)),
  };
  const c = draftClasses(draftGrades(asOf), season);
  const rows = c.rows.filter(r => r.grade);
  const steals = c.picks.filter(p => p.z != null).sort((a, b) => b.z - a.z).slice(0, 3);
  return rows.length ? { winner: rows[0], rows, steal: c.steal, steals } : null;
}

// Report card: a manager across every rookie draft.
export function reportCards(grades, owners) {
  const seasons = [...new Set(grades.picks.filter(p => p.kind === 'rookie').map(p => p.s))].sort();
  return owners.map(o => {
    const mine = grades.picks.filter(p => p.kind === 'rookie' && p.o === o);
    const graded = mine.filter(p => p.z != null);
    const classes = seasons.map(s => ({ s, ...classOf(mine.filter(p => p.s === s)) }));
    const gradedClasses = classes.filter(c => c.grade);
    const gpa = gradedClasses.length ? gradedClasses.reduce((a, c) => a + pointsFor(c.grade), 0) / gradedClasses.length : null;
    return {
      owner: o,
      picks: mine.length,
      graded: graded.length,
      classes,
      gpa,
      grade: gpa == null ? null : letterForGpa(gpa),
      beat: graded.filter(p => p.diff >= 0).length,
      diff: graded.reduce((a, p) => a + p.diff, 0),
      best: [...graded].sort((a, b) => b.z - a.z)[0] ?? null,
      worst: [...graded].sort((a, b) => a.z - b.z)[0] ?? null,
    };
  }).sort((a, b) => (b.gpa ?? -1) - (a.gpa ?? -1) || b.diff - a.diff);
}

// Projected order of the next rookie draft: reverse regular-season standings of
// the season before it, with the two worst teams flipping a coin for No. 1.
// standingsBefore: hype.js's table (win %, then points for).
export function projectedOrder(DATA, draftSeason, standingsBefore) {
  const season = String(Number(draftSeason) - 1);
  const s = DATA.seasons.find(x => x.season === season);
  if (!s) return null;
  const table = standingsBefore(DATA, season, s.playoffStart ?? 99);
  if (!table.weeks) return { season, rows: [], weeks: 0 };
  const worstFirst = [...table.rows].reverse();
  return {
    season,
    weeks: table.weeks,
    final: s.status === 'complete' || table.weeks >= (s.playoffStart ?? 99) - 1,
    rows: worstFirst.map((r, i) => ({ owner: r.owner, slot: i + 1, coin: i < 2, w: r.w, l: r.l, t: r.t, pf: r.pf })),
  };
}
