// Matchup Hype: each week's slate, the Matchup of the Week ("Main event") and
// fun labels like "Trap-game watch". A week is worked out only from games played
// before it, so its hype reads the same as the day it was announced. The page
// reveals a week only once it's under way (see revealedWeek in app.js).
//
// Every game gets a hype score out of 100 from four parts (each 0-100):
//
//   Quality    30%  How strong both teams are against the rest of the league that
//                   week (Power Rankings score; early in a season it leans on last
//                   season's finish): the two best teams = 100, an average pair = 50.
//   Closeness  25%  How evenly matched they are: within 2 Power points is dead even.
//   Stakes     25%  What the result means: the playoff race late in the season,
//                   or the bracket round in the playoffs.
//   History    20%  The rivalry: a close series, playoff and title meetings,
//                   a recent nail-biter, a long streak (boosted 1.5x, capped at 100).
//
// The highest score is the Main event (in the playoffs, the Championship always is).

import { powerRankings, powerSeasons, preseasonRankings } from './power.js';
import { finishes } from './standings.js';
import { MINOR_RIVALRIES, RIVALRIES, RIVALRIES_FROM, RIVALRY_BONUS } from './config.js';
import { playoffPicture } from './commish.js';

export const HYPE_PARTS = [
  { id: 'quality', name: 'Quality', weight: 0.30, desc: 'how strong both teams are' },
  { id: 'closeness', name: 'Closeness', weight: 0.25, desc: 'how evenly matched they are' },
  { id: 'stakes', name: 'Stakes', weight: 0.25, desc: 'what the result means for the standings or the bracket' },
  { id: 'history', name: 'History', weight: 0.20, desc: 'the rivalry: series balance, playoff and title meetings, streaks' },
];

// Bracket rounds are worth more the closer they are to the title.
const PLAYOFF_STAKES = { Championship: 100, Semifinal: 85, Quarterfinal: 75, 'Last place game': 60, '3rd place game': 40, '5th place game': 25 };

const MAX_LABELS = 4; // Main event included; the most important come first
const PEDIGREE_WEEKS = 6; // weeks until this season's results fully replace last season's finish
// Tuning for the Quality and Closeness parts (exported so variants can be tested).
//   quality: 'absolute' = 50 + (average Power - 50) x 3;
//            'relative' = 100 for the two best teams in the league that week, 50 for an average pair.
//   closeFree: Power gap that still counts as dead even; closePer: points lost per point of gap beyond it.
//   historyScale: multiplies the History part before it's capped at 100.
// Chosen with the owner (Oct 2026, "V5") so a 100 is reachable: a title game between the
// league's two best teams, within 2 Power points, with a deep rivalry. Tested on every past
// game: the 2025 final went from 81 to 91; regular-season games average about 46.
//   Rivalries (config.js, owner Oct 2026): a major rivalry adds RIVALRY_BONUS.major (10) and a
//   minor one RIVALRY_BONUS.minor (5) straight to the hype score (capped at 100), from RIVALRIES_FROM on.
export const TUNING = { quality: 'relative', closeFree: 2, closePer: 3.5, historyScale: 1.5 };

// A league rivalry, from the season they started: { name, level: 'major' | 'minor', bonus } or null.
export function isRivalry(season, a, b) {
  if (Number(season) < Number(RIVALRIES_FROM)) return null;
  const pair = ([x, y]) => (x === a && y === b) || (x === b && y === a);
  const major = RIVALRIES.find(pair);
  if (major) return { name: major[2] ?? 'Rivalry', level: 'major', bonus: RIVALRY_BONUS.major };
  const minor = MINOR_RIVALRIES.find(pair);
  return minor ? { name: minor[2] ?? 'Rivalry', level: 'minor', bonus: RIVALRY_BONUS.minor } : null;
}
const clamp = x => Math.max(0, Math.min(100, x));
const mean = xs => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const r1 = x => Math.round(x * 10) / 10;
const fmt = x => r1(x).toLocaleString('en-US', { maximumFractionDigits: 1 });
const rec = r => `${r.w}–${r.l}${r.t ? `–${r.t}` : ''}`;
const isBefore = (g, season, week) => Number(g.s) < Number(season) || (g.s === season && g.w < week);

