// Pulls every season of the league from Sleeper and flattens it into one object.
// Used by the nightly GitHub Action (scripts/update.mjs) and, if data/league.json
// is missing, by the browser as a live fallback.

import { CORRECTIONS } from './corrections.js';

const API = 'https://api.sleeper.com/v1';

const round1 = n => Math.round((Number(n) || 0) * 10) / 10;
const ordinal = n => n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n] || 'th');

export async function buildLeagueData(leagueId, fetchImpl = globalThis.fetch.bind(globalThis)) {
  // Sleeper's cache can serve stale matchup scores for weeks after the fact
  // (2025 week 17 came back 290-315 instead of the real 355-352), so every
  // request carries a unique value to force a fresh copy.
  const bust = Date.now();
  const get = async (path, fallback) => {
    const res = await fetchImpl(`${API}${path}?t=${bust}`);
    if (!res.ok) {
      if (fallback !== undefined) return fallback;
      throw new Error(`Sleeper returned ${res.status} for ${path}`);
    }
    return (await res.json()) ?? fallback;
  };

  const state = await get('/state/nba');
  const currentWeek = Math.max(state.week || 0, state.leg || 0);

  // Walk forward to the newest season. When the league renews, Sleeper creates
  // a new league whose previous_league_id points back at this one, so look
  // through the managers' leagues for next season to find it.
  let newest = leagueId;
  for (;;) {
    const lg = await get(`/league/${newest}`);
    const nextSeason = Number(lg.season) + 1;
    const users = await get(`/league/${newest}/users`, []);
    let renewed = null;
    for (const u of users) {
      const theirs = await get(`/user/${u.user_id}/leagues/nba/${nextSeason}`, []);
      renewed = theirs.find(l => l.previous_league_id === newest);
      if (renewed) break;
    }
    if (!renewed) break;
    newest = renewed.league_id;
  }

  // Walk back through previous seasons, oldest first.
  const chain = [];
  for (let id = newest; id && id !== '0';) {
    const lg = await get(`/league/${id}`);
    chain.unshift(lg);
    id = lg.previous_league_id;
  }

  const owners = {};
  const seasons = [];
  const games = [];
  const medianGames = [];
  const schedule = [];

  for (const lg of chain) {
    const season = lg.season;
    const st = lg.settings || {};
    const [users, rosters, bracket, losersBracket] = await Promise.all([
      get(`/league/${lg.league_id}/users`, []),
      get(`/league/${lg.league_id}/rosters`, []),
      get(`/league/${lg.league_id}/winners_bracket`, []),
      get(`/league/${lg.league_id}/losers_bracket`, []),
    ]);

    // Owners are tracked by Sleeper user ID so they carry across seasons.
    const userById = Object.fromEntries(users.map(u => [u.user_id, u]));
    const ownerOf = {};
    for (const r of rosters) {
      const oid = r.owner_id || `open-${r.roster_id}`;
      ownerOf[r.roster_id] = oid;
      const u = userById[oid];
      const o = (owners[oid] ??= { id: oid, name: u?.display_name || `Open Team ${r.roster_id}`, avatar: null, teams: {} });
      if (u) {
        o.name = u.display_name;
        o.avatar = u.avatar || null;
      }
      o.teams[season] = u?.metadata?.team_name || o.name;
    }

    // Which weeks are final. The in-progress week is left out.
    const playoffStart = st.playoff_week_start || 99;
    let lastWeek = st.last_scored_leg || 0;
    if (lg.status !== 'complete' && season === state.league_season) {
      if (state.season_type === 'pre') lastWeek = 0;
      else if (state.season_type === 'regular') lastWeek = Math.min(st.last_scored_leg ?? currentWeek - 1, currentWeek - 1);
    }
    lastWeek = Math.max(0, lastWeek);

    const weekly = await Promise.all(
      Array.from({ length: lastWeek }, (_, i) => get(`/league/${lg.league_id}/matchups/${i + 1}`, [])),
    );

    const pts = {}; // pts[week][rosterId]
    weekly.forEach((rows, i) => {
      const w = i + 1;
      pts[w] = {};
      const pairs = {};
      const fix = CORRECTIONS.find(c => c.season === season && c.week === w)?.scores ?? {};
      for (const m of rows) {
        const fixed = fix[owners[ownerOf[m.roster_id]]?.name];
        pts[w][m.roster_id] = round1(fixed ?? m.custom_points ?? m.points);
        if (m.matchup_id != null) (pairs[m.matchup_id] ??= []).push(m);
      }
      if (w >= playoffStart) return; // playoff games come from the bracket below
      const playing = [];
      for (const [x, y] of Object.values(pairs)) {
        if (!y) continue;
        const ap = pts[w][x.roster_id];
        const bp = pts[w][y.roster_id];
        if (!ap && !bp) continue;
        games.push({ s: season, w, t: 'R', a: ownerOf[x.roster_id], b: ownerOf[y.roster_id], ap, bp, win: ap > bp ? 'a' : bp > ap ? 'b' : 'tie' });
        playing.push(x, y);
      }
      // League-median game: every team also plays the week's median score, so a
      // top-half score is a second win. Sleeper counts these in the standings.
      if (st.league_average_match && playing.length) {
        const ps = playing.map(m => pts[w][m.roster_id]).sort((a, b) => a - b);
        const mid = ps.length / 2;
        const median = round1(ps.length % 2 ? ps[Math.floor(mid)] : (ps[mid - 1] + ps[mid]) / 2);
        for (const m of playing) {
          const p = pts[w][m.roster_id];
          medianGames.push({ s: season, w, o: ownerOf[m.roster_id], p, median, res: p > median ? 'W' : p < median ? 'L' : 'T' });
        }
      }
    });

    // The full regular-season schedule, including weeks not played yet, for the
    // Power Rankings' schedule outlook. Sleeper sets every pairing before the season.
    if (st.playoff_week_start) {
      const future = lg.status === 'complete' ? [] : await Promise.all(
        Array.from({ length: Math.max(0, playoffStart - 1 - lastWeek) }, (_, i) =>
          get(`/league/${lg.league_id}/matchups/${lastWeek + 1 + i}`, [])),
      );
      [...weekly.slice(0, playoffStart - 1), ...future].forEach((rows, i) => {
        const pairs = {};
        for (const m of rows) if (m.matchup_id != null) (pairs[m.matchup_id] ??= []).push(m.roster_id);
        for (const [x, y] of Object.values(pairs)) {
          if (y != null) schedule.push({ s: season, w: i + 1, a: ownerOf[x], b: ownerOf[y] });
        }
      });
    }

    // Playoffs. t: 'P' = championship bracket, 'X' = placement game (3rd, 5th...).
    const maxRound = Math.max(0, ...bracket.map(g => g.r));
    const roundLen = r => (st.playoff_round_type === 2 ? 2 : st.playoff_round_type === 1 && r === maxRound ? 2 : 1);
    const roundStart = r => {
      let w = playoffStart;
      for (let i = 1; i < r; i++) w += roundLen(i);
      return w;
    };
    let champion = null;
    let runnerUp = null;
    for (const g of bracket) {
      if (typeof g.t1 !== 'number' || typeof g.t2 !== 'number' || g.w == null) continue;
      const start = roundStart(g.r);
      const end = start + roundLen(g.r) - 1;
      if (end > lastWeek) continue;
      let ap = 0;
      let bp = 0;
      for (let w = start; w <= end; w++) {
        ap += pts[w]?.[g.t1] ?? 0;
        bp += pts[w]?.[g.t2] ?? 0;
      }
      const label = g.p === 1 ? 'Championship'
        : g.p ? `${ordinal(g.p)} place game`
        : g.r === maxRound - 1 ? 'Semifinal'
        : g.r === maxRound - 2 ? 'Quarterfinal'
        : `Playoff round ${g.r}`;
      games.push({
        s: season, w: start, t: g.p && g.p !== 1 ? 'X' : 'P', label,
        a: ownerOf[g.t1], b: ownerOf[g.t2], ap: round1(ap), bp: round1(bp),
        win: g.w === g.t1 ? 'a' : 'b',
      });
      if (g.p === 1) {
        champion = ownerOf[g.w];
        runnerUp = ownerOf[g.l];
      }
    }

    // Losers bracket (last-place game). Counts toward head-to-head, not playoff record.
    // Sleeper's bracket "winner" here can mean the loser advancing, so points decide it.
    for (const g of losersBracket) {
      if (typeof g.t1 !== 'number' || typeof g.t2 !== 'number') continue;
      const start = roundStart(g.r);
      const end = start + roundLen(g.r) - 1;
      if (end > lastWeek) continue;
      let ap = 0;
      let bp = 0;
      for (let w = start; w <= end; w++) {
        ap += pts[w]?.[g.t1] ?? 0;
        bp += pts[w]?.[g.t2] ?? 0;
      }
      if (!ap && !bp) continue;
      games.push({
        s: season, w: start, t: 'X', label: g.p === 1 ? 'Last place game' : 'Consolation',
        a: ownerOf[g.t1], b: ownerOf[g.t2], ap: round1(ap), bp: round1(bp),
        win: ap > bp ? 'a' : bp > ap ? 'b' : g.w === g.t1 ? 'a' : 'b',
      });
    }

    seasons.push({
      season,
      leagueId: lg.league_id,
      name: lg.name,
      status: lg.status,
      weeksPlayed: lastWeek,
      playoffStart,
      champion,
      runnerUp,
      medianGame: Boolean(st.league_average_match),
      // Every team in the championship bracket, including first-round byes
      // (a bye team's first game has one side that didn't come from an earlier round).
      // Sleeper shows a projected bracket all season, so only once playoffs start.
      playoffTeams: lastWeek < playoffStart ? [] : [...new Set(bracket
        .filter(g => g.p == null)
        .flatMap(g => [g.t1_from ? null : g.t1, g.t2_from ? null : g.t2])
        .filter(r => typeof r === 'number'))].map(r => ownerOf[r]),
      teams: rosters.map(r => ({
        owner: ownerOf[r.roster_id],
        rosterId: r.roster_id,
        team: owners[ownerOf[r.roster_id]].teams[season],
        w: r.settings?.wins ?? 0,
        l: r.settings?.losses ?? 0,
        t: r.settings?.ties ?? 0,
        pf: round1((r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100),
        pa: round1((r.settings?.fpts_against ?? 0) + (r.settings?.fpts_against_decimal ?? 0) / 100),
      })),
    });
  }

  const latest = chain.at(-1);
  return {
    generatedAt: new Date().toISOString(),
    leagueId: newest,
    name: latest.name,
    currentSeason: latest.season,
    seasons,
    owners,
    games,
    medianGames,
    schedule,
  };
}
