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

// League rivalries (set by the commissioner). When a pair meets, Matchup Hype
// tags the game "Rivalry" and adds up to 5 hype (through the History part).
// Only from RIVALRIES_FROM on: earlier seasons stay as they were.
// Pairs are Sleeper user IDs, so a display-name change doesn't break them.
export const RIVALRIES_FROM = '2026';
export const RIVALRIES = [
  ['986665284570279936', '1035744206368657408'], // jimmycooks2 vs tzola13
  ['1035475215997906944', '1036083466980458496'], // bigdaddyburk vs TRT3
  ['1035995054579617792', '1035999704737259520'], // loganzarvell vs bigtrey5456
  ['866760756052537344', '1038192436067016704'], // simeoncampbell7 vs BenDoverPlz123
];