// Things computed once per data load.
const CACHE = new WeakMap();
function cached(DATA) {
  let c = CACHE.get(DATA);
  if (!c) {
    const byGame = new Map();
    for (const x of DATA.playerWeeks ?? []) {
      const k = `${x.s}|${x.w}|${x.o}`;
      if (!byGame.has(k)) byGame.set(k, []);
      byGame.get(k).push(x);
    }
    c = {
      finishes: finishes(DATA),
      byGame,
      playerPts: (DATA.playerWeeks ?? []).map(x => x.p).sort((a, b) => a - b),
    };
    CACHE.set(DATA, c);
  }
  return c;
}

// Share of values in a sorted list below x (0-1).
function rankIn(sorted, x) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < x) lo = mid + 1; else hi = mid;
  }
  return sorted.length ? lo / sorted.length : 0;
}

// ---------- The standings entering a week ----------
// Win % with league-median games included (as in Sleeper), then points for.

export function standingsBefore(DATA, season, week) {
  const s = DATA.seasons.find(x => x.season === season);
  const by = {};
  for (const t of s?.teams ?? []) {
    by[t.owner] = { owner: t.owner, team: DATA.owners[t.owner]?.teams?.[season] ?? t.team, w: 0, l: 0, t: 0, pf: 0, scores: [], results: [] };
  }
  const games = DATA.games.filter(g => g.s === season && g.t === 'R' && g.w < week).sort((x, y) => x.w - y.w);
  for (const g of games) {
    for (const [o, mine, side] of [[g.a, g.ap, 'a'], [g.b, g.bp, 'b']]) {
      const r = by[o];
      if (!r) continue;
      const res = g.win === 'tie' ? 'T' : g.win === side ? 'W' : 'L';
      r[res === 'W' ? 'w' : res === 'L' ? 'l' : 't']++;
      r.pf += mine;
      r.scores.push(mine);
      r.results.push(res);
    }
  }
  for (const m of DATA.medianGames ?? []) {
    if (m.s === season && m.w < week && by[m.o]) by[m.o][m.res === 'W' ? 'w' : m.res === 'L' ? 'l' : 't']++;
  }
  const rows = Object.values(by);
  for (const r of rows) {
    r.dec = r.w + r.l + r.t;
    r.pct = r.dec ? (r.w + r.t / 2) / r.dec : 0;
    r.winsEq = r.w + r.t / 2;
    r.gp = r.scores.length;
    r.ppg = r.gp ? r.pf / r.gp : 0;
    r.form = mean(r.scores.slice(-3));
    // Current head-to-head streak (W or L), median games aside.
    const last = r.results.at(-1);
    let n = 0;
    for (let i = r.results.length - 1; i >= 0 && r.results[i] === last; i--) n++;
    r.streak = last && last !== 'T' ? { res: last, n } : null;
  }
  rows.sort((a, b) => b.pct - a.pct || b.pf - a.pf);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return { rows, by, weeks: new Set(games.map(g => g.w)).size };
}

// ---------- Head-to-head series entering a week ----------
// League-median games are not head-to-head, so they never count here.

export function seriesBefore(DATA, A, B, season, week) {
  const ms = DATA.games
    .filter(g => ((g.a === A && g.b === B) || (g.a === B && g.b === A)) && isBefore(g, season, week))
    .map(g => {
      const flip = g.a !== A;
      return { ...g, ap: flip ? g.bp : g.ap, bp: flip ? g.ap : g.bp, win: g.win === 'tie' ? 'tie' : (g.win === 'a') !== flip ? 'A' : 'B' };
    })
    .sort((x, y) => Number(x.s) - Number(y.s) || x.w - y.w);
  const count = (list, side) => list.filter(m => m.win === side).length;
  const part = list => ({ A: count(list, 'A'), B: count(list, 'B'), ties: count(list, 'tie'), n: list.length });
  let streak = null;
  for (let i = ms.length - 1; i >= 0; i--) {
    const w = ms[i].win;
    if (w === 'tie') break;
    if (!streak) streak = { who: w, n: 1 };
    else if (streak.who === w) streak.n++;
    else break;
  }
  return {
    meetings: ms,
    reg: part(ms.filter(m => m.t === 'R')),
    po: part(ms.filter(m => m.t === 'P')),
    other: part(ms.filter(m => m.t === 'X')),
    all: part(ms),
    titles: ms.filter(m => m.label === 'Championship'),
    last: ms.at(-1) ?? null,
    streak,
  };
}

