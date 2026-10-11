import { finishes } from './standings.js';

// Power Rankings. Each edition ranks the league as it stood after one week of
// the regular season, from four parts scored 0-100 (50 = league average):
//
//   REC  30%  Record: win % (league-median games included, as in Sleeper).
//   STR  35%  Scoring strength: half points per game against the league, half
//             all-play win % (how often they'd beat everyone else that week).
//   FORM 20%  Recent form: the same scoring measure over the last three weeks.
//   ROS  15%  Remaining schedule: how weak the opponents still to play are.
//
// Early in a season every part is pulled toward 50, since a couple of weeks
// can't tell you much. Record is pulled harder than scoring, because wins
// depend on opponents and take longer to mean something.

export const PARTS = [
  { id: 'rec', label: 'REC', name: 'Record', weight: 0.30 },
  { id: 'str', label: 'STR', name: 'Scoring strength', weight: 0.35 },
  { id: 'form', label: 'FORM', name: 'Recent form', weight: 0.20 },
  { id: 'ros', label: 'ROS', name: 'Schedule outlook', weight: 0.15 },
];

const EVIDENCE = { rec: 8, str: 3, form: 2, ros: 4 }; // weeks of evidence for half weight
const FORM_WEEKS = 3;

const clamp = x => Math.max(0, Math.min(100, x));
// Pull a 0-100 score toward 50 until there's enough evidence behind it.
const settle = (raw, n, k) => 50 + (raw - 50) * (n / (n + k));
const mean = xs => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

// Seasons with at least one regular-season week played, and those weeks.
export function powerSeasons(DATA) {
  return DATA.seasons.map(s => ({
    season: s.season,
    weeks: [...new Set(DATA.games.filter(g => g.s === s.season && g.t === 'R').map(g => g.w))].sort((a, b) => a - b),
    complete: s.status === 'complete',
    playoffStart: s.playoffStart,
  }));
}

// Scoring measure for a set of weeks: points per game against the league
// (as a z-score, 15 points per standard deviation) blended with all-play %.
function scoring(owner, weeks, weekScores) {
  const mine = [];
  let apW = 0;
  let apG = 0;
  const allPpg = {};
  for (const w of weeks) {
    const scores = weekScores[w];
    if (!scores || scores[owner] == null) continue;
    const p = scores[owner];
    mine.push(p);
    const others = Object.entries(scores).filter(([o]) => o !== owner).map(([, v]) => v);
    apW += others.filter(v => v < p).length + others.filter(v => v === p).length / 2;
    apG += others.length;
  }
  // League points per game over the same weeks, for the z-score.
  for (const w of weeks) for (const [o, p] of Object.entries(weekScores[w] ?? {})) (allPpg[o] ??= []).push(p);
  const ppgs = Object.values(allPpg).map(mean);
  const avg = mean(ppgs);
  const sd = Math.sqrt(mean(ppgs.map(x => (x - avg) ** 2))) || 1;
  const z = (mean(mine) - avg) / sd;
  return { n: mine.length, raw: clamp(0.5 * (50 + 15 * z) + 0.5 * (apG ? (apW / apG) * 100 : 50)), ppg: mean(mine) };
}

