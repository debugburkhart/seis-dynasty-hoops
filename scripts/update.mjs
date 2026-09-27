// Run by the GitHub Action every night: node scripts/update.mjs
// Writes data/league.json (everything the site reads) and a small dated
// standings snapshot in data/snapshots/ so day-to-day movement is kept.

import { mkdir, writeFile } from 'node:fs/promises';
import { LEAGUE_ID } from '../assets/config.js';
import { buildLeagueData } from '../assets/build-data.js';
import { recordHistory } from '../assets/records.js';

const data = await buildLeagueData(LEAGUE_ID);

// Replaying every week to find record changes takes a couple of seconds,
// so it's done here once a night instead of in every visitor's browser.
data.recordEvents = recordHistory(data);

await mkdir('data/snapshots', { recursive: true });
await writeFile('data/league.json', JSON.stringify(data));

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
const current = data.seasons.at(-1);
const standings = [...current.teams]
  .sort((x, y) => y.w - x.w || y.pf - x.pf)
  .map((t, i) => ({ rank: i + 1, owner: t.owner, team: t.team, w: t.w, l: t.l, t: t.t, pf: t.pf }));
await writeFile(`data/snapshots/${today}.json`, JSON.stringify({ date: today, season: current.season, standings }, null, 1));

console.log(`Saved ${data.seasons.length} seasons, ${data.games.length} games, snapshot ${today}.`);

// ---------- Scoring check ----------
// Sleeper's official standings (wins, points for, points against) are compared
// with the weekly matchup scores. A gap means a weekly score in the API is wrong.
// Because a wrong score also shows up in the opponent's points against, the two
// gaps together point to the few games to look up in the Sleeper app.

const name = id => data.owners[id]?.name ?? id;
const r1 = n => Math.round(n * 10) / 10;
const problems = [];

for (const s of data.seasons) {
  const reg = data.games.filter(g => g.s === s.season && g.t === 'R');
  const gap = {};
  for (const t of s.teams) {
    const mine = reg.filter(g => g.a === t.owner || g.b === t.owner);
    const side = g => (g.a === t.owner ? 'a' : 'b');
    // Sleeper's official wins include league-median wins in seasons that have them.
    const medianWins = (data.medianGames ?? []).filter(m => m.s === s.season && m.o === t.owner && m.res === 'W').length;
    const wins = mine.filter(g => g.win === side(g)).length + medianWins;
    const pf = mine.reduce((x, g) => x + (side(g) === 'a' ? g.ap : g.bp), 0);
    const pa = mine.reduce((x, g) => x + (side(g) === 'a' ? g.bp : g.ap), 0);
    gap[t.owner] = { wins: t.w - wins, pf: r1(t.pf - pf), pa: r1(t.pa - pa) };
  }
  for (const t of s.teams) {
    const g0 = gap[t.owner];
    if (!g0.wins && Math.abs(g0.pf) < 0.5) continue;
    const lines = [`${s.season} ${name(t.owner)}: official ${t.w} wins / ${t.pf} pts, but weekly scores give ${t.w - g0.wins} wins / ${r1(t.pf - g0.pf)} pts (off by ${g0.pf > 0 ? '+' : ''}${g0.pf}).`];
    const suspects = reg.filter(g => {
      const opp = g.a === t.owner ? g.b : g.b === t.owner ? g.a : null;
      return opp && Math.abs(gap[opp].pa) >= 0.5;
    });
    const list = suspects.length ? suspects : reg.filter(g => g.a === t.owner || g.b === t.owner);
    lines.push(`   Check ${name(t.owner)}'s score in ${suspects.length ? 'these games' : 'every game this season'}:`);
    for (const g of list) lines.push(`     Week ${g.w}: ${name(g.a)} ${g.ap} - ${g.bp} ${name(g.b)}`);
    problems.push(lines.join('\n'));
  }
}

// ---------- Player check ----------
// Every team's locked player points should add up to its score in that game.
// A gap means a player's weekly points in the API are wrong (or a player-level
// correction is still needed after a team-score correction).

const playerProblems = [];
const lockedSum = {};
for (const x of data.playerWeeks) lockedSum[`${x.s}|${x.w}|${x.o}`] = (lockedSum[`${x.s}|${x.w}|${x.o}`] ?? 0) + x.p;
for (const g of data.games) {
  for (const [o, score] of [[g.a, g.ap], [g.b, g.bp]]) {
    const sum = r1(lockedSum[`${g.s}|${g.w}|${o}`] ?? 0);
    if (Math.abs(sum - score) < 0.05) continue;
    const starters = data.playerWeeks
      .filter(x => x.s === g.s && x.w === g.w && x.o === o)
      .sort((a, b) => b.p - a.p)
      .map(x => `${data.players[x.pid]?.n ?? x.pid} ${x.p}`);
    playerProblems.push(
      `${g.s} Week ${g.w} ${name(o)}: team score ${score}, but starters' locked points add up to ${sum} (off by ${r1(score - sum) > 0 ? '+' : ''}${r1(score - sum)}).\n` +
      `   Starters per the API: ${starters.join(', ') || 'none'}`,
    );
  }
}

const sections = [];
if (problems.length) {
  sections.push(`Sleeper's weekly scores don't match its official standings:\n\n${problems.join('\n\n')}\n\nLook these up in the Sleeper app and add the right team scores to assets/corrections.js.`);
}
if (playerProblems.length) {
  sections.push(`Player points don't add up to the team score in these games:\n\n${playerProblems.join('\n\n')}\n\nIn the Sleeper app, find the starters whose points differ and add them under "players" in assets/corrections.js.`);
}
if (data.warnings?.length) {
  sections.push(`Problems with assets/corrections.js:\n\n${data.warnings.join('\n')}`);
}

if (sections.length) {
  const msg = sections.join('\n\n----------\n\n');
  console.log(`::warning::${msg.replace(/\n/g, '%0A')}`);
  await writeFile('data/scoring-check.txt', msg);
} else {
  console.log('Scoring check passed: every weekly score matches Sleeper\'s official standings, and every lineup adds up to its team score.');
  await writeFile('data/scoring-check.txt', '');
}
