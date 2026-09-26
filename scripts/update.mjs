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
