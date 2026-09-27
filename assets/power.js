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
