// Record Book. Every record is computed from the league data (data/league.json).
// Unless a record says otherwise it uses regular-season games only, the same
// games the nightly scoring check verifies against Sleeper's official standings.

export const CATEGORIES = [
  { id: 'careers', title: 'Careers', icon: 'crown',
    desc: 'Banners, win totals and scoring volume across every season, with per-game rates so shorter tenures get a fair look.' },
  { id: 'seasons', title: 'Seasons', icon: 'medal',
    desc: 'Single-season highs and lows, plus the all-play numbers that separate the truly great teams from the lucky ones.' },
  { id: 'matchups', title: 'Matchups', icon: 'target',
    desc: 'One-week box scores: the scoring explosions, the no-shows, the blowouts and the games decided at the buzzer.' },
  { id: 'players', title: 'Players & Lineups', icon: 'users', soon: true,
    desc: 'Monster stat lines, position leaders and the managers who set the sharpest lineups night after night.' },
  { id: 'streaks', title: 'Streaks & Milestones', icon: 'flame',
    desc: 'Hot hands, cold spells, playoff runs that kept going and the long wait for a first banner.' },
  { id: 'front-office', title: 'Front Office', icon: 'gauge', soon: true,
    desc: 'Draft hauls, trade verdicts and waiver-wire finds, judged by the points they actually produced.' },
];

