// Finished weeks, scored right (Oct 26 2026). The moment a week ends, Sleeper's matchup feed
// loses locks (a starter's counted game becomes another game, or 0) and keeps changing after.
// Two things are true, though:
//   - the official standings (rosters settings.fpts / wins / losses / ties, cumulative), updated
//     once a week is processed (league settings.last_scored_leg);
//   - while a week is LIVE, the matchup feed's per-starter points (locks included).
// So every nightly run saves the official totals per leg (data/official-weeks.json) and, during a
// live week, a snapshot of every lineup (data/live-weeks.json). A finished regular-season week's
// team score = official total after that week minus after the week before. Each starter's locked
// points = one of his games that week (box scores), chosen so the starters add up to the official
// score, preferring a lock seen in the last snapshot, else his last game. Several equally good
// answers = the most likely one is used and the players are listed in the Scoring check.
// assets/corrections.js still wins over all of it. No DOM / Node APIs (runs in the job and a browser).

export const WEEKFIX_VERSION = 1;
const LIVE_WEEKS_KEPT = 4;

const r1 = n => Math.round((Number(n) || 0) * 10) / 10;
const tenth = n => Math.round((Number(n) || 0) * 10);
const fantasy = (stats, scoring) => Object.entries(scoring).reduce((sum, [k, v]) => sum + (Number(stats?.[k]) || 0) * v, 0);
const chicagoDate = iso => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(iso));

// ---------- Official totals ----------

// Saves the official cumulative totals as of `leg` (last_scored_leg): { owner: [pf, wins, losses, ties] }.
// Only when every team's games add up to leg x games per week (2 with the median game), so a
// half-updated standings table, or the playoffs (fpts stops at the regular season), are never saved.
export function recordOfficial(official, { season, leg, rosters, ownerOf, perWeek, playoffStart, at }) {
  if (!(leg >= 1) || leg >= playoffStart) return false;
  const t = {};
  for (const r of rosters ?? []) {
    const o = ownerOf[r.roster_id];
    const s = r.settings ?? {};
    if (!o) continue;
    const w = s.wins ?? 0, l = s.losses ?? 0, ti = s.ties ?? 0;
    if (w + l + ti !== leg * perWeek) return false;
    t[o] = [r1((s.fpts ?? 0) + (s.fpts_decimal ?? 0) / 100), w, l, ti];
  }
  if (!Object.keys(t).length) return false;
  const S = (official.seasons[season] ??= { legs: {}, weeks: {} });
  S.legs[leg] = { at, t };
  return true;
}

// Week w's official team scores, or null. Needs the totals after week w and after week w - 1;
// without the latter, `before` (the site's own scores for weeks 1..w-1 by owner) stands in.
// The scores must give the same wins as the official standings did that week (head-to-head from
// `pairs`, plus the median game when the league has one), else they aren't trusted.
export function officialWeek(official, season, w, { pairs, median, before = null }) {
  const legs = official.seasons?.[season]?.legs ?? {};
  const cur = legs[w]?.t;
  if (!cur) return null;
  const prev = w === 1 ? {} : legs[w - 1]?.t;
  if (!prev && !before) return null;
  const scores = {};
  const wins = {};
  for (const [o, x] of Object.entries(cur)) {
    const p = prev ? prev[o] ?? (w === 1 ? [0, 0, 0, 0] : null) : null;
    if (prev && !p) return null;
    scores[o] = r1(x[0] - (p ? p[0] : before[o] ?? NaN));
    wins[o] = p ? x[1] - p[1] : null;
    if (!Number.isFinite(scores[o])) return null;
  }
  const got = Object.fromEntries(Object.keys(scores).map(o => [o, 0]));
  for (const [a, b] of pairs) {
    if (scores[a] == null || scores[b] == null) return null;
    if (scores[a] > scores[b]) got[a]++;
    else if (scores[b] > scores[a]) got[b]++;
  }
  if (median) {
    const ps = Object.values(scores).sort((a, b) => a - b);
    const mid = ps.length / 2;
    const m = r1(ps.length % 2 ? ps[Math.floor(mid)] : (ps[mid - 1] + ps[mid]) / 2);
    for (const o of Object.keys(scores)) if (scores[o] > m) got[o]++;
  }
  if (Object.keys(scores).some(o => wins[o] != null && wins[o] !== got[o])) return null;
  return scores;
}

