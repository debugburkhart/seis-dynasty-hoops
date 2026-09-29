import { frontOffice } from './frontoffice.js';
import { finishes } from './standings.js';

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
  { id: 'players', title: 'Players & Lineups', icon: 'users',
    desc: 'Monster stat lines, position leaders and the managers who set the sharpest lineups night after night.' },
  { id: 'streaks', title: 'Streaks & Milestones', icon: 'flame',
    desc: 'Hot hands, cold spells, playoff runs that kept going and the long wait for a first banner.' },
  { id: 'front-office', title: 'Front Office', icon: 'gauge', table: true,
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

  // League-median games (seasons that have them). Like Sleeper, they count in
  // win-loss records; scoring records use the head-to-head games only.
  const medians = (DATA.medianGames ?? []).map(m => ({ o: m.o, p: m.p, res: m.res, s: m.s, w: m.w, t: 'M' }));
  const medianNote = medians.length
    ? `Includes league-median games (${[...new Set(medians.map(m => m.s))].join(', ')}), as Sleeper counts them.`
    : undefined;
  // Every regular-season result in order: each week's head-to-head game, then its median game.
  const results = [...reg, ...medians].sort((a, b) => chrono(a, b) || (a.t === 'M') - (b.t === 'M'));

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
    const a = (ts[`${x.s}|${x.o}`] ??= { s: x.s, o: x.o, g: 0, hw: 0, hl: 0, ht: 0, mw: 0, ml: 0, mt: 0, pf: 0, pa: 0, highs: 0, lows: 0, apW: 0, apG: 0, above: 0 });
    a.g++;
    a.pf += x.p;
    a.pa += x.op;
    a[x.res === 'W' ? 'hw' : x.res === 'L' ? 'hl' : 'ht']++;
    if (x.p === wk.max) a.highs++;
    if (x.p === wk.min) a.lows++;
    if (x.p > wk.median) a.above++;
    a.apW += wk.ps.filter(p => p < x.p).length + (wk.ps.filter(p => p === x.p).length - 1) / 2;
    a.apG += wk.ps.length - 1;
  }
  for (const x of medians) {
    const a = ts[`${x.s}|${x.o}`];
    if (a) a[x.res === 'W' ? 'mw' : x.res === 'L' ? 'ml' : 'mt']++;
  }
  const seasons = Object.values(ts).map(a => {
    const w = a.hw + a.mw;
    const l = a.hl + a.ml;
    const t = a.ht + a.mt;
    return {
      ...a, w, l, t,
      dec: w + l + t, // decisions: head-to-head games plus median games
      ppg: a.pf / a.g,
      apPct: a.apW / a.apG,
      // Luck only applies to head-to-head games; the median game has no schedule luck.
      luck: a.hw + a.ht / 2 - (a.apW / a.apG) * a.g,
    };
  });
  const done = seasons.filter(a => complete.has(a.s));

  // Career totals.
  const career = {};
  const c = o => (career[o] ??= { o, seasons: 0, titles: [], finals: 0, playoffs: 0, pw: 0, pl: 0, w: 0, l: 0, t: 0, dec: 0, g: 0, pf: 0, pa: 0, highs: 0, lows: 0, basement: [] });
  for (const a of seasons) {
    const k = c(a.o);
    for (const f of ['w', 'l', 't', 'dec', 'g', 'pf', 'pa', 'highs', 'lows']) k[f] += a[f];
  }
  // Teams that made the playoffs: the bracket field (byes included), or for
  // data saved before that was recorded, everyone who played a playoff game.
  const playoffField = s => new Set(s.playoffTeams
    ?? DATA.games.filter(g => g.s === s.season && g.t === 'P').flatMap(g => [g.a, g.b]));

  const finalPlaces = finishes(DATA);
  for (const s of played) {
    for (const t of s.teams) c(t.owner).seasons++;
    if (s.champion) c(s.champion).titles.push(s.season);
    if (s.champion) c(s.champion).finals++;
    if (s.runnerUp) c(s.runnerUp).finals++;
    for (const o of playoffField(s)) c(o).playoffs++;
    // Last in the final standings: the loser of the last-place game (a toilet
    // bowl), or the worst record if the season had no such game.
    if (complete.has(s.season)) {
      const place = finalPlaces[s.season] ?? {};
      const last = Object.keys(place).find(o => place[o] === s.teams.length);
      if (last) c(last).basement.push(s.season);
    }
  }
  for (const x of lines.filter(x => x.t === 'P')) {
    if (x.res === 'W') c(x.o).pw++;
    else c(x.o).pl++;
  }
  // Everyone who managed a team in these seasons (even with no games in the
  // current filter, e.g. playoff-only views).
  const careers = Object.values(career).filter(k => k.seasons || k.g);

  // A record: rows sorted best-first, ties share a rank.
  // R: records one manager can hold many times (a season, a game). Every row is
  //    kept; the page shows the top 10 (after any manager filter).
  // A: one row per manager, so every manager is listed, zeros included. Rows
  //    marked pending (didn't qualify yet) are listed last, unranked.
  // kind: 'mark' = a single performance (game, season, streak) that is broken by
  //    beating it; 'total' = a running career total that everyone adds to, where
  //    only a change of leader is news.
  // stage: which games the record is about ('regular', 'playoffs' or 'all'),
  //    used by the Stage filter. allTime: only meaningful across every season.
  const R = (title, rows, { note, asc = false, keepZero = false, all = false, kind = 'mark', stage = 'regular', allTime = false, scopeNote = false, ...extra } = {}) => {
    const pending = all ? rows.filter(r => r.pending) : [];
    rows = rows.filter(r => !r.pending && Number.isFinite(r.value) && (all || keepZero || r.value !== 0));
    rows.sort((a, b) => (asc ? a.value - b.value : b.value - a.value));
    rows.forEach((r, i) => { r.rank = i && rows[i - 1].value === r.value ? rows[i - 1].rank : i + 1; });
    return {
      title, note, asc, kind, stage, allTime, scopeNote, ...extra,
      limit: all ? null : 10,
      rows: [...rows, ...pending.map(r => ({ ...r, rank: '–' }))],
    };
  };
  const A = (title, rows, opts = {}) => R(title, rows, { ...opts, all: true });

  const byCategory = {};

  const PO = { stage: 'playoffs' };
  // A single season has at most 3 playoff games, so one season only needs 1.
  const oneSeason = DATA.view?.season && DATA.view.season !== 'all';
  const minPlayoffGames = oneSeason ? 1 : 3;
  byCategory.careers = [
    A('Most championships', careers.map(k => ({ who: k.o, value: k.titles.length, display: k.titles.length, ctx: k.titles.join(', ') })), PO),
    A('Most finals appearances', careers.map(k => ({ who: k.o, value: k.finals, display: k.finals, ctx: `${k.titles.length} won` })), PO),
    A('Most playoff appearances', careers.map(k => ({ who: k.o, value: k.playoffs, display: k.playoffs, ctx: `in ${k.seasons} season${k.seasons === 1 ? '' : 's'}` })), PO),
    A('Most playoff wins', careers.map(k => ({ who: k.o, value: k.pw, display: k.pw, ctx: `${rec(k.pw, k.pl, 0)} in the playoffs` })),
      { ...PO, note: 'Championship bracket games only.' }),
    A('Best playoff win %', careers.map(k => (k.pw + k.pl >= minPlayoffGames
      ? { who: k.o, value: k.pw / (k.pw + k.pl), display: pct(k.pw / (k.pw + k.pl)), ctx: rec(k.pw, k.pl, 0) }
      : { who: k.o, pending: true, display: '—', ctx: k.pw + k.pl ? `${rec(k.pw, k.pl, 0)} · not enough games` : 'no playoff games' })),
      { ...PO, note: `Minimum ${minPlayoffGames} championship bracket game${minPlayoffGames === 1 ? '' : 's'}.`, keepZero: true }),
    A('Most regular-season wins', careers.map(k => ({ who: k.o, value: k.w, display: k.w, ctx: rec(k.w, k.l, k.t) })), { note: medianNote }),
    A('Best regular-season win %', careers.map(k => ({ who: k.o, value: (k.w + k.t / 2) / k.dec, display: pct((k.w + k.t / 2) / k.dec), ctx: rec(k.w, k.l, k.t) })),
      { keepZero: true, note: medianNote }),
    A('Most regular-season points', careers.map(k => ({ who: k.o, value: k.pf, display: fmt(k.pf), ctx: `${k.g} games` }))),
    A('Most points per game', careers.map(k => ({ who: k.o, value: k.pf / k.g, display: fmt(k.pf / k.g), ctx: `${fmt(k.pf)} in ${k.g} games` })),
      { note: 'Regular season.' }),
    A('Most weekly high scores', careers.map(k => ({ who: k.o, value: k.highs, display: k.highs, ctx: `in ${k.g} weeks` })),
      { note: 'Top score in the league that week.' }),
    A('Most weekly low scores', careers.map(k => ({ who: k.o, value: k.lows, display: k.lows, ctx: `in ${k.g} weeks` })),
      { note: 'Bottom score in the league that week.' }),
    A('Most last-place finishes', careers.map(k => ({ who: k.o, value: k.basement.length, display: k.basement.length, ctx: k.basement.join(', ') })),
      { note: 'Last in the final standings: the loser of the last-place game.' }),
    A('Most points against', careers.map(k => ({ who: k.o, value: k.pa, display: fmt(k.pa), ctx: `${fmt(k.pa / k.g)} per game` })),
      { note: 'Regular season. Blame the schedule.' }),
  ];

  const sCtx = a => `${seasonLabel(a.s)} · ${rec(a.w, a.l, a.t)}`;
  const gamesIn = s => Math.max(0, ...done.filter(a => a.s === s).map(a => a.g));
  const fullLength = Math.max(0, ...done.map(a => a.g));
  const shortSeasons = [...new Set(done.map(a => a.s))].filter(s => gamesIn(s) < fullLength).map(s => `${s} had ${gamesIn(s)} games`);
  byCategory.seasons = [
    R('Most wins in a season', seasons.map(a => ({ who: a.o, value: a.w, display: a.w, ctx: sCtx(a) })), { note: medianNote }),
    R('Worst record in a season', done.map(a => ({ who: a.o, value: (a.w + a.t / 2) / a.dec, display: pct((a.w + a.t / 2) / a.dec), ctx: sCtx(a) })),
      { asc: true, keepZero: true, note: `Lowest win %. Completed seasons.${medianNote ? ` ${medianNote}` : ''}` }),
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
    R('Highest score', lines.map(x => ({ who: x.o, value: x.p, display: fmt(x.p), ctx: vs(x) })), { stage: 'all', scopeNote: true, note: 'Any game, playoffs included.' }),
    R('Lowest score', reg.map(x => ({ who: x.o, value: x.p, display: fmt(x.p), ctx: vs(x) })), { asc: true, note: 'Regular season.' }),
    R('Biggest blowout', games.filter(m => !m.tie).map(m => ({ who: m.win.o, value: m.margin, display: `+${fmt(m.margin)}`, ctx: `over ${name(m.lose.o)} · ${gCtx(m)}` })), { stage: 'all' }),
    R('Closest win', games.filter(m => !m.tie).map(m => ({ who: m.win.o, value: m.margin, display: `+${fmt(m.margin)}`, ctx: `over ${name(m.lose.o)} · ${gCtx(m)}` })),
      { stage: 'all', asc: true, keepZero: true, note: 'A 0-point margin means a playoff game settled by Sleeper\'s tiebreaker.' }),
    R('Highest combined score', games.map(m => ({ who: m.win.o, also: m.lose.o, whoText: `${name(m.g.a)} & ${name(m.g.b)}`, value: m.total, display: fmt(m.total), ctx: `${m.g.s} Wk ${m.g.w} · ${fmt(m.g.ap)}–${fmt(m.g.bp)}${m.g.label ? ` · ${m.g.label}` : ''}` })), { stage: 'all' }),
    R('Lowest combined score', regGames.map(m => ({ who: m.win.o, also: m.lose.o, whoText: `${name(m.g.a)} & ${name(m.g.b)}`, value: m.total, display: fmt(m.total), ctx: `${m.g.s} Wk ${m.g.w} · ${fmt(m.g.ap)}–${fmt(m.g.bp)}` })),
      { asc: true, note: 'Regular season.' }),
    R('Highest score in a loss', lines.filter(x => x.res === 'L').map(x => ({ who: x.o, value: x.p, display: fmt(x.p), ctx: `${vs(x)} · lost ${fmt(x.p)}–${fmt(x.op)}` })), { stage: 'all' }),
    R('Lowest score in a win', lines.filter(x => x.res === 'W').map(x => ({ who: x.o, value: x.p, display: fmt(x.p), ctx: `${vs(x)} · won ${fmt(x.p)}–${fmt(x.op)}` })), { stage: 'all', asc: true }),
    R('Highest playoff score', lines.filter(x => x.t === 'P').map(x => ({ who: x.o, value: x.p, display: fmt(x.p), ctx: vs(x) })), { ...PO, note: 'Championship bracket games.' }),
  ];

  // Streaks: best run per manager over their regular-season games in order (runs carry across seasons).
  const streak = (test, title, opts, source = reg) => A(title, careers.map(k => {
    const mine = source.filter(x => x.o === k.o);
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
    streak(x => x.res === 'W', 'Longest winning streak', { note: `Regular season, carried across seasons.${medianNote ? ` ${medianNote}` : ''}` }, results),
    streak(x => x.res === 'L', 'Longest losing streak', { note: `Regular season, carried across seasons.${medianNote ? ` ${medianNote}` : ''}` }, results),
    streak(x => x.p > week[`${x.s}-${x.w}`].median, 'Longest above-median streak', { note: 'Consecutive weeks scoring in the top half of the league.' }),
    A('Most consecutive playoff trips', careers.map(k => {
      let best = 0;
      let run = 0;
      let span = '';
      let from = null;
      for (const s of completedSeasons) {
        const inIt = playoffField(s).has(k.o);
        if (inIt) {
          run++;
          from ??= s.season;
          if (run > best) { best = run; span = from === s.season ? s.season : `${from}–${s.season}`; }
        } else { run = 0; from = null; }
      }
      return { who: k.o, value: best, display: best, ctx: span };
    }), { ...PO, allTime: true }),
    A('Longest active title drought', careers.filter(k => current.has(k.o)).map(k => {
      const mine = completedSeasons.filter(s => s.teams.some(t => t.owner === k.o));
      const last = k.titles.filter(s => complete.has(s)).at(-1);
      const since = mine.filter(s => !last || s.season > last).length;
      return { who: k.o, value: since, display: since, ctx: last ? `last title ${last}` : 'still chasing banner #1' };
    }), { ...PO, allTime: true, note: 'Completed seasons since their last championship. Current managers.' }),
    A('Fastest to 25 wins', careers.map(k => {
      const mine = results.filter(x => x.o === k.o);
      let wins = 0;
      for (let i = 0; i < mine.length; i++) {
        if (mine[i].res === 'W') wins++;
        if (wins === 25) return { who: k.o, value: i + 1, display: i + 1, ctx: `games · reached ${mine[i].s} Wk ${mine[i].w}` };
      }
      return { who: k.o, pending: true, display: '—', ctx: `${wins} wins in ${mine.length} games so far` };
    }), { asc: true, note: `Fewest regular-season games needed to reach 25 wins.${medianNote ? ` ${medianNote}` : ''}` }),
    A('400-point club', careers.map(k => {
      const big = reg.filter(x => x.o === k.o && x.p >= 400);
      return { who: k.o, value: big.length, display: big.length, ctx: big.length ? `best ${fmt(Math.max(...big.map(x => x.p)))}` : '' };
    }), { note: 'Most regular-season weeks with 400+ points.' }),
  ];

  // ---------- Players ----------
  // Built from locked points only: what a player scored while in a starting
  // lineup. Bench points never counted, so they're never included.
  const pl = DATA.players ?? {};
  const pname = pid => (pl[pid]?.n ?? `Player ${pid}`).replace(/\s*DUPLICATE\s*/i, ' (duplicate Sleeper entry)');
  const img = pid => `https://sleepercdn.com/content/nba/players/thumb/${pid}.jpg`;
  const forList = by => Object.entries(by).sort((a, b) => b[1] - a[1]).map(([o, p]) => `${name(o)} ${fmt(p)}`).join(', ');
  const pms = {}; // player + manager + season
  const pmc = {}; // player + manager, career
  const psn = {}; // player + season, any manager
  const pall = {}; // player, all time
  for (const x of DATA.playerWeeks ?? []) {
    const a = (pms[`${x.pid}|${x.o}|${x.s}`] ??= { pid: x.pid, o: x.o, s: x.s, p: 0, wks: 0 });
    a.p += x.p; a.wks++;
    const b = (pmc[`${x.pid}|${x.o}`] ??= { pid: x.pid, o: x.o, p: 0, wks: 0, seasons: new Set() });
    b.p += x.p; b.wks++; b.seasons.add(x.s);
    const s = (psn[`${x.pid}|${x.s}`] ??= { pid: x.pid, s: x.s, p: 0, by: {} });
    s.p += x.p; s.by[x.o] = (s.by[x.o] ?? 0) + x.p;
    const d = (pall[x.pid] ??= { pid: x.pid, weeks: new Set(), by: {}, wksBy: {} });
    d.weeks.add(`${x.s}-${x.w}`); d.by[x.o] = (d.by[x.o] ?? 0) + x.p; d.wksBy[x.o] = (d.wksBy[x.o] ?? 0) + 1;
  }
  const topOwner = by => Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0];
  const span = set => { const s = [...set].sort(); return s.length > 1 ? `${s[0]}–${s.at(-1)}` : s[0]; };
  const LOCKED = 'Locked points only: scored while in a starting lineup.';
  const P = { stage: 'all', note: LOCKED };

  const weekLabel = x => (x.t === 'P' || x.t === 'X') ? ` · ${gameLabel[`${x.s}|${x.w}|${x.o}`] ?? 'Playoffs'}` : '';
  const gameLabel = {};
  for (const g of DATA.games) if (g.label) gameLabel[`${g.s}|${g.w}|${g.a}`] = gameLabel[`${g.s}|${g.w}|${g.b}`] = g.label;

  byCategory.players = [
    R('Most points in a week', (DATA.playerWeeks ?? []).map(x => ({
      who: x.o, whoText: pname(x.pid), img: img(x.pid), value: x.p, display: fmt(x.p),
      ctx: `${x.s} Wk ${x.w} · for ${name(x.o)}${weekLabel(x)}`,
    })), P),
    R('Most points for one manager in a season', Object.values(pms).map(a => ({
      who: a.o, whoText: pname(a.pid), img: img(a.pid), value: a.p, display: fmt(a.p),
      ctx: `${seasonLabel(a.s)} · for ${name(a.o)} · ${a.wks} week${a.wks === 1 ? '' : 's'}`,
    })), P),
    R('Most points for one manager, career', Object.values(pmc).map(b => ({
      who: b.o, whoText: pname(b.pid), img: img(b.pid), value: b.p, display: fmt(b.p),
      ctx: `for ${name(b.o)} · ${span(b.seasons)} · ${b.wks} weeks`,
    })), { ...P, kind: 'total' }),
    ...['PG', 'SG', 'SF', 'PF', 'C'].map(pos => {
      const title = `Best ${pos} season`;
      const atPos = Object.values(psn).filter(s => pl[s.pid]?.pos === pos);
      const record = R(title, atPos.map(s => ({
        who: topOwner(s.by), whos: Object.keys(s.by), whoText: pname(s.pid), img: img(s.pid), value: s.p, display: fmt(s.p),
        ctx: `${seasonLabel(s.s)} · for ${forList(s.by)}`,
      })), { ...P, note: `Most locked points by a ${pos} in one season, and who rostered him. Positions are Sleeper's primary position.` });
      // For the Manager filter: each player's season split by team, counting only
      // the points he scored for that one manager (a traded player's season for
      // someone else doesn't count toward theirs). Ranked across every team.
      record.managerRows = R(title, atPos.flatMap(s => Object.entries(s.by).map(([o, p]) => ({
        who: o, whoText: pname(s.pid), img: img(s.pid), value: p, display: fmt(p),
        ctx: `${seasonLabel(s.s)} · for ${name(o)}${Object.keys(s.by).length > 1 ? ` (of ${fmt(s.p)} that season)` : ''}`,
      }))), P).rows;
      record.managerNote = `Only the locked points he scored for this manager count here. Positions are Sleeper's primary position.`;
      return record;
    }),
    R('Most-used players', Object.values(pall).map(d => ({
      who: topOwner(d.wksBy), whos: Object.keys(d.by), whoText: pname(d.pid), img: img(d.pid), value: d.weeks.size, display: d.weeks.size,
      ctx: `weeks in a lineup · ${Object.entries(d.wksBy).sort((a, b) => b[1] - a[1]).map(([o, n]) => `${name(o)} ${n}`).join(', ')}`,
    })), { ...P, kind: 'total', note: 'Weeks with locked points for any team.' }),
    R('Most-used by one manager', Object.values(pmc).map(b => ({
      who: b.o, whoText: pname(b.pid), img: img(b.pid), value: b.wks, display: b.wks,
      ctx: `weeks in ${name(b.o)}'s lineup · ${span(b.seasons)}`,
    })), { ...P, kind: 'total' }),
    R('Scored for the most teams', Object.values(pall).map(d => ({
      who: topOwner(d.by), whos: Object.keys(d.by), whoText: pname(d.pid), img: img(d.pid), value: Object.keys(d.by).length, display: Object.keys(d.by).length,
      ctx: `for ${forList(d.by)}`,
    })), { ...P, kind: 'total', note: 'Different managers he scored locked points for.' }),
  ];

  // ---------- Front office ----------
  // Valued from the whole league history (a move made in 2024 keeps earning
  // after 2024), while the Timeframe filter picks which moves are listed.
  const fo = frontOffice(DATA.all ?? DATA, DATA.view?.season ?? 'all');
  const est = (text, isEst) => (isEst ? `Est. ${text}` : text);
  const names = list => {
    const ns = list.map(a => (a.pick ? `${a.pick}${a.pid ? ` (${pname(a.pid)})` : ''}` : pname(a.pid)));
    return ns.length > 3 ? `${ns.slice(0, 3).join(', ')} +${ns.length - 3} more` : ns.join(', ');
  };
  const F = (group, desc, opts = {}) => ({ stage: 'all', group, desc, ...opts });
  const foManagers = careers.map(k => k.o);
  const byOwner = (list, f) => foManagers.map(o => ({ o, list: list.filter(x => x.o === o) })).map(f);
  const tradeSides = fo.trades.flatMap(t => t.sides.map(sd => ({ ...sd, s: t.s, w: t.w, partners: t.owners.filter(o => o !== sd.o) })));
  const sideCtx = sd => `${sd.s} Wk ${sd.w} with ${sd.partners.map(name).join(' & ')} · got ${names(sd.got) || 'nothing'} (${fmt(sd.gotValue)}) · gave ${names(sd.gave) || 'nothing'} (${fmt(sd.gaveValue)})`;
  // Draft records cover rookie drafts only. The 2023 startup draft still builds
  // the opening rosters and values startup picks that were traded, but it isn't
  // compared here: it was every veteran in the league, not a rookie class.
  const draftable = fo.picks.filter(p => !p.pending && p.kind === 'rookie');
  const classes = {};
  for (const p of draftable) (classes[`${p.s}|${p.o}`] ??= { s: p.s, o: p.o, kind: p.kind, picks: [] }).picks.push(p);
  const classList = Object.values(classes).map(c => ({ ...c, over: r1(c.picks.reduce((a, p) => a + p.over, 0)), est: c.picks.some(p => p.careerActive) }));
  const pickCtx = p => `${p.s} ${p.kind === 'startup' ? 'startup' : 'rookie'} draft · round ${p.round}, pick ${p.no} · ${fmt(p.career)} pts since (${fmt(p.value)} for ${name(p.o)}) vs ${fmt(p.expected)} round average`;

  byCategory['front-office'] = [
    A('Most trades', byOwner([], ({ o }) => ({ who: o, value: fo.activity[o]?.trades ?? 0, display: fo.activity[o]?.trades ?? 0, ctx: 'completed trades' })),
      F('Activity', 'Completed trades in the selected timeframe.', { kind: 'total' })),
    A('Most roster moves', byOwner([], ({ o }) => {
      const a = fo.activity[o] ?? {};
      return { who: o, value: a.moves ?? 0, display: a.moves ?? 0, ctx: `${a.pickups ?? 0} free agent · ${a.claims ?? 0} waiver · ${a.trades ?? 0} trade` };
    }), F('Activity', 'Free-agent pickups, waiver claims and trades.', { kind: 'total' })),
    R('Most frequent trade partners', fo.partners.map(p => ({
      who: p.a, also: p.b, whoText: `${name(p.a)} ⇄ ${name(p.b)}`, value: p.n, display: p.n, ctx: [...p.seasons].sort().join(', '),
    })), F('Trades', 'The pairs who kept finding reasons to make a deal.', { kind: 'total' })),
    A('Career trade value', byOwner(tradeSides, ({ o, list }) => {
      const net = r1(list.reduce((a, sd) => a + sd.net, 0));
      return { who: o, value: net, display: est(signed(net), list.some(sd => sd.est)), ctx: `${list.length} trade${list.length === 1 ? '' : 's'} · points gained minus points given up` };
    }), F('Trades', 'Net locked points from every trade: what they got produced for them, minus what they gave produced for the other side.', { kind: 'total', keepZero: true })),
    R('Biggest trade heist', tradeSides.map(sd => ({ who: sd.o, value: sd.net, display: est(signed(sd.net), sd.est), ctx: sideCtx(sd) })),
      F('Trades', 'One side of one deal, settled by everything that happened after.')),
    R('Costliest trade side', tradeSides.map(sd => ({ who: sd.o, value: sd.net, display: est(signed(sd.net), sd.est), ctx: sideCtx(sd) })),
      F('Trades', 'The deals whose receipts aged the worst.', { asc: true, bad: true })),
    A('Career pickup value', byOwner(fo.pickups, ({ o, list }) => {
      const v = r1(list.reduce((a, p) => a + p.value, 0));
      return { who: o, value: v, display: est(`+${fmt(v)}`, list.some(p => p.active)), ctx: `${list.length} pickup${list.length === 1 ? '' : 's'}` };
    }), F('Waivers & free agents', 'Locked points from every waiver claim and free-agent pickup.', { kind: 'total', keepZero: true })),
    R('Greatest pickup', fo.pickups.map(p => ({
      who: p.o, whoText: pname(p.pid), img: img(p.pid), value: p.value, display: est(`+${fmt(p.value)}`, p.active),
      ctx: `${p.s} Wk ${p.w} · ${p.src === 'waiver' ? 'waiver claim' : 'free agent'} by ${name(p.o)}`,
    })), F('Waivers & free agents', 'The pickup that returned the most locked points.')),
    R('The ones that got away', fo.letGo.map(p => ({
      who: p.o, whoText: pname(p.pid), img: img(p.pid), value: p.value, display: est(`−${fmt(p.value)}`, p.active),
      ctx: `dropped by ${name(p.o)} ${p.s} Wk ${p.w} · then ${fmt(p.value)} for ${name(p.to)}`,
    })), F('Waivers & free agents', 'Players dropped who went on to produce for the next team to grab them.', { bad: true })),
    R('Greatest draft pick', draftable.map(p => ({
      who: p.o, whoText: pname(p.pid), img: img(p.pid), value: p.over, display: est(signed(p.over), p.careerActive), ctx: `${name(p.o)} · ${pickCtx(p)}`,
    })), F('Draft', 'Locked points the rookie has scored since the draft (for any team), compared with the average pick in the same round of that draft.')),
    R('Biggest draft bust', draftable.map(p => ({
      who: p.o, whoText: pname(p.pid), img: img(p.pid), value: p.over, display: est(signed(p.over), p.careerActive), ctx: `${name(p.o)} · ${pickCtx(p)}`,
    })), F('Draft', 'The rookie picks that fell furthest short of their round.', { asc: true, bad: true })),
    A('Best career drafter', byOwner(draftable, ({ o, list }) => (list.length
      ? { who: o, value: r1(list.reduce((a, p) => a + p.over, 0) / list.length), display: signed(r1(list.reduce((a, p) => a + p.over, 0) / list.length)), ctx: `per pick, ${list.length} picks` }
      : { who: o, pending: true, display: '—', ctx: 'no scored picks' })), F('Draft', 'Average points above the round average, per rookie pick.', { kind: 'total', keepZero: true })),
    R('Best draft class', classList.map(c => ({
      who: c.o, value: c.over, display: est(signed(c.over), c.est), ctx: `${c.s} ${c.kind} draft · ${c.picks.length} picks · best: ${pname([...c.picks].sort((a, b) => b.over - a.over)[0].pid)}`,
    })), F('Draft', "A manager's picks in one rookie draft, added up against the round averages.")),
    R('Worst draft class', classList.map(c => ({
      who: c.o, value: c.over, display: est(signed(c.over), c.est), ctx: `${c.s} ${c.kind} draft · ${c.picks.length} picks`,
    })), F('Draft', 'The rookie classes that returned the least against the round averages.', { asc: true, bad: true })),
    A('Most points from draftees', byOwner(draftable, ({ o, list }) => {
      const v = r1(list.reduce((a, p) => a + p.value, 0));
      return { who: o, value: v, display: fmt(v), ctx: `from ${list.length} picks, while on their team` };
    }), F('Draft', 'Total locked points from rookies they drafted, while on their team.', { kind: 'total', keepZero: true })),
  ];

  const runningTotals = new Set(['Most consecutive playoff trips', 'Longest active title drought', '400-point club']);
  for (const r of byCategory.careers) r.kind = 'total';
  // Every Front Office value keeps growing as players score, so only a different
  // move or manager taking #1 counts as a record changing hands.
  for (const r of byCategory['front-office']) r.kind = 'total';
  for (const r of byCategory.streaks) if (runningTotals.has(r.title)) r.kind = 'total';

  return byCategory;
}

