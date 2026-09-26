// Scores where Sleeper's API disagrees with the Sleeper app (stat corrections
// that never reached the weekly matchup data). Each entry replaces the API's
// score for that manager that week. Use Sleeper display names.
//
// If the nightly Action fails with a scoring mismatch, it lists the games to
// look up in the app. Add the app's scores here.
export const CORRECTIONS = [
  { season: '2023', week: 8, scores: { loganzarvell: 229.5, TRT3: 243 } },
  { season: '2023', week: 9, scores: { loganzarvell: 221, bigtrey5456: 286 } },
  { season: '2023', week: 20, scores: { loganzarvell: 292.5, BenDoverPlz123: 279.5 } },
  { season: '2024', week: 15, scores: { tzola13: 424, bigtrey5456: 426 } },
  { season: '2024', week: 16, scores: { BenDoverPlz123: 367, loganzarvell: 320 } },
  { season: '2025', week: 4, scores: { BenDoverPlz123: 304, jimmycooks2: 454 } },
  { season: '2025', week: 5, scores: { jimmycooks2: 361, tzola13: 394 } },
  { season: '2025', week: 14, scores: { BenDoverPlz123: 274, TRT3: 374 } },
];