// ---------- Live snapshots ----------

// One snapshot of a live week's lineups: { at, t: { owner: { s: [starters], p: [counted points] } } }.
// Skipped before any game has counted. Only the newest LIVE_WEEKS_KEPT weeks of a season are kept.
// done = { pid: games he had FINISHED at that moment } (finishedGames: box rows of games the schedule
// calls complete), saved as g, so the solver knows exactly which games the counted points could be from.
export function recordLive(live, { season, week, at, matchups, ownerOf, done = null }) {
  const t = {};
  let any = false;
  for (const m of matchups ?? []) {
    const o = ownerOf[m.roster_id];
    if (!o) continue;
    const s = (m.starters ?? []).filter(pid => pid && pid !== '0');
    const p = s.map(pid => r1(m.starters_points?.[(m.starters ?? []).indexOf(pid)] ?? m.players_points?.[pid] ?? 0));
    if (p.some(x => x)) any = true;
    t[o] = done ? { s, p, g: s.map(pid => done[pid] ?? 0) } : { s, p };
  }
  if (!any) return false;
  for (const old of Object.keys(live.seasons)) if (old !== season) delete live.seasons[old];
  const S = (live.seasons[season] ??= {});
  const W = (S[week] ??= { runs: [] });
  const last = W.runs.at(-1);
  if (last && JSON.stringify(last.t) === JSON.stringify(t)) last.seen = at; // nothing new: just note the time
  else W.runs.push({ at, t });
  for (const w of Object.keys(S).map(Number).sort((a, b) => b - a).slice(LIVE_WEEKS_KEPT)) delete S[w];
  return true;
}