// ---------- Filters ----------
// The league narrowed to one season and/or one stage, for the Record Book's
// Timeframe and Stage filters. buildRecords() then runs on the narrowed data.
//   stage 'regular':  regular-season games (and median games) only
//   stage 'playoffs': championship-bracket games only
export function viewData(DATA, { season = 'all', stage = 'all' } = {}) {
  let games = DATA.games;
  let medianGames = DATA.medianGames ?? [];
  let playerWeeks = DATA.playerWeeks ?? [];
  let seasons = DATA.seasons;
  if (season !== 'all') {
    games = games.filter(g => g.s === season);
    medianGames = medianGames.filter(g => g.s === season);
    playerWeeks = playerWeeks.filter(g => g.s === season);
    seasons = seasons.filter(s => s.season === season);
  }
  if (stage === 'regular') {
    games = games.filter(g => g.t === 'R');
    playerWeeks = playerWeeks.filter(g => g.t === 'R');
  }
  if (stage === 'playoffs') {
    games = games.filter(g => g.t === 'P');
    playerWeeks = playerWeeks.filter(g => g.t === 'P');
    medianGames = [];
  }
  return { ...DATA, games, medianGames, playerWeeks, seasons, view: { season, stage }, all: DATA.all ?? DATA };
}

// Which records a filter shows: a record about regular-season games is hidden
// in the playoffs view and vice versa; all-time-only records need all seasons.
export function recordVisible(r, { season = 'all', stage = 'all' } = {}) {
  if (r.allTime && season !== 'all') return false;
  if (stage === 'all' || r.stage === 'all') return true;
  return r.stage === stage;
}