// ---------- Team strength entering a week ----------
// The Power Rankings score after the previous week, blended with a starting point
// until PEDIGREE_WEEKS weeks have been played. The starting point is the preseason
// Power Rankings (current rosters + projections, saved nightly until week 1; owner,
// Oct 2026, so offseason trades and the rookie draft count from week 1), or, for
// seasons without a saved preseason edition (2023-2025), last season's final finish.

const preCache = new WeakMap();
function preseasonPower(DATA, season) {
  const byData = preCache.get(DATA) ?? new Map();
  preCache.set(DATA, byData);
  if (!byData.has(season)) {
    const pre = DATA.preseason?.[season] ? preseasonRankings(DATA, season) : null;
    byData.set(season, pre?.rows?.length ? Object.fromEntries(pre.rows.map(r => [r.owner, r.power])) : null);
  }
  return byData.get(season);
}

function strengthsBefore(DATA, season, week, owners) {
  const weeks = (powerSeasons(DATA).find(x => x.season === season)?.weeks ?? []).filter(w => w < week);
  const power = weeks.length ? Object.fromEntries(powerRankings(DATA, season, weeks.at(-1)).rows.map(r => [r.owner, r.power])) : {};
  const prev = DATA.seasons.filter(s => s.status === 'complete' && Number(s.season) < Number(season)).at(-1);
  const place = prev ? cached(DATA).finishes[prev.season] ?? {} : {};
  const size = prev?.teams.length ?? owners.length;
  const pre = preseasonPower(DATA, season);
  const k = Math.min(1, weeks.length / PEDIGREE_WEEKS);
  const out = {};
  for (const o of owners) {
    const p = place[o];
    const pedigree = p ? 50 + 12 * (1 - (2 * (p - 1)) / Math.max(1, size - 1)) : 50;
    const start = pre?.[o] ?? pedigree;
    out[o] = { str: (power[o] ?? 50) * k + start * (1 - k), prevPlace: p ?? null, prevSeason: prev?.season ?? null };
  }
  return { by: out, weeksIn: weeks.length, preseason: Boolean(pre) };
}

function playoffSpots(DATA, season) {
  const done = DATA.seasons.filter(s => s.playoffTeams?.length);
  const s = done.find(x => x.season === season) ?? done.at(-1);
  return s?.playoffTeams.length || 6;
}

// ---------- Pairings ----------

// The games of a week: played games (with scores) or the schedule for a week not played yet.
export function weekPairs(DATA, season, week) {
  const played = DATA.games.filter(g => g.s === season && g.w === week);
  if (played.length) return played.map(g => ({ a: g.a, b: g.b, t: g.t, label: g.label ?? null, final: { ap: g.ap, bp: g.bp, win: g.win } }));
  return (DATA.schedule ?? []).filter(g => g.s === season && g.w === week).map(g => ({ a: g.a, b: g.b, t: 'R', label: null, final: null }));
}

// Every week of a season that has games or a schedule, with a short label.
export function seasonWeeks(DATA, season) {
  const weeks = new Map();
  for (const g of DATA.schedule ?? []) if (g.s === season) weeks.set(g.w, null);
  for (const g of DATA.games) {
    if (g.s !== season) continue;
    if (g.t === 'P') weeks.set(g.w, g.label === 'Championship' ? 'Championship' : `${g.label}s`);
    else if (!weeks.has(g.w)) weeks.set(g.w, 'Playoffs');
  }
  return [...weeks].sort((a, b) => a[0] - b[0]).map(([w, label]) => ({ w, label }));
}

// ---------- The slate ----------

