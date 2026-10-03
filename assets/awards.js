// Awards: each completed season's banner (champion, title game and Championship
// MVP) and its awards: GM of the Year, Player of the Year, League MVP and All-Stars.
//
// GM of the Year: the playoff team whose moves that season added the most
// locked points that season (regular season and playoffs). Moves made in other
// seasons, and points scored in other seasons, don't count, so the award is
// settled when the season ends.
//
//   Trades    locked points from what he received, minus what the other side
//             got from what he gave (the Value Desk net, this season only).
//             A draft pick counts as the player it became.
//   Pickups   waiver claims and free-agent adds that became regulars: at least
//             REGULAR_WEEKS weeks in his starting lineup this season.
//   Rookies   his rookie-draft picks' locked points for him.
//   Drops     minus what players he dropped scored for the next team, if they
//             became regulars there (same rule as pickups).

export const REGULAR_WEEKS = 3;

const r1 = n => Math.round(n * 10) / 10;

// fo: frontOffice(DATA) for all seasons.
export function gmOfTheYear(DATA, fo, season) {
  const lo = Number(season) * 100;
  const hi = lo + 99;
  const inSeason = weeks => (weeks ?? []).filter(w => w.k >= lo && w.k <= hi);
  const pts = weeks => r1(inSeason(weeks).reduce((sum, w) => sum + w.p, 0));
  const regular = weeks => inSeason(weeks).length >= REGULAR_WEEKS;

  const s = DATA.seasons.find(x => x.season === season);
  const rows = {};
  const row = o => (rows[o] ??= { o, trades: 0, pickups: 0, rookies: 0, drops: 0, moves: [] });
  for (const t of s?.teams ?? []) row(t.owner);

  for (const t of fo.trades.filter(x => x.s === season)) {
    for (const sd of t.sides) {
      const got = sd.got.reduce((sum, a) => sum + pts(a.weeks), 0);
      const gave = sd.gave.reduce((sum, a) => sum + pts(a.weeks), 0);
      const value = r1(got - gave);
      row(sd.o).trades += value;
      row(sd.o).moves.push({ kind: 'trade', w: t.w, value, got: sd.got, gave: sd.gave, with: t.owners.filter(o => o !== sd.o) });
    }
  }
  for (const p of fo.pickups.filter(x => x.s === season && regular(x.weeks))) {
    const value = pts(p.weeks);
    row(p.o).pickups += value;
    row(p.o).moves.push({ kind: p.src === 'waiver' ? 'claim' : 'pickup', w: p.w, value, pid: p.pid, starts: inSeason(p.weeks).length });
  }
  for (const p of fo.picks.filter(x => x.s === season && x.kind === 'rookie')) {
    const value = pts(p.weeks);
    if (!value) continue;
    row(p.o).rookies += value;
    row(p.o).moves.push({ kind: 'rookie', value, pid: p.pid, round: p.round, no: p.no });
  }
  for (const d of fo.letGo.filter(x => x.s === season && regular(x.weeks))) {
    const value = -pts(d.weeks);
    row(d.o).drops += value;
    row(d.o).moves.push({ kind: 'drop', w: d.w, value, pid: d.pid, to: d.to, starts: inSeason(d.weeks).length });
  }

  const eligible = new Set(s?.playoffTeams ?? []);
  const list = Object.values(rows).map(r => {
    for (const k of ['trades', 'pickups', 'rookies', 'drops']) r[k] = r1(r[k]);
    r.total = r1(r.trades + r.pickups + r.rookies + r.drops);
    r.eligible = eligible.has(r.o);
    r.moves.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    return r;
  }).sort((a, b) => b.eligible - a.eligible || b.total - a.total);
  return { season, rows: list, winner: list.find(r => r.eligible) ?? null };
}

// Player of the Year: the most locked points that season, regular season and
// playoffs, for every team he played for. Returns the top `n`, each with the
// team he scored the most for.
export function playerOfTheYear(DATA, season, n = 3) {
  const by = {};
  for (const x of DATA.playerWeeks ?? []) {
    if (x.s !== season) continue;
    const r = (by[x.pid] ??= { pid: x.pid, pts: 0, weeks: 0, teams: {} });
    r.pts += x.p;
    r.weeks++;
    r.teams[x.o] = (r.teams[x.o] ?? 0) + x.p;
  }
  return Object.values(by)
    .map(r => ({ ...r, pts: r1(r.pts), team: Object.entries(r.teams).sort((a, b) => b[1] - a[1])[0][0], multi: Object.keys(r.teams).length > 1 }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, n);
}

// League MVP: the most fantasy points over the whole NBA regular season under
// the league's scoring, whether or not anyone started him (DATA.mvp, saved by
// the nightly update from Sleeper's season stats).
export function mvpRace(DATA, season, n = 3) {
  return (DATA.mvp?.[season] ?? []).slice(0, n);
}

// All-Stars: the top 5 guards (PG/SG), forwards (SF/PF) and centers (C) by total
// fantasy points through the last game before the NBA All-Star break
// (DATA.allStars, worked out once per season by the nightly update).
// ALL_STAR_POSITIONS in corrections.js can change a player's position for a season.
export const POSITION_GROUPS = [['G', 'Guards'], ['F', 'Forwards'], ['C', 'Centers']];
const groupOf = pos => (/^(PG|SG|G)/.test(pos) ? 'G' : /^(SF|PF|F)/.test(pos) ? 'F' : /^C/.test(pos) ? 'C' : null);

export function allStars(DATA, season, overrides = {}) {
  const pool = DATA.allStars?.[season];
  if (!pool) return null;
  const fixes = overrides[season] ?? {};
  const players = pool.players.map(p => ({ ...p, group: fixes[DATA.players?.[p.pid]?.n] ?? groupOf(p.pos) }));
  const teams = Object.fromEntries(POSITION_GROUPS.map(([g]) => [g, players.filter(p => p.group === g).slice(0, 5)]));
  return { through: pool.through, asg: pool.asg, teams };
}

// Championship MVP: the champion's player with the most locked points in the title game.
export function championshipMvp(DATA, season) {
  const s = DATA.seasons.find(x => x.season === season);
  const final = DATA.games.find(g => g.s === season && g.label === 'Championship');
  if (!s?.champion || !final) return null;
  const top = (DATA.playerWeeks ?? [])
    .filter(x => x.s === season && x.w === final.w && x.o === s.champion && x.t === 'P')
    .sort((a, b) => b.p - a.p)[0];
  if (!top) return null;
  const teamPts = final.a === s.champion ? final.ap : final.bp;
  return { pid: top.pid, pts: top.p, share: teamPts ? top.p / teamPts : 0 };
}

// A completed season's banner: champion, title game and regular-season finish.
export function banner(DATA, season) {
  const s = DATA.seasons.find(x => x.season === season);
  const final = DATA.games.find(g => g.s === season && g.label === 'Championship');
  const champ = s.champion;
  const won = final && (final.a === champ ? { pts: final.ap, opp: final.b, oppPts: final.bp } : { pts: final.bp, opp: final.a, oppPts: final.ap });
  const pct = t => (t.w + t.t / 2) / Math.max(1, t.w + t.l + t.t);
  const table = [...s.teams].sort((a, b) => pct(b) - pct(a) || b.pf - a.pf);
  const seed = table.findIndex(t => t.owner === champ) + 1;
  const team = s.teams.find(t => t.owner === champ);
  return { season, champ, final, won, week: final?.w, seed, record: team && { w: team.w, l: team.l, t: team.t } };
}