const r1 = n => Math.round(n * 10) / 10;
const fmt = n => r1(n).toLocaleString('en-US', { maximumFractionDigits: 1 });
const pct = x => x.toFixed(3).replace(/^0/, '');
const rec = (w, l, t) => `${w}–${l}${t ? `–${t}` : ''}`;
const signed = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`;

export function buildRecords(DATA) {
  const name = id => DATA.owners[id]?.name ?? 'Unknown';
  const played = DATA.seasons.filter(s => s.weeksPlayed);
  const complete = new Set(DATA.seasons.filter(s => s.status === 'complete').map(s => s.season));
  const seasonLabel = s => (complete.has(s) ? s : `${s} (in progress)`);
  const chrono = (a, b) => a.s - b.s || a.w - b.w;

  // One line per team per game.
  const sides = g => [
    { o: g.a, p: g.ap, opp: g.b, op: g.bp, res: g.win === 'tie' ? 'T' : g.win === 'a' ? 'W' : 'L' },
    { o: g.b, p: g.bp, opp: g.a, op: g.ap, res: g.win === 'tie' ? 'T' : g.win === 'b' ? 'W' : 'L' },
  ];
  const lines = DATA.games.flatMap(g => sides(g).map(x => ({ ...x, s: g.s, w: g.w, t: g.t, label: g.label }))).sort(chrono);
  const reg = lines.filter(x => x.t === 'R');
  const vs = x => `${x.s} Wk ${x.w} vs ${name(x.opp)}${x.label ? ` · ${x.label}` : ''}`;

  // Every regular-season week: high, low, median, and all scores for all-play.
  const weeks = {};
  for (const x of reg) (weeks[`${x.s}-${x.w}`] ??= []).push(x.p);
  const week = {};
  for (const [k, ps] of Object.entries(weeks)) {
    ps.sort((a, b) => a - b);
    const m = ps.length / 2;
    week[k] = { ps, max: ps.at(-1), min: ps[0], median: ps.length % 2 ? ps[Math.floor(m)] : (ps[m - 1] + ps[m]) / 2 };
  }

  // Team-season totals.
  const ts = {};
  for (const x of reg) {
    const wk = week[`${x.s}-${x.w}`];
    const a = (ts[`${x.s}|${x.o}`] ??= { s: x.s, o: x.o, g: 0, w: 0, l: 0, t: 0, pf: 0, pa: 0, highs: 0, lows: 0, apW: 0, apG: 0, above: 0 });
    a.g++;
    a.pf += x.p;
    a.pa += x.op;
    a[x.res === 'W' ? 'w' : x.res === 'L' ? 'l' : 't']++;
    if (x.p === wk.max) a.highs++;
    if (x.p === wk.min) a.lows++;
    if (x.p > wk.median) a.above++;
    a.apW += wk.ps.filter(p => p < x.p).length + (wk.ps.filter(p => p === x.p).length - 1) / 2;
    a.apG += wk.ps.length - 1;
  }
  const seasons = Object.values(ts).map(a => ({
    ...a,
    ppg: a.pf / a.g,
    apPct: a.apW / a.apG,
    luck: a.w + a.t / 2 - (a.apW / a.apG) * a.g,
  }));
  const done = seasons.filter(a => complete.has(a.s));

  // Career totals.
  const career = {};
  const c = o => (career[o] ??= { o, seasons: 0, titles: [], finals: 0, playoffs: 0, pw: 0, pl: 0, w: 0, l: 0, t: 0, g: 0, pf: 0, pa: 0, highs: 0, lows: 0, basement: [] });
  for (const a of seasons) {
    const k = c(a.o);
    for (const f of ['w', 'l', 't', 'g', 'pf', 'pa', 'highs', 'lows']) k[f] += a[f];
  }
  for (const s of played) {
    for (const t of s.teams) c(t.owner).seasons++;
    if (s.champion) c(s.champion).titles.push(s.season);
    if (s.champion) c(s.champion).finals++;
    if (s.runnerUp) c(s.runnerUp).finals++;
    const inPlayoffs = new Set(DATA.games.filter(g => g.s === s.season && g.t === 'P').flatMap(g => [g.a, g.b]));
    for (const o of inPlayoffs) c(o).playoffs++;
    if (complete.has(s.season)) {
      const last = [...s.teams].sort((x, y) => x.w + x.t / 2 - (y.w + y.t / 2) || x.pf - y.pf)[0];
      if (last) c(last.owner).basement.push(s.season);
    }
  }
  for (const x of lines.filter(x => x.t === 'P')) {
    if (x.res === 'W') c(x.o).pw++;
    else c(x.o).pl++;
  }
  const careers = Object.values(career).filter(k => k.g);

  // A record: rows sorted best-first, ties share a rank.
  // R: records one manager can hold many times (a season, a game) keep the top 10.
  // A: one row per manager, so every manager is listed, zeros included. Rows
  //    marked pending (didn't qualify yet) are listed last, unranked.
  // kind: 'mark' = a single performance (game, season, streak) that is broken by
  // beating it; 'total' = a running career total that everyone adds to, where
  // only a change of leader is news.
  const R = (title, rows, { note, asc = false, keepZero = false, all = false, kind = 'mark' } = {}) => {
    const pending = all ? rows.filter(r => r.pending) : [];
    rows = rows.filter(r => !r.pending && Number.isFinite(r.value) && (all || keepZero || r.value !== 0));
    rows.sort((a, b) => (asc ? a.value - b.value : b.value - a.value));
    rows.forEach((r, i) => { r.rank = i && rows[i - 1].value === r.value ? rows[i - 1].rank : i + 1; });
    const kept = all ? rows : rows.slice(0, 10);
    return { title, note, asc, kind, rows: [...kept, ...pending.map(r => ({ ...r, rank: '–' }))] };
  };
  const A = (title, rows, opts = {}) => R(title, rows, { ...opts, all: true });

  const byCategory = {};

  byCategory.careers = [
    A('Most championships', careers.map(k => ({ who: k.o, value: k.titles.length, display: k.titles.length, ctx: k.titles.join(', ') }))),
    A('Most finals appearances', careers.map(k => ({ who: k.o, value: k.finals, display: k.finals, ctx: `${k.titles.length} won` }))),
    A('Most playoff appearances', careers.map(k => ({ who: k.o, value: k.playoffs, display: k.playoffs, ctx: `in ${k.seasons} season${k.seasons === 1 ? '' : 's'}` }))),
    A('Most playoff wins', careers.map(k => ({ who: k.o, value: k.pw, display: k.pw, ctx: `${rec(k.pw, k.pl, 0)} in the playoffs` })),
      { note: 'Championship bracket games only.' }),
    A('Best playoff win %', careers.map(k => (k.pw + k.pl >= 3
      ? { who: k.o, value: k.pw / (k.pw + k.pl), display: pct(k.pw / (k.pw + k.pl)), ctx: rec(k.pw, k.pl, 0) }
      : { who: k.o, pending: true, display: '—', ctx: k.pw + k.pl ? `${rec(k.pw, k.pl, 0)} · not enough games` : 'no playoff games yet' })),
      { note: 'Minimum 3 championship bracket games.', keepZero: true }),
    A('Most regular-season wins', careers.map(k => ({ who: k.o, value: k.w, display: k.w, ctx: rec(k.w, k.l, k.t) }))),
    A('Best regular-season win %', careers.map(k => ({ who: k.o, value: (k.w + k.t / 2) / k.g, display: pct((k.w + k.t / 2) / k.g), ctx: rec(k.w, k.l, k.t) })), { keepZero: true }),
    A('Most regular-season points', careers.map(k => ({ who: k.o, value: k.pf, display: fmt(k.pf), ctx: `${k.g} games` }))),
    A('Most points per game', careers.map(k => ({ who: k.o, value: k.pf / k.g, display: fmt(k.pf / k.g), ctx: `${fmt(k.pf)} in ${k.g} games` })),
      { note: 'Regular season.' }),
    A('Most weekly high scores', careers.map(k => ({ who: k.o, value: k.highs, display: k.highs, ctx: `in ${k.g} weeks` })),
      { note: 'Top score in the league that week.' }),
    A('Most weekly low scores', careers.map(k => ({ who: k.o, value: k.lows, display: k.lows, ctx: `in ${k.g} weeks` })),
      { note: 'Bottom score in the league that week.' }),
    A('Most last-place finishes', careers.map(k => ({ who: k.o, value: k.basement.length, display: k.basement.length, ctx: k.basement.join(', ') })),
      { note: 'Worst regular-season record in a completed season.' }),
    A('Most points against', careers.map(k => ({ who: k.o, value: k.pa, display: fmt(k.pa), ctx: `${fmt(k.pa / k.g)} per game` })),
      { note: 'Regular season. Blame the schedule.' }),
  ];

  const sCtx = a => `${seasonLabel(a.s)} · ${rec(a.w, a.l, a.t)}`;
  const gamesIn = s => Math.max(0, ...done.filter(a => a.s === s).map(a => a.g));
  const fullLength = Math.max(0, ...done.map(a => a.g));
  const shortSeasons = [...new Set(done.map(a => a.s))].filter(s => gamesIn(s) < fullLength).map(s => `${s} had ${gamesIn(s)} games`);
  byCategory.seasons = [
    R('Most wins in a season', seasons.map(a => ({ who: a.o, value: a.w, display: a.w, ctx: sCtx(a) }))),
    R('Worst record in a season', done.map(a => ({ who: a.o, value: (a.w + a.t / 2) / a.g, display: pct((a.w + a.t / 2) / a.g), ctx: sCtx(a) })),
      { asc: true, keepZero: true, note: 'Lowest win %. Completed seasons.' }),
    R('Most points in a season', seasons.map(a => ({ who: a.o, value: a.pf, display: fmt(a.pf), ctx: `${sCtx(a)} · ${a.g} games` })),
      { note: shortSeasons.length ? `Season lengths differ (${shortSeasons.join(', ')}), so see points per game too.` : undefined }),
    R('Most points per game in a season', seasons.map(a => ({ who: a.o, value: a.ppg, display: fmt(a.ppg), ctx: sCtx(a) }))),
    R('Fewest points per game in a season', done.map(a => ({ who: a.o, value: a.ppg, display: fmt(a.ppg), ctx: sCtx(a) })), { asc: true, note: 'Completed seasons.' }),
    R('Toughest schedule', seasons.map(a => ({ who: a.o, value: a.pa / a.g, display: fmt(a.pa / a.g), ctx: `${sCtx(a)} · points against per game` }))),
    R('Friendliest schedule', done.map(a => ({ who: a.o, value: a.pa / a.g, display: fmt(a.pa / a.g), ctx: `${sCtx(a)} · points against per game` })), { asc: true, note: 'Completed seasons.' }),
    R('Most weekly high scores in a season', seasons.map(a => ({ who: a.o, value: a.highs, display: a.highs, ctx: sCtx(a) }))),
    R('Most above-median weeks in a season', seasons.map(a => ({ who: a.o, value: a.above, display: a.above, ctx: `${seasonLabel(a.s)} · of ${a.g} weeks` }))),
    R('Best all-play record', seasons.map(a => ({ who: a.o, value: a.apPct, display: pct(a.apPct), ctx: `${seasonLabel(a.s)} · ${rec(Math.round(a.apW), Math.round(a.apG - a.apW), 0)} vs everyone` })),
      { note: 'Record if they had played every team every week.' }),
    R('Luckiest season', seasons.map(a => ({ who: a.o, value: a.luck, display: `${signed(a.luck)} W`, ctx: `${sCtx(a)} · all-play ${pct(a.apPct)}` })),
      { note: 'Actual wins minus the wins their all-play record says they earned.' }),
    R('Unluckiest season', seasons.map(a => ({ who: a.o, value: a.luck, display: `${signed(a.luck)} W`, ctx: `${sCtx(a)} · all-play ${pct(a.apPct)}` })),
      { asc: true, note: 'Actual wins minus the wins their all-play record says they earned.' }),
  ];

  const games = DATA.games.map(g => {
    const [x, y] = sides(g);
    const [win, lose] = x.res === 'W' ? [x, y] : [y, x];
    return { g, win, lose, tie: g.win === 'tie', margin: Math.abs(g.ap - g.bp), total: g.ap + g.bp };
  });
  const regGames = games.filter(m => m.g.t === 'R');
  const gCtx = m => `${m.g.s} Wk ${m.g.w} · ${fmt(m.win.p)}–${fmt(m.lose.p)}${m.g.label ? ` · ${m.g.label}` : ''}`;
  byCategory.matchups = [
    R('Highest score', lines.map(x => ({ who: x.o, value: x.p, display: fmt(x.p), ctx: vs(x) })), { note: 'Any game, playoffs included.' }),
    R('Lowest score', reg.map(x => ({ who: x.o, value: x.p, display: fmt(x.p), ctx: vs(x) })), { asc: true, note: 'Regular season.' }),
    R('Biggest blowout', games.filter(m => !m.tie).map(m => ({ who: m.win.o, value: m.margin, display: `+${fmt(m.margin)}`, ctx: `over ${name(m.lose.o)} · ${gCtx(m)}` }))),
    R('Closest win', games.filter(m => !m.tie).map(m => ({ who: m.win.o, value: m.margin, display: `+${fmt(m.margin)}`, ctx: `over ${name(m.lose.o)} · ${gCtx(m)}` })),
      { asc: true, keepZero: true, note: 'A 0-point margin means a playoff game settled by Sleeper\'s tiebreaker.' }),
    R('Highest combined score', games.map(m => ({ who: m.win.o, whoText: `${name(m.g.a)} & ${name(m.g.b)}`, value: m.total, display: fmt(m.total), ctx: `${m.g.s} Wk ${m.g.w} · ${fmt(m.g.ap)}–${fmt(m.g.bp)}${m.g.label ? ` · ${m.g.label}` : ''}` }))),
    R('Lowest combined score', regGames.map(m => ({ who: m.win.o, whoText: `${name(m.g.a)} & ${name(m.g.b)}`, value: m.total, display: fmt(m.total), ctx: `${m.g.s} Wk ${m.g.w} · ${fmt(m.g.ap)}–${fmt(m.g.bp)}` })),
      { asc: true, note: 'Regular season.' }),
    R('Highest score in a loss', lines.filter(x => x.res === 'L').map(x => ({ who: x.o, value: x.p, display: fmt(x.p), ctx: `${vs(x)} · lost ${fmt(x.p)}–${fmt(x.op)}` }))),
    R('Lowest score in a win', lines.filter(x => x.res === 'W').map(x => ({ who: x.o, value: x.p, display: fmt(x.p), ctx: `${vs(x)} · won ${fmt(x.p)}–${fmt(x.op)}` })), { asc: true }),
    R('Highest playoff score', lines.filter(x => x.t === 'P').map(x => ({ who: x.o, value: x.p, display: fmt(x.p), ctx: vs(x) })), { note: 'Championship bracket games.' }),
  ];

  // Streaks: best run per manager over their regular-season games in order (runs carry across seasons).
  const streak = (test, title, opts) => A(title, careers.map(k => {
    const mine = reg.filter(x => x.o === k.o);
    let best = { n: 0 };
    let run = null;
    for (const x of mine) {
      if (test(x)) {
        run = run ? { ...run, n: run.n + 1, end: x } : { n: 1, start: x, end: x };
        if (run.n > best.n) best = run;
      } else run = null;
    }
    const span = best.n ? `${best.start.s} Wk ${best.start.w} – ${best.end.s} Wk ${best.end.w}` : '';
    const active = best.n && run && best.end === mine.at(-1);
    return { who: k.o, value: best.n, display: best.n, ctx: `${span}${active ? ' · active' : ''}` };
  }), opts);

  const completedSeasons = DATA.seasons.filter(s => complete.has(s.season));
  const current = new Set(DATA.seasons.at(-1).teams.map(t => t.owner));
  byCategory.streaks = [
    streak(x => x.res === 'W', 'Longest winning streak', { note: 'Regular season, carried across seasons.' }),
    streak(x => x.res === 'L', 'Longest losing streak', { note: 'Regular season, carried across seasons.' }),
    streak(x => x.p > week[`${x.s}-${x.w}`].median, 'Longest above-median streak', { note: 'Consecutive weeks scoring in the top half of the league.' }),
    A('Most consecutive playoff trips', careers.map(k => {
      let best = 0;
      let run = 0;
      let span = '';
      let from = null;
      for (const s of completedSeasons) {
        const inIt = DATA.games.some(g => g.s === s.season && g.t === 'P' && (g.a === k.o || g.b === k.o));
        if (inIt) {
          run++;
          from ??= s.season;
          if (run > best) { best = run; span = from === s.season ? s.season : `${from}–${s.season}`; }
        } else { run = 0; from = null; }
      }
      return { who: k.o, value: best, display: best, ctx: span };
    })),
    A('Longest active title drought', careers.filter(k => current.has(k.o)).map(k => {
      const mine = completedSeasons.filter(s => s.teams.some(t => t.owner === k.o));
      const last = k.titles.filter(s => complete.has(s)).at(-1);
      const since = mine.filter(s => !last || s.season > last).length;
      return { who: k.o, value: since, display: since, ctx: last ? `last title ${last}` : 'still chasing banner #1' };
    }), { note: 'Completed seasons since their last championship. Current managers.' }),
    A('Fastest to 25 wins', careers.map(k => {
      const mine = reg.filter(x => x.o === k.o);
      let wins = 0;
      for (let i = 0; i < mine.length; i++) {
        if (mine[i].res === 'W') wins++;
        if (wins === 25) return { who: k.o, value: i + 1, display: i + 1, ctx: `games · reached ${mine[i].s} Wk ${mine[i].w}` };
      }
      return { who: k.o, pending: true, display: '—', ctx: `${wins} wins in ${mine.length} games so far` };
    }), { asc: true, note: 'Fewest regular-season games needed to reach 25 wins.' }),
    A('400-point club', careers.map(k => {
      const big = reg.filter(x => x.o === k.o && x.p >= 400);
      return { who: k.o, value: big.length, display: big.length, ctx: big.length ? `best ${fmt(Math.max(...big.map(x => x.p)))}` : '' };
    }), { note: 'Most regular-season weeks with 400+ points.' }),
  ];

  const runningTotals = new Set(['Most consecutive playoff trips', 'Longest active title drought', '400-point club']);
  for (const r of byCategory.careers) r.kind = 'total';
  for (const r of byCategory.streaks) if (runningTotals.has(r.title)) r.kind = 'total';

  return byCategory;
}

// ---------- Record history ----------
// Replays the league one week at a time, rebuilding the Record Book as it
// stood after each week, and notes every time a record changes hands.

// The league as it stood after week w of season s.
function asOf(DATA, s, w, lastWeek) {
  return {
    ...DATA,
    games: DATA.games.filter(g => g.s < s || (g.s === s && g.w <= w)),
    seasons: DATA.seasons.filter(x => x.season <= s).map(x => {
      if (x.season < s) return x;
      const finished = x.status === 'complete' && w >= lastWeek[x.season];
      return {
        ...x,
        status: finished ? 'complete' : 'in_season',
        weeksPlayed: Math.min(x.weeksPlayed, w),
        champion: finished ? x.champion : null,
        runnerUp: finished ? x.runnerUp : null,
      };
    }),
  };
}

const holderKey = x => x.whoText ?? x.who;
const leadersOf = r => (r?.rows ?? []).filter(x => x.rank === 1);

// Did this record change hands between two snapshots?
function change(before, now) {
  const top = leadersOf(now);
  const prev = leadersOf(before);
  if (!top.length || !prev.length) return null;
  if (!now.asc && (top[0].value === 0 || prev[0].value === 0)) return null; // nobody on the board yet
  const newcomers = top.filter(x => !prev.some(y => holderKey(y) === holderKey(x)));
  const kept = top.some(x => prev.some(y => holderKey(y) === holderKey(x)));

  if (now.kind === 'total') {
    if (!newcomers.length) return null;
    return { type: kept ? 'tied' : 'new-leader', holders: newcomers, prev };
  }
  const better = now.asc ? top[0].value < prev[0].value : top[0].value > prev[0].value;
  // A season still being played or a streak still running grows its own mark
  // every week; only the week it took the record is news. Pulling ahead of a
  // co-holder still counts as breaking it.
  const ongoing = prev.some(y => /in progress|active/.test(y.ctx ?? ''));
  const passedSomeone = prev.some(y => !top.some(x => holderKey(x) === holderKey(y)));
  if (better && !newcomers.length && ongoing && !passedSomeone) return null;
  if (better) return { type: 'broken', holders: top, prev };
  if (top[0].value === prev[0].value && newcomers.length) return { type: 'tied', holders: newcomers, prev };
  return null;
}

export const CHANGE_LABELS = { broken: 'Record broken', tied: 'Record tied', 'new-leader': 'New leader' };

// Every record change, oldest first: { cat, title, s, w, index, type, holders, prev }.
// `recent` is true for changes in the last few weeks of games played.
export function recordHistory(DATA, { recentWeeks = 3 } = {}) {
  const lastWeek = {};
  for (const g of DATA.games) lastWeek[g.s] = Math.max(lastWeek[g.s] ?? 0, g.w);
  const points = [...new Set(DATA.games.map(g => `${g.s}|${g.w}`))]
    .map(k => { const [s, w] = k.split('|'); return { s, w: Number(w) }; })
    .sort((a, b) => a.s.localeCompare(b.s) || a.w - b.w);

  const events = [];
  let prev = null;
  points.forEach((p, i) => {
    const snap = i === points.length - 1 ? DATA : asOf(DATA, p.s, p.w, lastWeek);
    const recs = buildRecords(snap);
    if (prev) {
      for (const [cat, list] of Object.entries(recs)) {
        for (const r of list) {
          const c = change(prev[cat]?.find(x => x.title === r.title), r);
          if (c) events.push({ ...c, cat, title: r.title, s: p.s, w: p.w, index: i });
        }
      }
    }
    prev = recs;
  });
  const cutoff = points.length - recentWeeks;
  // Keep only what the page shows, so the saved file stays small.
  const slim = x => ({ who: x.who, whoText: x.whoText, display: x.display, ctx: x.ctx });
  return events.map(e => ({
    cat: e.cat, title: e.title, s: e.s, w: e.w, type: e.type, recent: e.index >= cutoff,
    holders: e.holders.map(slim), prev: e.prev.map(slim),
  }));
}