export function hypeSlate(DATA, season, week, pairs = weekPairs(DATA, season, week)) {
  const s = DATA.seasons.find(x => x.season === season);
  const owners = s.teams.map(t => t.owner);
  const table = standingsBefore(DATA, season, week);
  const { by: str, weeksIn, preseason: fromPre } = strengthsBefore(DATA, season, week, owners);
  // League-wide strength this week, for a relative Quality: the average team and the top two.
  const strs = owners.map(o => str[o]?.str ?? 50).sort((a, b) => b - a);
  const leagueStr = mean(strs);
  const top2 = mean(strs.slice(0, 2));
  const spots = playoffSpots(DATA, season);
  const lastRegular = (s.playoffStart ?? 99) - 1;
  const playoffs = week > lastRegular;
  const perWeek = s.medianGame ? 2 : 1; // decisions a team can gain per week
  const left = Math.max(0, lastRegular - week + 1); // regular-season weeks left, this one included
  const lateness = playoffs ? 1 : lastRegular > 1 ? Math.min(1, (week - 1) / (lastRegular - 1)) : 0;
  const name = o => DATA.owners[o]?.name ?? 'Unknown';

  // Playoff race, for the stakes and the race labels. Margins are in wins
  // (ties count half) against the first team out / the last team in.
  const inLine = table.rows[spots - 1]?.winsEq ?? 0;
  const firstOut = table.rows[spots]?.winsEq ?? -Infinity;
  const race = o => {
    const r = table.by[o];
    if (!r || playoffs || !r.dec) return null;
    const inside = r.rank <= spots;
    const margin = inside ? r.winsEq - firstOut : inLine - r.winsEq;
    return {
      inside, margin,
      clinched: inside && margin > left * perWeek,
      out: !inside && margin > left * perWeek,
      mustWin: !inside && margin > (left - 1) * perWeek && margin <= left * perWeek,
    };
  };

  // What counts as a blowout in this league (the biggest tenth of regular-season
  // margins so far) and a nail-biter (the closest quarter).
  const margins = DATA.games.filter(g => g.t === 'R' && isBefore(g, season, week)).map(g => Math.abs(g.ap - g.bp)).sort((a, b) => a - b);
  const bigMargin = margins.length >= 8 ? margins[Math.floor(margins.length * 0.9)] : Infinity;
  const recent = m => Number(m.s) >= Number(season) - 1; // this season or last
  const closeMargin = margins.length >= 8 ? margins[Math.floor(margins.length * 0.25)] : 0;

  const games = pairs.map(p => {
    // The better-placed team goes first (or the stronger one before any games).
    const ra = table.by[p.a];
    const rb = table.by[p.b];
    const swap = table.weeks ? (rb?.rank ?? 99) < (ra?.rank ?? 99) : (str[p.b]?.str ?? 50) > (str[p.a]?.str ?? 50);
    const A = swap ? p.b : p.a;
    const B = swap ? p.a : p.b;
    const final = p.final && (swap ? { ap: p.final.bp, bp: p.final.ap, win: p.final.win === 'tie' ? 'tie' : p.final.win === 'a' ? 'B' : 'A' }
      : { ap: p.final.ap, bp: p.final.bp, win: p.final.win === 'tie' ? 'tie' : p.final.win === 'a' ? 'A' : 'B' });
    const tA = table.by[A];
    const tB = table.by[B];
    const sA = str[A]?.str ?? 50;
    const sB = str[B]?.str ?? 50;
    const series = seriesBefore(DATA, A, B, season, week);
    const raceA = race(A);
    const raceB = race(B);
    const gap = Math.abs(sA - sB);
    const fav = sA >= sB ? A : B;
    const dog = fav === A ? B : A;
    const side = o => (o === A ? 'A' : 'B');
    const live = x => x && !x.clinched && !x.out;
    const n = table.rows.length;
    const both = f => f(tA) && f(tB);

    // ----- The four parts -----
    const quality = TUNING.quality === 'relative'
      ? clamp(50 + (50 * (mean([sA, sB]) - leagueStr)) / Math.max(3, top2 - leagueStr))
      : clamp(50 + (mean([sA, sB]) - 50) * 3);
    const closeness = clamp(100 - Math.max(0, gap - TUNING.closeFree) * TUNING.closePer);
    const rel = x => (!x ? 0.5 : x.clinched || x.out ? 0.1 : 1 / (1 + Math.max(0, x.margin) / perWeek));
    const heavy = table.weeks >= 3 && both(r => r.rank <= 3);
    const unbeaten = table.weeks >= 3 && [tA, tB].some(r => r.dec >= 4 && r.l === 0);
    let stakes;
    if (p.t !== 'R') stakes = PLAYOFF_STAKES[p.label] ?? (p.t === 'P' ? 75 : 20);
    else stakes = clamp(20 + 60 * lateness * mean([rel(raceA), rel(raceB)]) + (heavy ? 12 : 0) + (unbeaten ? 8 : 0) + (week === 1 ? 10 : 0));
    let history = 0;
    if (series.all.n) {
      const decided = series.all.A + series.all.B;
      if (decided) history += 30 * (1 - Math.abs(series.all.A - series.all.B) / decided) * Math.min(1, decided / 4);
      history += 15 * Math.min(2, series.po.n);
      if (series.titles.length) history += 25;
      const lm = series.last;
      if (lm && Math.abs(lm.ap - lm.bp) <= closeMargin) history += 10;
      if (lm && lm.t === 'P') history += 10;
      if (series.streak?.n >= 3) history += 10;
    }
    const rivalry = isRivalry(season, A, B);
    history = clamp(history * TUNING.historyScale);
    const parts = { quality, closeness, stakes, history };
    const hype = Math.min(100, Math.round(HYPE_PARTS.reduce((sum, x) => sum + parts[x.id] * x.weight, 0)) + (rivalry?.bonus ?? 0));

    // ----- Labels, most important first -----
    const labels = [];
    const add = (id, text, why, tone = 'navy') => labels.push({ id, text, why, tone });
    const lm = series.last;
    const lmWhen = m => `${m.s} Week ${m.w}${m.label ? ` (${m.label})` : ''}`;
    const winnerOf = m => (m.win === 'A' ? A : B);
    const loserOf = m => (m.win === 'A' ? B : A);

    if (p.label === 'Championship') add('title', 'Title game', 'Winner takes the championship.', 'gold');
    else if (p.label === 'Last place game') add('toilet', 'Toilet bowl', 'The lower score finishes last in the league. Nobody wants this one.', 'red');
    else if (p.t === 'P') add('elim', 'Win or go home', `${p.label}: the loser's season is over.`, 'red');
    else if (p.t === 'X') add('consolation', p.label ?? 'Consolation', 'Playing for final position in the standings.');
    if (rivalry) add('rivalry', rivalry.name, `${rivalry.level === 'major' ? 'League rivalry' : 'Minor rivalry'}: ${name(A)} vs ${name(B)}. +${rivalry.bonus} hype.`, rivalry.level === 'major' ? 'red' : 'gold');

    if (series.titles.length) {
      const t = series.titles.at(-1);
      add('title-rematch', 'Title rematch', `They met in the ${t.s} championship; ${name(winnerOf(t))} won ${fmt(Math.max(t.ap, t.bp))}–${fmt(Math.min(t.ap, t.bp))}.`, 'gold');
    }
    for (const [o, x] of [[A, raceA], [B, raceB]]) {
      if (x?.mustWin && left > 0) add(`must-${side(o)}`, 'Must-win', `${name(o)} is ${fmt(x.margin)} win${x.margin === 1 ? '' : 's'} out of a playoff spot with ${left} week${left === 1 ? '' : 's'} left. Lose this week and the math runs out.`, 'red');
    }
    if (!playoffs && left <= 9 && live(raceA) && live(raceB) && raceA.margin <= 2 * perWeek && raceB.margin <= 2 * perWeek) {
      add('bubble', 'Bubble battle', `Both teams are within ${2 * perWeek} wins of the playoff line (${spots} spots) with ${left} week${left === 1 ? '' : 's'} left.`, 'red');
    }
    if (heavy) add('heavy', 'Heavyweight bout', `No. ${tA.rank} vs No. ${tB.rank} in the standings.`, 'gold');
    for (const r of [tA, tB]) {
      if (table.weeks >= 3 && r.dec >= 4 && r.l === 0) add(`perfect-${r.owner}`, 'Perfect season on the line', `${name(r.owner)} is ${rec(r)}. ${name(r.owner === A ? B : A)} can hand them a first loss.`, 'gold');
    }

    // Trap game: a clear favorite with a reason to slip.
    if (p.t === 'R' && weeksIn >= 2 && gap >= 8) {
      const signs = [];
      if (lm && winnerOf(lm) === dog) signs.push(`${name(dog)} won the last meeting (${lmWhen(lm)})`);
      else if (series.all[side(dog)] > series.all[side(fav)]) signs.push(`${name(dog)} leads the all-time series ${series.all[side(dog)]}–${series.all[side(fav)]}`);
      const fd = table.by[dog];
      const ff = table.by[fav];
      if (fd?.gp >= 2 && ff?.gp >= 2 && fd.form > ff.form) signs.push(`${name(dog)} has outscored them over the last three weeks (${fmt(fd.form)} vs ${fmt(ff.form)} a week)`);
      const next = (DATA.schedule ?? []).find(g => g.s === season && g.w === week + 1 && (g.a === fav || g.b === fav));
      const nextOpp = next && (next.a === fav ? next.b : next.a);
      const nextRank = nextOpp && table.by[nextOpp]?.rank;
      if (week + 1 <= lastRegular && nextRank && nextRank <= 2 && table.weeks >= 3) signs.push(`${name(fav)} has No. ${nextRank} ${name(nextOpp)} on deck next week`);
      if (signs.length) {
        const a = str[fav].str;
        const b = str[dog].str;
        add('trap', 'Trap-game watch', `${name(fav)} is the clear favorite (strength ${Math.round(a)} vs ${Math.round(b)}), but ${signs.join(', and ')}.`, 'red');
      }
    }
    if (lm && lm.win !== 'tie' && recent(lm)) {
      const loser = loserOf(lm);
      const margin = Math.abs(lm.ap - lm.bp);
      if (lm.t === 'P') add('revenge', 'Revenge game', `${name(winnerOf(lm))} knocked ${name(loser)} out in ${lmWhen(lm)}.`);
      else if (margin >= bigMargin) add('revenge', 'Revenge game', `${name(loser)} lost the last meeting by ${fmt(margin)} (${lmWhen(lm)}).`);
    }
    const lastPo = series.meetings.filter(x => x.t === 'P').at(-1);
    const revengeForIt = lastPo && lastPo === lm && labels.some(l => l.id === 'revenge');
    if (series.po.n && !series.titles.length && !revengeForIt) {
      const m = lastPo;
      add('po-rematch', 'Playoff rematch', `They met in the ${m.s} ${m.label}; ${name(winnerOf(m))} advanced.`);
    }
    if (weeksIn >= 3 && gap < 2 && p.t === 'R') add('coin', 'Coin flip', `Their strength scores are within ${Math.max(1, Math.ceil(gap))} point${Math.ceil(gap) > 1 ? 's' : ''} of each other. This could go either way.`);
    if (table.weeks >= 3) {
      const ppgRank = o => [...table.rows].sort((x, y) => y.ppg - x.ppg).findIndex(r => r.owner === o) + 1;
      if (ppgRank(A) <= 3 && ppgRank(B) <= 3) add('shootout', 'Shootout', `Two of the league's top three scoring teams (${fmt(tA.ppg)} and ${fmt(tB.ppg)} a week).`);
      if (p.t === 'R' && both(r => r.rank >= n - 1)) add('lottery', 'Lottery bowl', `The two worst records in the league (${rec(tA)} and ${rec(tB)}). Someone climbs out of the cellar.`);
      for (const r of [tA, tB]) {
        if (r.dec >= 4 && r.w === 0) add(`winless-${r.owner}`, 'Desperation', `${name(r.owner)} is still looking for a first win (${rec(r)}).`);
      }
      const hot = [tA, tB].find(r => r.streak?.res === 'W' && r.streak.n >= 3);
      const cold = [tA, tB].find(r => r.streak?.res === 'L' && r.streak.n >= 3);
      if (hot && cold && hot !== cold) add('heater', 'Heater vs. slump', `${name(hot.owner)} has won ${hot.streak.n} straight; ${name(cold.owner)} has lost ${cold.streak.n} straight.`);
    }
    if (series.streak?.n >= 4) {
      const o = series.streak.who === 'A' ? A : B;
      add('streak', 'Streak on the line', `${name(o)} has won the last ${series.streak.n} meetings.`);
    }
    const lead = series.all.A - series.all.B;
    const decided = series.all.A + series.all.B;
    if (decided >= 4 && Math.abs(lead) >= 3 && Math.max(series.all.A, series.all.B) / decided >= 0.75 && !labels.some(l => l.id === 'streak')) {
      const o = lead > 0 ? A : B;
      add('big-brother', 'Big brother game', `${name(o)} has won ${Math.max(series.all.A, series.all.B)} of ${series.all.n} meetings.`);
    }
    if (p.t === 'R' && weeksIn >= 2 && gap >= 15 && !labels.some(l => l.id === 'trap')) {
      add('david', 'David vs. Goliath', `${name(fav)} is a big favorite (strength ${Math.round(str[fav].str)} vs ${Math.round(str[dog].str)}). An upset would be the story of the week.`);
    }
    if (!series.all.n) add('first', 'First meeting', `${name(A)} and ${name(B)} have never played each other.`);
    if (week === 1) add('opener', 'Opening night', fromPre ? `Week 1. Strength is based on the preseason Power Rankings (today's rosters and projections) until real games are played.` : `Week 1. Strength is based on last season's finish until real games are played.`);

    return { a: A, b: B, t: p.t, label: p.label, final, tA, tB, sA, sB, gap, series, parts, hype, labels, raceA, raceB, rivalry };
  });

  // One Trap-game watch and one David vs. Goliath a week at most: the biggest favorite keeps it.
  for (const id of ['trap', 'david']) {
    const keep = games.filter(g => g.labels.some(l => l.id === id)).sort((x, y) => y.gap - x.gap)[0];
    for (const g of games) if (g !== keep) g.labels = g.labels.filter(l => l.id !== id);
  }

  // The Main event: the Championship in title week, otherwise the top hype score.
  const main = games.find(g => g.label === 'Championship')
    ?? [...games].sort((x, y) => y.hype - x.hype || y.parts.quality - x.parts.quality)[0];
  if (main) {
    const top = HYPE_PARTS.map(x => ({ ...x, v: main.parts[x.id] * x.weight })).sort((x, y) => y.v - x.v).slice(0, 2);
    const why = main.label === 'Championship'
      ? `The title game is always the main event (hype ${main.hype}).`
      : `The highest hype score on the slate (${main.hype}), led by ${top.map(x => x.name.toLowerCase()).join(' and ')}${main.rivalry ? ` plus the ${main.rivalry.name.replace(/^The /, '')} bonus (+${main.rivalry.bonus})` : ''}.`;
    main.labels.unshift({ id: 'main', text: 'Main event', why, tone: 'gold' });
    main.main = true;
  }
  for (const g of games) g.labels = g.labels.slice(0, MAX_LABELS);
  games.sort((x, y) => (y.main ? 1 : 0) - (x.main ? 1 : 0) || y.hype - x.hype);
  // Rivalry Week: every game on a regular-season slate is a league rivalry.
  const rivalryWeek = !playoffs && games.length > 1 && games.every(g => g.rivalry?.level === 'major');
  return { season, week, playoffs, lastRegular, spots, left, weeksIn, games, rivalryWeek, prevSeason: Object.values(str)[0]?.prevSeason ?? null };
}

