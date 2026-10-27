// Any Sleeper league ID from this league's history. Newer seasons are found
// automatically when the league renews in Sleeper, and older seasons through
// each league's previous_league_id, so this never needs updating.
export const LEAGUE_ID = '1398888652733472768';

// A saved copy of the league data (a commit in this repo) known to be correct,
// used once to freeze completed seasons that don't have a data/frozen file yet.
// ad30616 (Sep 27, 2026) matches Sleeper's official totals for every team and
// every 2025 playoff score confirmed in the Sleeper app. Seasons that complete
// later freeze on their own, so this never needs changing.
export const FREEZE_SEED = 'ad30616';

// The first season the league named All-Stars.
export const ALL_STARS_FROM = '2025';

// Seasons whose awards (League MVP, All-Fantasy, Rookie of the Year, All-Rookie) are
// scored with another season's settings. The commissioner awarded 2023-24 under
// today's scoring (1 per point), not that season's 0.5 per point, so the site
// matches the awards already handed out. Season -> season whose scoring to use.
export const AWARD_SCORING = { '2023': '2024' };

// League rivalries (set by the commissioner). When a pair meets, Matchup Hype
// tags the game with the rivalry's name and adds RIVALRY_BONUS to its hype score
// (major +10, minor +5, owner Oct 2026). Only from RIVALRIES_FROM on: earlier
// seasons stay as they were. Pairs are Sleeper user IDs, so a display-name change
// doesn't break them. Rivalry Week = every game that week is a major rivalry.
export const RIVALRIES_FROM = '2026';
export const RIVALRIES = [ // major: [owner, owner, name, trophy image (assets/trophies/<x>.webp)]
  ['986665284570279936', '1035744206368657408', 'The Finals Fallout', 'finals-fallout'], // jimmycooks2 vs tzola13
  ['1035475215997906944', '1036083466980458496', 'The Crown Clash', 'crown-clash'], // bigdaddyburk vs TRT3
  ['1035995054579617792', '1035999704737259520', 'The Never Ending Negotiation', 'never-ending-negotiation'], // loganzarvell vs bigtrey5456
  ['866760756052537344', '1038192436067016704', 'The Race to Relevance', 'race-to-relevance'], // simeoncampbell7 vs BenDoverPlz123
];
export const MINOR_RIVALRIES = [
  ['1036083466980458496', '1035999704737259520', 'Battle of Brothers'], // TRT3 vs bigtrey5456
  ['866760756052537344', '986665284570279936', 'Battle of Brothers'], // simeoncampbell7 vs jimmycooks2
  ['1036083466980458496', '1035995054579617792', 'Culture Clash'], // TRT3 vs loganzarvell
];
export const RIVALRY_BONUS = { major: 10, minor: 5 };

// Wager Weeks (Rulebook rule 9, 2026-27 only): in weeks `from` to `to`, the lowest
// weekly score puts up `stake` dollars for the league parlay; nobody pays more than
// `cap` times (then it passes to the next-lowest manager under the cap). Home shows
// the tracker from now until the week after `to`.
export const WAGER = { season: '2026', from: 8, to: 14, stake: 5, cap: 2 };

// The 30 NBA teams' Sleeper codes. Sleeper's per-game box scores also list the All-Star Game as a regular-season
// game (team / opponent EST-WST 2024, CHK-SHQ 2025, STP-STR 2026...). It never counts in fantasy matchups, so
// every per-game reader skips those rows (owner, Oct 26 2026: Jokic 2023-24 showed 80 games instead of 79).
export const NBA_CODES = new Set(['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW', 'HOU', 'IND', 'LAC', 'LAL', 'MEM',
  'MIA', 'MIL', 'MIN', 'NOP', 'NYK', 'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS']);
const notNba = code => !!code && !NBA_CODES.has(code);
export const exhibitionRow = g => notNba(g?.team) || notNba(g?.opponent);