// ---------- Record history ----------
// Replays the league one week at a time, rebuilding the Record Book as it
// stood after each week, and notes every time a record changes hands.

// The league as it stood after week w of season s.
function asOf(DATA, s, w, lastWeek) {
  return {
    ...DATA,
    games: DATA.games.filter(g => g.s < s || (g.s === s && g.w <= w)),
    medianGames: (DATA.medianGames ?? []).filter(g => g.s < s || (g.s === s && g.w <= w)),
    playerWeeks: (DATA.playerWeeks ?? []).filter(g => g.s < s || (g.s === s && g.w <= w)),
    transactions: (DATA.transactions ?? []).filter(g => g.s < s || (g.s === s && g.w <= w)),
    drafts: (DATA.drafts ?? []).filter(d => d.s <= s),
    seasons: DATA.seasons.filter(x => x.season <= s).map(x => {
      if (x.season < s) return x;
      const finished = x.status === 'complete' && w >= lastWeek[x.season];
      return {
        ...x,
        status: finished ? 'complete' : 'in_season',
        weeksPlayed: Math.min(x.weeksPlayed, w),
        champion: finished ? x.champion : null,
        runnerUp: finished ? x.runnerUp : null,
        playoffTeams: x.playoffTeams && (w >= x.playoffStart ? x.playoffTeams : []),
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
