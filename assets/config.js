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
