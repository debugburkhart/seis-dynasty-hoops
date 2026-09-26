// Run by the GitHub Action every night: node scripts/update.mjs
// Writes data/league.json (everything the site reads) and a small dated
// standings snapshot in data/snapshots/ so day-to-day movement is kept.

import { mkdir, writeFile } from 'node:fs/promises';
import { LEAGUE_ID } from '../assets/config.js';
import { buildLeagueData } from '../assets/build-data.js';

const data = await buildLeagueData(LEAGUE_ID);

await mkdir('data/snapshots', { recursive: true });
await writeFile('data/league.json', JSON.stringify(data));

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
const current = data.seasons.at(-1);
const standings = [...current.teams]
  .sort((x, y) => y.w - x.w || y.pf - x.pf)
  .map((t, i) => ({ rank: i + 1, owner: t.owner, team: t.team, w: t.w, l: t.l, t: t.t, pf: t.pf }));
await writeFile(`data/snapshots/${today}.json`, JSON.stringify({ date: today, season: current.season, standings }, null, 1));

console.log(`Saved ${data.seasons.length} seasons, ${data.games.length} games, snapshot ${today}.`);

// Cross-check weekly results against Sleeper's official standings. A mismatch
// usually means a stat correction Sleeper didn't apply to the weekly matchup.
for (const s of data.seasons) {
  for (const t of s.teams) {
    const mine = data.games.filter(g => g.s === s.season && g.t === 'R' && (g.a === t.owner || g.b === t.owner));
    const wins = mine.filter(g => (g.a === t.owner && g.win === 'a') || (g.b === t.owner && g.win === 'b')).length;
    const pf = mine.reduce((sum, g) => sum + (g.a === t.owner ? g.ap : g.bp), 0);
    if (wins !== t.w || Math.abs(pf - t.pf) > 0.5) {
      console.log(`::warning::${s.season} ${data.owners[t.owner].name}: official ${t.w} wins / ${t.pf} pts, weekly matchups add up to ${wins} wins / ${Math.round(pf * 10) / 10} pts`);
    }
  }
}