function edition(DATA, season, week) {
  const s = DATA.seasons.find(x => x.season === season);
  const games = DATA.games.filter(g => g.s === season && g.t === 'R' && g.w <= week);
  const medians = (DATA.medianGames ?? []).filter(m => m.s === season && m.w <= week);
  const weeks = [...new Set(games.map(g => g.w))].sort((a, b) => a - b);
  const recent = weeks.slice(-FORM_WEEKS);
  const owners = s.teams.map(t => t.owner);

  const weekScores = {};
  for (const g of games) Object.assign((weekScores[g.w] ??= {}), { [g.a]: g.ap, [g.b]: g.bp });

  const rows = owners.map(o => {
    let w = 0;
    let l = 0;
    let t = 0;
    const tally = res => { if (res === 'W') w++; else if (res === 'L') l++; else t++; };
    for (const g of games) {
      if (g.a !== o && g.b !== o) continue;
      const side = g.a === o ? 'a' : 'b';
      tally(g.win === 'tie' ? 'T' : g.win === side ? 'W' : 'L');
    }
    for (const m of medians) if (m.o === o) tally(m.res);
    const dec = w + l + t;
    const whole = scoring(o, weeks, weekScores);
    const form = scoring(o, recent, weekScores);
    return {
      owner: o, w, l, t,
      team: DATA.owners[o]?.teams?.[season] ?? DATA.owners[o]?.name,
      ppg: whole.ppg,
      rec: settle(dec ? ((w + t / 2) / dec) * 100 : 50, weeks.length, EVIDENCE.rec),
      str: settle(whole.raw, whole.n, EVIDENCE.str),
      form: settle(form.raw, form.n, EVIDENCE.form),
    };
  });

  // Schedule outlook: the average scoring strength of opponents still to play.
  // Weak opponents ahead score above 50; a finished schedule sits at 50.
  const strOf = Object.fromEntries(rows.map(r => [r.owner, r.str]));
  const lastRegular = (s.playoffStart ?? 99) - 1;
  for (const r of rows) {
    const ahead = (DATA.schedule ?? [])
      .filter(g => g.s === season && g.w > week && g.w <= lastRegular && (g.a === r.owner || g.b === r.owner))
      .map(g => strOf[g.a === r.owner ? g.b : g.a])
      .filter(v => v != null);
    r.remaining = ahead.length;
    r.ros = ahead.length ? settle(clamp(50 + (50 - mean(ahead)) * 2), ahead.length, EVIDENCE.ros) : 50;
    r.power = PARTS.reduce((sum, p) => sum + r[p.id] * p.weight, 0);
  }

  rows.sort((a, b) => b.power - a.power || b.ppg - a.ppg);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return { season, week, weeksPlayed: weeks.length, rows };
}

// An edition plus each team's movement since the previous week's edition.
export function powerRankings(DATA, season, week) {
  const now = edition(DATA, season, week);
  const weeks = powerSeasons(DATA).find(x => x.season === season)?.weeks ?? [];
  const prevWeek = weeks.filter(w => w < week).at(-1);
  if (prevWeek != null) {
    const before = Object.fromEntries(edition(DATA, season, prevWeek).rows.map(r => [r.owner, r.rank]));
    for (const r of now.rows) r.move = before[r.owner] != null ? before[r.owner] - r.rank : 0;
  }
  return now;
}

export function scheduleLabel(r) {
  if (!r.remaining) return 'Schedule complete';
  if (r.ros >= 53) return 'Easier schedule ahead';
  if (r.ros <= 47) return 'Tougher schedule ahead';
  return 'Balanced schedule';
}

// ---------- Preseason edition ----------
// Before any games, teams are ranked on paper (owner's request, Oct 2026):
//
//   LINEUP  60%  The best starting lineup today's roster can field, from Sleeper's
//                per-game projections for the season under the league's scoring.
//   DEPTH   10%  The next 4 best players: injury and rest insurance.
//   LAST YR 20%  Last season's final finish.
//   SCHED   10%  How strong the whole regular-season schedule is, by opponents' LINEUP.
//
// The lineup is saved nightly by build-data.js until the season starts, then kept
// as it stood (DATA.preseason[season]), so the edition never changes afterwards.

export const PRESEASON_PARTS = [
  { id: 'lineup', name: 'Projected lineup', short: 'LINEUP', weight: 0.60 },
  { id: 'depth', name: 'Bench depth', short: 'DEPTH', weight: 0.10 },
  { id: 'last', name: 'Last season', short: 'LAST YR', weight: 0.20 },
  { id: 'sched', name: 'Schedule', short: 'SCHED', weight: 0.10 },
];

