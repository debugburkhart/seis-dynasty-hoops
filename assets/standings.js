// Standings and the all-time Legacy score.

const r1 = n => Math.round(n * 10) / 10;

// ---------- Final finishes ----------
// Each completed season's final place for every team, from the playoff and
// placement games: champion 1st, runner-up 2nd, 3rd/5th place games, and the
// last-place game. That game is a toilet bowl (the lower score finishes last).
// Anyone not placed by a game is ranked by regular-season record below them.
export function finishes(DATA) {
  const out = {};
  for (const s of DATA.seasons.filter(x => x.status === 'complete')) {
    const place = {};
    const games = DATA.games.filter(g => g.s === s.season && g.t !== 'R');
    const winLose = g => (g.win === 'a' ? [g.a, g.b] : [g.b, g.a]);
    if (s.champion) place[s.champion] = 1;
    if (s.runnerUp) place[s.runnerUp] = 2;
    for (const g of games) {
      const n = /^(\d+)(st|nd|rd|th) place/.exec(g.label ?? '')?.[1];
      if (n) {
        const [w, l] = winLose(g);
        place[w] = Number(n);
        place[l] = Number(n) + 1;
      }
      if (g.label === 'Last place game') {
        const [hi, lo] = g.ap >= g.bp ? [g.a, g.b] : [g.b, g.a];
        place[lo] = s.teams.length;
        place[hi] = s.teams.length - 1;
      }
    }
    // Fill any gaps by regular-season record.
    const pct = t => (t.w + t.t / 2) / Math.max(1, t.w + t.l + t.t);
    const open = [...Array(s.teams.length).keys()].map(i => i + 1).filter(n => !Object.values(place).includes(n));
    const unplaced = s.teams.filter(t => place[t.owner] == null).sort((a, b) => pct(b) - pct(a) || b.pf - a.pf);
    unplaced.forEach((t, i) => { place[t.owner] = open[i]; });
    out[s.season] = place;
  }
  return out;
}

// ---------- Per-manager totals over a set of seasons ----------

// Weekly median results for every regular-season week, from the scores, so
// seasons before the league-median game can be measured the same way.
function medianResults(DATA, seasons) {
  const set = new Set(seasons);
  const weeks = {};
  for (const g of DATA.games) {
    if (g.t !== 'R' || !set.has(g.s)) continue;
    const k = `${g.s}|${g.w}`;
    (weeks[k] ??= []).push([g.a, g.ap], [g.b, g.bp]);
  }
  const res = {};
  for (const list of Object.values(weeks)) {
    const ps = list.map(x => x[1]).sort((a, b) => a - b);
    const m = ps.length / 2;
    const median = ps.length % 2 ? ps[Math.floor(m)] : (ps[m - 1] + ps[m]) / 2;
    for (const [o, p] of list) {
      const r = (res[o] ??= { w: 0, l: 0, t: 0 });
      r[p > median ? 'w' : p < median ? 'l' : 't']++;
    }
  }
  return res;
}

function headToHead(DATA, seasons, types) {
  const set = new Set(seasons);
  const res = {};
  for (const g of DATA.games) {
    if (!types.includes(g.t) || !set.has(g.s)) continue;
    for (const [o, side, p, op] of [[g.a, 'a', g.ap, g.bp], [g.b, 'b', g.bp, g.ap]]) {
      const r = (res[o] ??= { w: 0, l: 0, t: 0, pf: 0, pa: 0, g: 0 });
      r.g++;
      r.pf += p;
      r.pa += op;
      r[g.win === 'tie' ? 't' : g.win === side ? 'w' : 'l']++;
    }
  }
  return res;
}

// ---------- Legacy score ----------
//   Championships  40 × (1 − 0.6^titles)
//   Median         25 × median win rate, after adding a neutral 10.5–10.5 season
//   Wins           15 × head-to-head win rate, after the same neutral season
//   Playoffs       20 − 20 × (misses + 1) / (seasons + 2)
// Completed seasons only, so a season in progress can't swing anyone's legacy.
export const LEGACY = { titles: 40, median: 25, wins: 15, playoffs: 20, neutral: 10.5 };

