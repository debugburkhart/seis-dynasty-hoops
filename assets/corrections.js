// Scores where Sleeper's API disagrees with the Sleeper app (stat corrections
// that never reached the weekly matchup data). Each entry replaces the API's
// score for that manager that week. Use Sleeper display names.
//
// If the nightly Action shows a yellow warning about a season not adding up,
// look up the game in the app and add it here.
export const CORRECTIONS = [
  { season: '2023', week: 8, scores: { loganzarvell: 229.5, TRT3: 243 } },
  { season: '2024', week: 15, scores: { tzola13: 424, bigtrey5456: 426 } },
];