// The projected weekly score is calibrated to real results (owner's choice, Oct
// 2026): each lineup's per-game projections are added up, then scaled so the
// league's average team matches last season's real average weekly score. The gaps
// between teams come from the projections; the level comes from what teams really
// scored. (Season projections assume a healthy lineup every week, so unscaled they
// ran about 17% high.)
export function calibrate(rows, games, season) {
  const prev = String(Number(season) - 1);
  const scores = games.filter(g => g.s === prev && g.t === 'R').flatMap(g => [g.ap, g.bp]);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const base = mean(rows.map(r => r.base));
  const factor = avg && base ? avg / base : 1;
  for (const r of rows) r.proj = Math.round(r.base * factor * 10) / 10;
  return { season: prev, avg: avg && Math.round(avg * 10) / 10, factor: Math.round(factor * 1000) / 1000 };
}

// Fill the league's starting slots from a roster: best players first, each into the
// most specific open slot he qualifies for. players: [{ pid, fp, pos: [...] }].
export function bestLineup(players, slots) {
  const fits = (slot, pos) => slot === 'UTIL' || pos.includes(slot)
    || (slot === 'G' && pos.some(p => p === 'PG' || p === 'SG'))
    || (slot === 'F' && pos.some(p => p === 'SF' || p === 'PF'));
  const order = s => (s === 'UTIL' ? 2 : s === 'G' || s === 'F' ? 1 : 0); // specific slots first
  const open = slots.map((slot, i) => ({ slot, i })).sort((a, b) => order(a.slot) - order(b.slot));
  const starters = [];
  const bench = [];
  for (const p of [...players].sort((a, b) => b.fp - a.fp)) {
    const k = open.findIndex(o => fits(o.slot, p.pos));
    if (k >= 0) starters.push({ ...p, slot: open.splice(k, 1)[0].slot });
    else bench.push(p);
  }
  return { starters, bench };
}

// The saved lineup for a season turned into an edition like the weekly ones.
export function preseasonRankings(DATA, season) {
  const pre = DATA.preseason?.[season];
  const s = DATA.seasons.find(x => x.season === season);
  if (!pre?.rows?.length || !s) return null;
  const z = vals => {
    const m = mean(vals);
    const sd = Math.sqrt(mean(vals.map(v => (v - m) ** 2))) || 1;
    return v => clamp(50 + 15 * ((v - m) / sd));
  };
  const lineupZ = z(pre.rows.map(r => r.proj));
  const depthZ = z(pre.rows.map(r => r.depth));
  const prev = DATA.seasons.filter(x => x.status === 'complete' && Number(x.season) < Number(season)).at(-1);
  const place = prev ? finishes(DATA)[prev.season] ?? {} : {};
  const n = prev?.teams.length ?? pre.rows.length;
  const rows = pre.rows.map(r => ({
    ...r,
    team: DATA.owners[r.owner]?.teams?.[season] ?? DATA.owners[r.owner]?.name,
    lineup: lineupZ(r.proj),
    depth: depthZ(r.depth),
    lastPlace: place[r.owner] ?? null,
    last: place[r.owner] ? 50 + 25 * (1 - (2 * (place[r.owner] - 1)) / Math.max(1, n - 1)) : 50,
  }));
  // Schedule: opponents' average LINEUP over the whole regular season (weak = above 50).
  const lineupOf = Object.fromEntries(rows.map(r => [r.owner, r.lineup]));
  const lastRegular = (s.playoffStart ?? 99) - 1;
  for (const r of rows) {
    const opp = (DATA.schedule ?? []).filter(g => g.s === season && g.w <= lastRegular && (g.a === r.owner || g.b === r.owner))
      .map(g => lineupOf[g.a === r.owner ? g.b : g.a]).filter(v => v != null);
    r.games = opp.length;
    r.sched = opp.length ? clamp(50 + (50 - mean(opp)) * 2) : 50;
    r.power = PRESEASON_PARTS.reduce((sum, p) => sum + r[p.id] * p.weight, 0);
  }
  rows.sort((a, b) => b.power - a.power || b.proj - a.proj);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return { season, at: pre.at, rows };
}