export function legacy(DATA, { through } = {}) {
  const done = DATA.seasons.filter(s => s.status === 'complete' && (!through || s.season <= through));
  const seasons = done.map(s => s.season);
  const place = finishes(DATA);
  const med = medianResults(DATA, seasons);
  const h2h = headToHead(DATA, seasons, ['R']);
  const owners = [...new Set(done.flatMap(s => s.teams.map(t => t.owner)))];
  const rate = (r, n) => (r.w + r.t / 2 + n) / (r.w + r.l + r.t + 2 * n);

  const rows = owners.map(o => {
    const mine = done.filter(s => s.teams.some(t => t.owner === o));
    const finish = mine.map(s => ({ s: s.season, place: place[s.season]?.[o], size: s.teams.length }));
    const titles = mine.filter(s => s.champion === o).map(s => s.season);
    const seconds = mine.filter(s => s.runnerUp === o).map(s => s.season);
    const lasts = finish.filter(f => f.place === f.size).map(f => f.s);
    const made = mine.filter(s => (s.playoffTeams ?? []).includes(o) || DATA.games.some(g => g.s === s.season && g.t === 'P' && (g.a === o || g.b === o)));
    const misses = mine.length - made.length;
    const m = med[o] ?? { w: 0, l: 0, t: 0 };
    const h = h2h[o] ?? { w: 0, l: 0, t: 0 };
    const parts = {
      titles: LEGACY.titles * (1 - 0.6 ** titles.length),
      median: LEGACY.median * rate(m, LEGACY.neutral),
      wins: LEGACY.wins * rate(h, LEGACY.neutral),
      playoffs: LEGACY.playoffs - (LEGACY.playoffs * (misses + 1)) / (mine.length + 2),
    };
    return {
      owner: o, seasons: mine.length, seasonList: mine.map(s => s.season),
      titles, seconds, lasts, finish, made: made.length, misses,
      median: m, h2h: h,
      medianPct: m.w + m.l + m.t ? (m.w + m.t / 2) / (m.w + m.l + m.t) : 0,
      parts,
      score: r1(parts.titles + parts.median + parts.wins + parts.playoffs),
    };
  });
  // Ties break by titles, then median record, then name.
  const nameOf = o => DATA.owners[o]?.name ?? '';
  rows.sort((a, b) => b.score - a.score || b.titles.length - a.titles.length || b.medianPct - a.medianPct || nameOf(a.owner).localeCompare(nameOf(b.owner)));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return { seasons, rows };
}

// Career label, relative to this league: the top franchise alone is the GOAT
// and the bottom one alone is last.
export function legacyLabel(rank, n) {
  if (rank === 1) return 'The GOAT';
  if (rank === n) return 'Cellar dweller';
  const p = (rank - 1) / (n - 1);
  if (p <= 0.2) return 'The chasing pack';
  if (p <= 0.45) return 'In contention';
  if (p <= 0.75) return 'Middle of the pack';
  return 'Underachiever';
}