// ---------- Notable moments ----------
// The best player weeks (locked points) from the two teams' earlier meetings,
// tiered against every locked player week in league history.

const TIERS = [[0.99, 'Eruption'], [0.95, 'Takeover'], [0.85, 'Heat check'], [0, 'Steady hand']];

export function moments(DATA, series, A, B, perSide = 2) {
  const { byGame, playerPts } = cached(DATA);
  const all = [];
  for (const m of series.meetings) {
    for (const o of [A, B]) {
      const mine = o === A;
      for (const x of byGame.get(`${m.s}|${m.w}|${o}`) ?? []) {
        all.push({ pid: x.pid, p: x.p, o, m, teamScore: mine ? m.ap : m.bp, oppScore: mine ? m.bp : m.ap, won: m.win === (mine ? 'A' : 'B'), tie: m.win === 'tie' });
      }
    }
  }
  all.sort((x, y) => y.p - x.p);
  all.forEach((x, i) => {
    x.rivalryRank = i + 1;
    x.pctile = rankIn(playerPts, x.p);
    x.tier = TIERS.find(([cut]) => x.pctile >= cut)[1];
  });
  return {
    A: all.filter(x => x.o === A).slice(0, perSide),
    B: all.filter(x => x.o === B).slice(0, perSide),
    total: all.length,
  };
}