// Games each player has finished so far this week: his box-score rows (played: sp) whose game the
// NBA schedule calls complete (box rows carry no gp this season, so the schedule's status decides).
export async function finishedGames(season, week, fetchImpl = globalThis.fetch.bind(globalThis)) {
  const load = url => fetchImpl(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const [rows, slate] = await Promise.all([
    load(`https://api.sleeper.com/stats/nba/${season}/${week}?season_type=regular`),
    load(`https://api.sleeper.com/schedule/nba/regular/${season}`),
  ]);
  if (!Array.isArray(rows) || !Array.isArray(slate)) return null;
  const complete = new Set(slate.filter(g => g.status === 'complete').map(g => g.game_id));
  const out = {};
  for (const g of rows) {
    if (!/^\d+$/.test(g.player_id) || !(g.stats?.gp || g.stats?.sp) || !complete.has(g.game_id)) continue;
    out[g.player_id] = (out[g.player_id] ?? 0) + 1;
  }
  return out;
}

// ---------- Locked points ----------

// Per-game box scores for one week: pid -> [{ date, p }] (games he played, oldest first).
export async function weekGames(season, week, scoring, fetchImpl = globalThis.fetch.bind(globalThis)) {
  let res;
  for (let attempt = 0; attempt < 3 && !res?.ok; attempt++) {
    res = await fetchImpl(`https://api.sleeper.com/stats/nba/${season}/${week}?season_type=regular&t=${Date.now()}`).catch(() => null);
  }
  if (!res?.ok) return null;
  const out = {};
  for (const g of (await res.json()) ?? []) {
    if (!/^\d+$/.test(g.player_id) || !g.stats || !(g.stats.gp || g.stats.sp)) continue;
    (out[g.player_id] ??= []).push({ date: g.date, p: r1(fantasy(g.stats, scoring)) });
  }
  for (const list of Object.values(out)) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

// A starter's possible locked points, most likely first. pin = a corrections.js value (the only
// one). From the newest snapshot (strict): a lock seen there (his counted points = an earlier game
// while a later one had already been played; locks can't be undone) or no games left after it
// (his counted points then were final) = the only value. Otherwise every game he played, his last
// game first (the lock-in default). No games = 0.
function candidates(pid, games, snap, pin, strict) {
  if (pin != null) return { values: [tenth(pin)], from: 'pin' };
  const list = games[pid] ?? [];
  if (!list.length) return { values: [0], from: 'none' };
  const vals = [...new Set([...list].reverse().map(g => tenth(g.p)))];
  const i = snap ? snap.s.indexOf(pid) : -1;
  if (i >= 0) {
    const day = chicagoDate(snap.at);
    // Games finished when the snapshot was taken: saved counts (Sunday-evening runs), else by date.
    const played = snap.g ? list.slice(0, Math.min(snap.g[i] ?? 0, list.length)) : list.filter(g => g.date < day);
    const v = tenth(snap.p[i]);
    const at = played.map(g => tenth(g.p)).lastIndexOf(v);
    const done = played.length === list.length;
    // Right after a game, Sleeper can still count the game before it for a while (the Holmgren lag,
    // Oct 2026), so an earlier game only counts as a sure lock when a later game was finished on an
    // earlier day than the snapshot. Otherwise it's just the most likely value.
    const sure = at === played.length - 1 ? done : played.slice(at + 1).some(g => g.date < day);
    if (at >= 0 && (at < played.length - 1 || done)) {
      return strict && sure ? { values: [v], from: done ? 'final' : 'lock' } : { values: [v, ...vals.filter(x => x !== v)], from: 'snap' };
    }
  }
  return { values: vals, from: 'games' };
}

// Every combination of the starters' values that adds up to the target. The answer used = the one
// closest to each player's most likely value (fewest players off it, then lowest ranks); unsure =
// players whose value differs between combinations that fit, with every value that fits.
function fitLineup(starters, games, snap, target, pins, strict) {
  const opts = starters.map(pid => ({ pid, ...candidates(pid, games, snap, pins[pid], strict) }));
  const order = opts.map((_, i) => i).sort((a, b) => opts[b].values.length - opts[a].values.length);
  const lo = [], hi = [];
  for (let k = order.length; k >= 0; k--) {
    const rest = order.slice(k).map(i => opts[i].values);
    lo[k] = rest.reduce((s, v) => s + Math.min(...v), 0);
    hi[k] = rest.reduce((s, v) => s + Math.max(...v), 0);
  }
  const goal = tenth(target);
  const pick = new Array(opts.length);
  const seen = opts.map(() => new Set());
  let best = null;
  let fits = 0;
  const walk = (k, sum, miss, rank) => {
    if (sum + lo[k] > goal || sum + hi[k] < goal) return;
    if (k === order.length) {
      fits++;
      pick.forEach((r, i) => seen[i].add(r));
      if (!best || miss < best.miss || (miss === best.miss && rank < best.rank)) best = { miss, rank, pick: [...pick] };
      return;
    }
    const i = order[k];
    opts[i].values.forEach((v, r) => {
      pick[i] = r;
      walk(k + 1, sum + v, miss + (r ? 1 : 0), rank + r);
    });
  };
  walk(0, 0, 0, 0);
  if (!best) return { fits: 0, opts };
  return {
    fits, opts,
    players: opts.map((o, i) => [o.pid, o.values[best.pick[i]] / 10]),
    unsure: opts.map((o, i) => ({ pid: o.pid, options: [...seen[i]].map(r => o.values[r] / 10) })).filter(u => u.options.length > 1),
  };
}

// One team's finished week. lineups: starter lists to try, most trusted first (the newest
// snapshot's, then the feed's). pins: { pid: corrections.js points }. Returns { score, players:
// [[pid, p]], how, fits, unsure, games }: how = 'unique' (exactly one combination adds up), 'tie'
// (several do: the most likely one is used and the players listed for the owner), 'nofit'
// (nothing adds up). relaxed = the snapshot's values had to be loosened to fit (also listed).
export function settleTeam({ lineups, games, snap, target, pins = {} }) {
  const tried = [];
  for (const starters of lineups) {
    if (!starters?.length || tried.some(t => t.key === [...starters].sort().join())) continue;
    const key = [...starters].sort().join();
    let fit = fitLineup(starters, games, snap, target, pins, true);
    let relaxed = false;
    if (!fit.fits && snap) {
      const loose = fitLineup(starters, games, snap, target, pins, false);
      if (loose.fits) { fit = loose; relaxed = true; }
    }
    tried.push({ key, starters, fit, relaxed });
  }
  const fitting = tried.filter(t => t.fit.fits);
  const gamesOf = pids => Object.fromEntries(pids.map(pid => [pid, (games[pid] ?? []).map(g => [g.date, g.p])]));
  if (!fitting.length) {
    const t = tried[0];
    return {
      score: target, how: 'nofit', fits: 0, unsure: [],
      players: (t?.fit.opts ?? []).map(o => [o.pid, o.values[0] / 10]).filter(([, p]) => p),
      games: gamesOf(t?.starters ?? []),
    };
  }
  const t = fitting[0];
  // Another lineup that also adds up (a lineup change after the last snapshot?): say so.
  const other = fitting.slice(1).find(x => x.key !== t.key);
  const how = t.fit.fits === 1 && !other && !t.relaxed ? 'unique' : 'tie';
  return {
    score: target, how, fits: t.fit.fits, unsure: t.fit.unsure,
    ...(t.relaxed ? { relaxed: true } : {}),
    ...(other ? { otherLineup: other.starters } : {}),
    players: t.fit.players.filter(([, p]) => p),
    games: gamesOf([...t.starters, ...(other?.starters ?? [])]),
  };
}

// The newest snapshot of a week as { at, s, p } for one owner (null without one). Snapshots taken
// after the week's last game day (lastDay, Chicago date) are skipped: by then the feed may be broken.
export function lastSnap(live, season, week, owner, lastDay) {
  const runs = live?.seasons?.[season]?.[week]?.runs ?? [];
  for (let i = runs.length - 1; i >= 0; i--) {
    const x = runs[i].t[owner];
    if (!x || (lastDay && chicagoDate(runs[i].at) > lastDay)) continue;
    const at = runs[i].seen && (!lastDay || chicagoDate(runs[i].seen) <= lastDay) ? runs[i].seen : runs[i].at;
    return { at, s: x.s, p: x.p, g: x.g, t: true };
  }
  return null;
}

// Every finished regular-season week of a season in progress, scored from the official totals and
// the box scores (see the top of this file). Saves answers in official.seasons[season].weeks (redone
// only when the score or the corrections change) and returns { settled: { week: { rosterId: { score,
// players } } }, notes } (notes = Scoring check lines). weekly[i] = the matchup feed of week i + 1.
// fixScore(w, owner) = a corrections.js team score; fixPlayers(w, owner) = its { player name: points }
// for that team (pinned: the rest is solved around them). name(pid) = player name.
export async function settleWeeks({ official, live, season, weekly, ownerOf, lastWeek, playoffStart, median, scoring, fetchImpl, fixScore, fixPlayers, name, label }) {
  const settled = {};
  const notes = [];
  const S = official.seasons[season];
  if (!S) return { settled, notes };
  const plain = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  const before = {};
  const at = new Date().toISOString();
  for (let w = 1; w <= Math.min(lastWeek, playoffStart - 1); w++) {
    const rows = weekly[w - 1] ?? [];
    const byId = {};
    for (const m of rows) if (m.matchup_id != null) (byId[m.matchup_id] ??= []).push(ownerOf[m.roster_id]);
    const pairs = Object.values(byId).filter(p => p.length === 2);
    const scores = officialWeek(official, season, w, { pairs, median, before });
    if (!scores && S.legs[w]) notes.push(`${season} week ${w}: Sleeper's official standings after this week don't line up with the week's games, so the matchup feed's scores were used. Check that week's scores in the Sleeper app.`);
    const saved = (S.weeks[w] ??= {});
    let boxes;
    for (const m of rows) {
      const o = ownerOf[m.roster_id];
      const feed = r1(m.custom_points ?? m.points);
      before[o] = r1((before[o] ?? 0) + (fixScore(w, o) ?? scores?.[o] ?? feed));
      if (scores?.[o] == null) continue;
      const target = fixScore(w, o) ?? scores[o];
      const feedStarters = (m.starters ?? []).filter(pid => pid && pid !== '0');
      const fixes = Object.entries(fixPlayers(w, o) ?? {});
      const key = JSON.stringify([target, fixes]);
      let r = saved[o];
      if (!r || r.v !== WEEKFIX_VERSION || r.key !== key) {
        if (boxes === undefined) {
          boxes = await weekGames(season, w, scoring, fetchImpl);
          if (!boxes) notes.push(`${season} week ${w}: Sleeper's box scores didn't load, so the players' locked points come from the matchup feed tonight (tried again next run).`);
        }
        if (!boxes) r = { score: target };
        else {
          const lastDay = Object.values(boxes).flat().reduce((d, g) => (g.date > d ? g.date : d), '');
          const snap = lastSnap(live, season, w, o, lastDay);
          const pool = [...new Set([...(snap?.s ?? []), ...feedStarters, ...(m.players ?? [])])];
          const pins = {};
          for (const [wanted, p] of fixes) {
            const pid = pool.find(x => plain(name(x)) === plain(wanted));
            if (pid) pins[pid] = p;
          }
          r = saved[o] = { v: WEEKFIX_VERSION, key, at, snap: snap?.at ?? null, ...settleTeam({ lineups: [snap?.s, feedStarters], games: boxes, snap, target, pins }) };
        }
      }
      (settled[w] ??= {})[m.roster_id] = { score: r.score, players: r.players };
      // Unsure answers stay in the Scoring check until corrections.js pins those players.
      if (r.how !== 'tie' && r.how !== 'nofit') continue;
      const gamesText = pid => (r.games?.[pid] ?? []).map(([d, p]) => `${d.slice(5)} ${p}`).join(', ') || 'no games';
      const used = Object.fromEntries(r.players);
      const lines = [r.how === 'nofit'
        ? `${season} week ${w} ${label(o)} (official score ${r.score}): no combination of the starters' games adds up to the official score. Read every starter's points in the Sleeper app.`
        : `${season} week ${w} ${label(o)} (official score ${r.score}): the starters' games add up to ${r.score} in ${r.fits > 1 ? `${r.fits} different ways` : 'a way the last snapshot didn\'t expect'}. The site used the most likely one; read these players' points in the Sleeper app.`];
      for (const u of r.unsure) lines.push(`   ${name(u.pid)}: ${used[u.pid] ?? 0} used, could be ${u.options.filter(p => p !== (used[u.pid] ?? 0)).join(' or ')} (games: ${gamesText(u.pid)})`);
      if (r.relaxed) lines.push('   (The players\' points seen mid-week didn\'t fit the official score: check this team\'s whole lineup.)');
      if (r.otherLineup) lines.push(`   The lineup may have changed after the last snapshot: this lineup also adds up: ${r.otherLineup.map(name).join(', ')}.`);
      if (r.how === 'nofit') for (const [pid, p] of r.players) lines.push(`   ${name(pid)}: ${p} for now (games: ${gamesText(pid)})`);
      notes.push(lines.join('\n'));
    }
  }
  return { settled, notes };
}
