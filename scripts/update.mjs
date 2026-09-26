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
    const wins = mine.filter(g => g.win === side(g)).length;
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

if (problems.length) {
  const msg = `Sleeper's weekly scores don't match its official standings:\n\n${problems.join('\n\n')}\n\nLook these up in the Sleeper app and add the right scores to assets/corrections.js.`;
  console.log(`::warning::${msg.replace(/\n/g, '%0A')}`);
  await writeFile('data/scoring-check.txt', msg);
} else {
  console.log('Scoring check passed: every weekly score matches Sleeper\'s official standings.');
  await writeFile('data/scoring-check.txt', '');
}