// ---------- Rivalry trophies (owner, Oct 2026) ----------
// Each MAJOR rivalry has a traveling trophy (RIVALRIES[i][3] = image in assets/trophies/).
// It goes to the winner of that season's series: the 3 regular-season meetings plus a
// playoff meeting if they have one (consolation games don't count). Most wins takes it; level
// on wins (e.g. 2-2 after a playoff meeting, or a tie game) = most points scored in those games.
// A series is clinched when the trailer can't catch up even by winning every game left; the
// clincher holds the trophy from then on, otherwise last season's winner keeps it.
export const trophyOf = (a, b) => RIVALRIES.find(([x, y]) => (x === a && y === b) || (x === b && y === a)) ?? null;
export const trophyImg = r => `assets/trophies/${r[3]}.webp`;

// Teams mathematically out of the playoffs during the regular season, as of the last regular
// week played before `beforeWeek` (commish.js playoffPicture). Cached per data load.
const ELIM = new WeakMap();
function eliminatedBy(DATA, season, beforeWeek) {
  const s = DATA.seasons.find(x => x.season === season);
  const lastRegular = (s?.playoffStart ?? 22) - 1;
  const played = DATA.games.filter(g => g.s === season && g.t === 'R' && g.w < beforeWeek).map(g => g.w);
  const week = Math.min(lastRegular, played.length ? Math.max(...played) : 0);
  if (!week) return new Set();
  const byData = ELIM.get(DATA) ?? new Map();
  ELIM.set(DATA, byData);
  const key = `${season}|${week}`;
  if (!byData.has(key)) {
    let set = new Set();
    try { set = new Set(playoffPicture(DATA, season, week, standingsBefore).rows.filter(r => r.eliminated).map(r => r.owner)); } catch { /* no picture: nobody counted out */ }
    byData.set(key, set);
  }
  return byData.get(key);
}