// NBA comparisons, each used once per league, matched to career patterns in
// Legacy order (so the best résumé gets first pick of the comparisons it fits).
const won = r => r.titles.length > 0;
const COMPARISONS = [
  // Champions
  { test: r => r.titles.length >= 2, text: "Jordan's Bulls: the rings define the résumé." },
  { test: r => won(r) && r.medianPct >= 0.55, text: 'The 2014 Spurs: beat the field every week, then beat the bracket.' },
  { test: r => won(r) && r.medianPct >= 0.55, text: 'The 2008 Celtics: a banner and a regular season to match.' },
  { test: r => won(r) && r.medianPct < 0.5, text: 'The 2004 Pistons: a title without the regular-season shine.' },
  { test: r => won(r) && r.misses === 0, text: 'The 2011 Mavericks: always in the mix, and one ring fully earned.' },
  { test: r => won(r), text: 'The 2019 Raptors: one magical run, and it counts forever.' },
  { test: r => won(r), text: 'The 2016 Cavaliers: one title that changed everything.' },
  // No title yet
  { test: r => !won(r) && r.medianPct >= 0.55 && r.seconds.length, text: "Nash's Suns: elite every week, still chasing a ring." },
  { test: r => !won(r) && r.seconds.length, text: "Stockton and Malone's Jazz: made the Finals, no banner yet." },
  { test: r => !won(r) && r.medianPct >= 0.55, text: 'The 2010s Rockets: the numbers say contender, the bracket disagrees.' },
  { test: r => !won(r) && r.misses === 0, text: 'The 2010s Grizzlies: always in the playoffs, a tough out every spring.' },
  { test: r => !won(r) && r.misses === 0, text: 'The 2010s Hawks: a playoff team every year, never the favorite.' },
  { test: r => !won(r) && r.medianPct >= 0.45, text: 'The Pacers of the 2010s: competitive, never quite over the top.' },
  { test: r => !won(r) && r.medianPct < 0.2, text: 'The 2012 Bobcats: every loss is a lottery ticket.' },
  { test: r => !won(r) && r.lasts.length, text: 'The Process-era 76ers: trusting the process.' },
];
// Used in order when nothing above is still free, so no two managers share one.
const FALLBACKS = [
  'The 2000s Clippers: the arena is full of hope.',
  'The Kings of the 2010s: a rebuild in every sense.',
  'The Timberwolves before Edwards: waiting on the next leap.',
  "The 1990s Nets: talent on the roster, the wins still on the way.",
];
export function comparisons(rows) {
  const used = new Set();
  const out = {};
  for (const r of rows) {
    const pick = COMPARISONS.find(c => !used.has(c.text) && c.test(r))?.text ?? FALLBACKS.find(t => !used.has(t)) ?? FALLBACKS[0];
    used.add(pick);
    out[r.owner] = pick;
  }
  return out;
}

// ---------- Standings table ----------
// period: 'all' or a season. stage: 'regular' (head-to-head plus league-median
// games, as Sleeper counts them), 'playoffs' (championship bracket) or 'both'.
export function standings(DATA, { period = 'all', stage = 'regular' } = {}) {
  const seasons = DATA.seasons.filter(s => s.weeksPlayed && (period === 'all' || s.season === period)).map(s => s.season);
  const set = new Set(seasons);
  const types = stage === 'regular' ? ['R'] : stage === 'playoffs' ? ['P'] : ['R', 'P'];
  const h2h = headToHead(DATA, seasons, types);
  const withMedian = stage !== 'playoffs';
  const official = {};
  for (const m of DATA.medianGames ?? []) {
    if (!withMedian || !set.has(m.s)) continue;
    const r = (official[m.o] ??= { w: 0, l: 0, t: 0 });
    r[m.res === 'W' ? 'w' : m.res === 'L' ? 'l' : 't']++;
  }
  const med = medianResults(DATA, seasons);
  const place = finishes(DATA);
  const owners = [...new Set(DATA.seasons.filter(s => set.has(s.season)).flatMap(s => s.teams.map(t => t.owner)))];

  const rows = owners.map(o => {
    const h = h2h[o] ?? { w: 0, l: 0, t: 0, pf: 0, pa: 0, g: 0 };
    const x = official[o] ?? { w: 0, l: 0, t: 0 };
    const w = h.w + x.w;
    const l = h.l + x.l;
    const t = h.t + x.t;
    const mine = DATA.seasons.filter(s => set.has(s.season) && s.teams.some(tm => tm.owner === o));
    const titles = mine.filter(s => s.champion === o).length;
    const bySeason = mine.map(s => {
      const one = headToHead(DATA, [s.season], types)[o] ?? { w: 0, l: 0, t: 0, pf: 0, pa: 0, g: 0 };
      const m1 = medianResults(DATA, [s.season])[o] ?? { w: 0, l: 0, t: 0 };
      return { s: s.season, ...one, median: m1, place: place[s.season]?.[o], champion: s.champion === o, complete: s.status === 'complete' };
    });
    return {
      owner: o, w, l, t, g: w + l + t,
      pct: w + l + t ? (w + t / 2) / (w + l + t) : 0,
      pf: r1(h.pf), pa: r1(h.pa),
      pps: mine.length ? r1(h.pf / mine.length) : 0,
      titles, seasons: mine.length, median: med[o] ?? { w: 0, l: 0, t: 0 },
      bySeason,
    };
  });
  return { seasons, rows };
}
