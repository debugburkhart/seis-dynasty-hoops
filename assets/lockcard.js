// LOCK REPORT CARD (owner, Nov 2 2026; Test features). How well each manager locks, from FINISHED weeks only.
// Owner's choices: graded PER LOCK DECISION (average gain of the locks he made), baseline = "never lock, take his last
// lineup game", plus the hindsight ceiling (best lineup game); no Assistant Coach comparison yet; 2026-27 only (the first
// season with lineup records, data/lgs.json, and Dev Dashboard picks; older seasons' matchup feed is broken).
// The rule: each starter counts ONE game a week; a lock freezes a played game; unlocked = his last LINEUP game; benched
// before his last game = 0; bench games never count.
// Which game counted (same as the 2K Game log): the commish's Dev Dashboard pick (law), else the lineup game whose points
// = his locked points (DATA.playerWeeks; a tie: one he started at tip-off per lgs.json, else the later one), else the
// nightly solver's game list (data/official-weeks.json; Sleeper corrects box scores later, e.g. Isaiah Stewart 26 -> 24).
// No DOM / Node APIs.

// Grade = ON A CURVE: average points gained per lock vs the last-game baseline, minus the league average per lock in
// the same view (season or week). Locks are made on big games, so every manager gains on the raw scale (week 1-2 2026:
// +7.5 to +19.5 per lock); the curve makes the league average a B. Constants: the owner may tune them.
export const MIN_LOCKS = 3; // fewer locks than this = "INC" (not graded, ranked after the graded managers)
export const GRADE_STEPS = [[6, 'A+'], [4, 'A'], [2.5, 'A-'], [1, 'B+'], [-1, 'B'], [-2.5, 'B-'], [-4, 'C+'], [-6, 'C'], [-8, 'C-'], [-11, 'D'], [-Infinity, 'F']];
export const gradeFor = (vsAvg, locks) => (locks < MIN_LOCKS ? 'INC' : GRADE_STEPS.find(([min]) => vsAvg >= min)[1]);
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const weekday = d => DAYS[(new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7];

const r1 = n => Math.round((Number(n) || 0) * 10) / 10;
const near = (a, b, tol = 0.06) => Math.abs(a - b) < tol;

// One starter-week. pw = playerWeeks row { s, w, o, pid, p }; all = his box games that week [{ date, p, opp, team, done }]
// (locks.js weekBoxes); bench = Set of dates he was on THIS team's bench at tip-off; starts = Set of dates he was in its
// lineup (lgs v 1); law = Dev Dashboard pick { k, d } | undefined; solved = [[date, fp]] from official-weeks | undefined.
// kind: lock (a played game frozen while later lineup games came) | ride (2+ lineup games, the last one counted) |
// single (one lineup game) | zero (benched before his last game) | none (no games) | unknown (no game fits).
export function judgeStart(pw, all, { bench = new Set(), starts = new Set(), law, solved } = {}) {
  const games = (all ?? []).filter(g => g.done !== false).map(g => ({ ...g, bench: bench.has(g.date) }));
  const lineup = games.filter(g => !g.bench);
  const p = r1(pw.p);
  const base = { w: pw.w, o: pw.o, pid: pw.pid, p, games, lineup, pick: law?.k ?? null };
  let g = null;
  let src = 'match';
  if (law?.k === 'zero') return { ...base, kind: 'zero', src: 'you', ...zeroCost(games, p) };
  if (law?.k === 'lock') { g = lineup.find(x => x.date === law.d) ?? games.find(x => x.date === law.d) ?? null; src = 'you'; }
  else if (law?.k === 'last') { g = lineup.at(-1) ?? null; src = 'you'; }
  if (!g && !law) {
    const fits = lineup.filter(x => near(x.p, p));
    g = fits.filter(x => starts.has(x.date)).at(-1) ?? fits.at(-1) ?? null;
    if (fits.length > 1 && fits.some(x => x !== g && x.p === g.p)) src = 'tie';
    if (!g && solved) {
      const d = [...solved].reverse().find(([, fp]) => near(fp, p, 0.6))?.[0];
      g = lineup.find(x => x.date === d) ?? null;
      if (g) src = 'solver';
    }
  }
  if (!g) {
    if (!games.length) return { ...base, kind: 'none', src };
    if (p === 0) return { ...base, kind: 'zero', src, ...zeroCost(games, p) };
    return { ...base, kind: 'unknown', src };
  }
  const idx = lineup.indexOf(g);
  const later = idx >= 0 ? lineup.slice(idx + 1) : [];
  const last = lineup.at(-1) ?? g;
  const best = lineup.reduce((b, x) => (x.p > b.p ? x : b), g);
  const worst = lineup.reduce((b, x) => (x.p < b.p ? x : b), g);
  const kind = later.length ? 'lock' : lineup.length > 1 ? 'ride' : 'single';
  return {
    ...base, kind, src, counted: g, n: idx + 1, of: lineup.length, day: weekday(g.date),
    base: last.p, delta: r1(p - last.p), best: best.p, bestGame: best, worst: worst.p, left: r1(best.p - p),
  };
}
// Benched before his last game: the baseline (kept in, last game counts) = his last game played that week.
function zeroCost(games, p) {
  const last = games.at(-1);
  return { base: last?.p ?? 0, delta: r1(p - (last?.p ?? 0)), best: Math.max(0, ...games.map(x => x.p)), left: r1(Math.max(0, ...games.map(x => x.p)) - p), lastGame: last ?? null };
}

// Every starter-week of the season's finished regular weeks. boxes = { w: weekBoxes() result }; lgs = data/lgs.json;
// lawOf(w) = { pid: pick }; official = data/official-weeks.json.
export function seasonStarts(DATA, season, { boxes, lgs, lawOf = () => ({}), official } = {}) {
  const S = lgs?.seasons?.[season];
  const rec = {}; // pid -> owner -> { bench: Set, starts: Set } by week
  for (const [pid, games] of Object.entries(S?.p ?? {})) {
    for (const [key, [v, o, fl = '']] of Object.entries(games)) {
      const w = Number(S.games?.[key]?.w);
      const r = ((rec[`${pid}|${o}|${w}`]) ??= { bench: new Set(), starts: new Set() });
      if (v === 0) r.bench.add(key.slice(0, 10));
      if (v === 1 && !fl.includes('k')) r.starts.add(key.slice(0, 10));
    }
  }
  const out = [];
  for (const pw of DATA.playerWeeks ?? []) {
    if (pw.s !== String(season) || pw.t !== 'R' || !boxes[pw.w]) continue;
    const r = rec[`${pw.pid}|${pw.o}|${pw.w}`] ?? {};
    const solved = official?.seasons?.[season]?.weeks?.[pw.w]?.[pw.o]?.games?.[pw.pid];
    out.push(judgeStart(pw, boxes[pw.w].games[pw.pid], { ...r, law: lawOf(pw.w)[pw.pid], solved }));
  }
  return out;
}

// Per manager totals over a list of starter-weeks (a season or one week). Sorted: graded first by average per lock.
export function managerCards(starts) {
  const by = {};
  for (const x of starts) {
    const m = (by[x.o] ??= { o: x.o, locks: [], rides: [], zeros: [], singles: 0, unknown: 0, counted: 0, base: 0, best: 0, worst: 0, days: Object.fromEntries(DAYS.map(d => [d, 0])) });
    if (x.kind === 'lock') { m.locks.push(x); m.days[x.day]++; }
    else if (x.kind === 'ride') m.rides.push(x);
    else if (x.kind === 'zero') m.zeros.push(x);
    else if (x.kind === 'single') m.singles++;
    else if (x.kind === 'unknown') m.unknown++;
    // Decision weeks (2+ lineup games) feed the efficiency line: how close to the best game vs the worst.
    if ((x.kind === 'lock' || x.kind === 'ride') && x.best > x.worst) { m.counted += x.p - x.worst; m.best += x.best - x.worst; }
  }
  const cards = Object.values(by).map(m => {
    const gain = r1(m.locks.reduce((s, x) => s + x.delta, 0));
    const zeroCost = r1(m.zeros.reduce((s, x) => s + x.delta, 0));
    const leftEarly = r1(m.locks.filter(x => x.delta < 0).reduce((s, x) => s - x.delta, 0));
    const saved = r1(m.locks.filter(x => x.delta > 0).reduce((s, x) => s + x.delta, 0));
    const leftRides = r1(m.rides.reduce((s, x) => s + x.left, 0));
    const avg = m.locks.length ? gain / m.locks.length : 0;
    const sorted = [...m.locks].sort((a, b) => b.delta - a.delta);
    return {
      ...m, gain, zeroCost, net: r1(gain + zeroCost), leftEarly, saved, leftRides, avg: r1(avg),
      paid: m.locks.filter(x => x.delta > 0).length, early: m.locks.filter(x => x.delta < 0).length, push: m.locks.filter(x => x.delta === 0).length,
      bestLock: sorted[0]?.delta > 0 ? sorted[0] : null, worstLock: sorted.at(-1)?.delta < 0 ? sorted.at(-1) : null,
      eff: m.best > 0 ? Math.round((100 * m.counted) / m.best) : null,
      avgGame: m.locks.length ? r1(m.locks.reduce((s, x) => s + x.n / x.of, 0) / m.locks.length) : null,
    };
  });
  // The curve: league average per lock over every lock in this view.
  const allLocks = cards.flatMap(c => c.locks);
  const leagueAvg = allLocks.length ? allLocks.reduce((s, x) => s + x.delta, 0) / allLocks.length : 0;
  for (const c of cards) { c.vsAvg = r1(c.avg - leagueAvg); c.grade = gradeFor(c.vsAvg, c.locks.length); }
  cards.leagueAvg = r1(leagueAvg);
  cards.sort((a, b) => ((b.grade !== 'INC') - (a.grade !== 'INC')) || b.avg - a.avg || b.net - a.net);
  cards.forEach((c, i) => {
    const prev = cards[i - 1];
    c.rank = c.grade === 'INC' ? null : prev && prev.rank != null && prev.avg === c.avg ? prev.rank : i + 1;
  });
  return cards;
}