export function seasonSeries(DATA, season, A, B, beforeWeek = Infinity) {
  const s = DATA.seasons.find(x => x.season === season);
  const pair = g => (g.a === A && g.b === B) || (g.a === B && g.b === A);
  const games = DATA.games.filter(g => g.s === season && pair(g) && (g.t === 'R' || g.t === 'P') && g.w < beforeWeek)
    .sort((x, y) => x.w - y.w)
    .map(g => {
      const flip = g.a !== A;
      return { w: g.w, t: g.t, label: g.label ?? null, ap: flip ? g.bp : g.ap, bp: flip ? g.ap : g.bp, win: g.win === 'tie' ? 'tie' : (g.win === 'a') !== flip ? A : B };
    });
  const played = new Set(games.map(g => g.w));
  const upcoming = (DATA.schedule ?? []).filter(g => g.s === season && pair(g) && !played.has(g.w)).map(g => g.w).sort((x, y) => x - y);
  const wins = { [A]: games.filter(g => g.win === A).length, [B]: games.filter(g => g.win === B).length };
  const pts = { [A]: games.reduce((t, g) => t + g.ap, 0), [B]: games.reduce((t, g) => t + g.bp, 0) };
  const ties = games.filter(g => g.win === 'tie').length;
  // A playoff meeting is still possible until one of them is out (or they already met there).
  // Out = mathematically eliminated during the regular season (Playoff picture math), not in
  // the bracket once it's set, or lost a playoff game.
  const complete = s?.status === 'complete' && beforeWeek === Infinity;
  const metInPlayoffs = games.some(g => g.t === 'P');
  const elim = eliminatedBy(DATA, season, beforeWeek);
  const out = o => elim.has(o) || (s?.playoffTeams?.length && !s.playoffTeams.includes(o))
    || DATA.games.some(g => g.s === season && g.t === 'P' && g.w < beforeWeek && ((g.a === o && g.win === 'b') || (g.b === o && g.win === 'a')));
  const playoffLeft = !complete && !metInPlayoffs && !out(A) && !out(B) ? 1 : 0;
  const left = complete ? 0 : upcoming.length + playoffLeft;
  const lead = wins[A] === wins[B] ? null : wins[A] > wins[B] ? A : B;
  const trail = lead === A ? B : A;
  let winner = null, how = null;
  // Decided: season over, nothing left to play (level on wins goes to points right away),
  // or the leader can't be caught.
  if (complete || (games.length && left === 0) || (lead && wins[lead] > wins[trail] + left)) {
    if (lead) { winner = lead; how = 'wins'; }
    else if (games.length && pts[A] !== pts[B]) { winner = pts[A] > pts[B] ? A : B; how = 'points'; }
  }
  return { season, A, B, games, upcoming, wins, pts, ties, left, playoffLeft, lead, winner, how, clinched: Boolean(winner) && !complete, complete };
}

// The trophy's holder now and every season's winner (from RIVALRIES_FROM on).
export function trophyHistory(DATA, r) {
  const [A, B] = r;
  const seasons = DATA.seasons.filter(s => Number(s.season) >= Number(RIVALRIES_FROM)).map(s => s.season);
  const list = seasons.map(season => seasonSeries(DATA, season, A, B));
  let holder = null, since = null;
  for (const x of list) if (x.winner) { if (x.winner !== holder) since = x.season; holder = x.winner; }
  const current = list.at(-1) ?? null;
  return { holder, since, seasons: list.filter(x => x.winner), current };
}
