# Seis Dynasty Basketball Hall of Fame

League history site for the Seis Dynasty Basketball league on Sleeper (8 teams, NBA,
dynasty). Static site on GitHub Pages; a GitHub Action rebuilds the data nightly.

- Live site: https://debugburkhart.github.io/seis-dynasty-hoops/
- Repo: https://github.com/debugburkhart/seis-dynasty-hoops (public)
- Owner is not a developer: explain in plain language, give exact upload steps.

## How the owner deploys (important)
- No git/Node locally. The owner uploads files through GitHub's web UI:
  from the repo's **main page**, Add file → Upload files, drag the `assets` folder
  (and/or `scripts`, `index.html`) in **one batch**. Never tell them to upload from
  inside `assets` (that once created `assets/assets/`).
- `.github/workflows/update.yml` can't be uploaded (hidden folder): the owner edits it on
  GitHub with the pencil and pastes. Put the new content on their clipboard with
  PowerShell `Get-Content -Raw ... | Set-Clipboard`.
- Always end a change with the exact list of files to upload.
- The repo is public: check runs/files with `curl` against api.github.com,
  raw.githubusercontent.com and the live site (github.io is blocked in the Browser pane).

## Architecture (all plain ES modules, no build step)
- `index.html`: shell + import map. Every module in `assets/` must be listed in the
  import map with `?v=dev` (the Action replaces it with a version fingerprint).
- `assets/app.js`: all pages (hash routes: rivalry, records, power, hype, standings,
  transactions, awards, players), sidebar.
- `assets/build-data.js`: pulls everything from Sleeper (`api.sleeper.com`, cache-busted),
  applies `corrections.js`, loads frozen seasons. Output = `data/league.json`.
- `assets/records.js`: Record Book (6 categories, filters, record-change history).
- `assets/frontoffice.js`: trades/waivers/drafts valued by locked points ("stints").
- `assets/standings.js`: Legacy score + standings table + final finishes.
- `assets/power.js`: Power Rankings. `assets/freeze.js`: frozen seasons + week guard.
- `assets/hype.js`: Matchup Hype (hype score, Main event, labels, moments). Uses only games
  before the week. The page (app.js) fetches Sleeper state + live scores in the browser and
  reveals a week only once it's under way (week 1: the Monday of tip-off week).
- `assets/transactions.js`: Transactions page data (move kinds, Ledger totals); values come
  from frontoffice.js (trades/pickups/letGo carry `tx` = index into DATA.transactions).
  Players carry `t` = current NBA team (added Oct 2026; older data files lack it).
- `assets/awards.js`: Awards page: season banners + GM of the Year (rules decided with the
  owner: moves made that season, locked points that season incl. playoffs, trade net like
  the Value Desk, pickups/drops count only if the player started 3+ weeks, rookies count,
  playoff teams only). Player of the Year = most locked points that season (all teams,
  playoffs incl.). League MVP = most fantasy points over the whole NBA regular season
  under that season's league scoring (DATA.mvp: top 10 per season, built nightly from
  Sleeper's /stats/nba/regular/{season}; team rows "TEAM_*" skipped). Not tied to the
  playoffs (the owner confirmed). Championship MVP = winning team's top locked scorer in
  the title game (winning team only). All-Stars = top 5 G (PG/SG), F (SF/PF), C by total
  fantasy points through the last game before the NBA All-Star Game (DATA.allStars,
  built by allStarPool in build-data.js from per-game box scores
  api.sleeper.com/stats/nba/{season}/{week}; computed once per season, then carried over
  by update.mjs; weekly aggregate endpoints are WRONG: they hold only the last game).
  Positions are Sleeper's current ones saved at computation time; ALL_STAR_POSITIONS in
  corrections.js overrides by season + name. All-Stars start in 2025 (ALL_STARS_FROM in
  config.js); the owner confirmed the 2025 list. All-Fantasy Team = DATA.mvp top 10.
  Rookie of the Year / All-Rookie Team (top 5) = DATA.rookies: total fantasy points, rookie =
  NBA games that season and none in the 10 seasons before (Sleeper's years_exp is wrong for
  some players, e.g. Amen Thompson, Yabusele); computed once per completed season, carried
  over by update.mjs. Ties at a team's cutoff are all included. Award order on banners:
  01 GM, 02 Player of the Year, 03 League MVP, 04 Rookie of the Year, 05 All-Stars,
  06 All-Fantasy, 07 All-Rookie. Awards lists show position only (Sleeper's NBA team is
  today's) plus the FANTASY team that had the player: season's end for season-long
  awards, the All-Star break week (allStars[s].week; Sleeper fantasy weeks = NBA stats
  weeks) for All-Stars, most-points team for Player of the Year. From awards.js ownerAt()
  over frontoffice `stints`. Coach of the Year on
  hold. frontoffice values carry `weeks` ({k: season*100+week, p}) for season-limited sums.
- `assets/players.js`: Player Index (#/players, under Hall of Fame): every player's locked
  points with season/manager filters, sort (points, weeks, per start: 5+ starts first),
  search (accent-insensitive), and a breakdown by fantasy team and by season.
- `assets/commish.js`: Commissioner's office (#/commish, lock button under the menu, not in
  NAV). Passcode asked every time (in-memory flag, reset when leaving the route); only its
  SHA-256 is stored (the owner knows the code; never write it in files). Scouting report
  (default team bigdaddyburk = Parma John Wall; any team selectable) uses live Sleeper data
  in the browser: rosters, /schedule/nba/regular/{season}, per-game projections
  /projections/nba/{season}/{week}, season stats, matchups. LEAGUE IS LOCK-IN SCORING: each
  starter counts ONE game per week (locked by the manager, else his last game), verified
  against box scores. Projection = per-game proj x lock factor (1g 1.00, 2g 1.11, 3g 1.23,
  4+ 1.25) x 1.08 calibration; backtest 2024-25: ~27 pt avg miss, picks winner 72%.
  Tabs: Scouting report, Award races (season picker; live season totals + rookies from
  Sleeper via seasonTotals(); 2025 matches the Awards page), Early hype (unrevealed
  regular weeks' hypeSlate, default = next week to be revealed), Health report.
  Health report: GitHub runs, scoring-check.txt, week-guard.json, warnings, corrections,
  lineup check, activity (flag >21 days in season), trade review (750+ net, 4+ trades/pair).
- `assets/corrections.js`: manual fixes (team scores, player locked points, draft picks,
  All-Star positions, PHOTO_CORRECTIONS: name -> NBA.com ID for headshots Sleeper has
  wrong; Sleeper's LeBron James photo (id 1362) is Bronny). All player photos go through
  playerPhoto() in records.js. Checked Oct 2026: no duplicate photos among league players;
  families/twins (Thompson, Murray, Champagnie, Lopez, Ball, Holiday...) are correct.
- `scripts/update.mjs`: nightly job (Node 22 in Actions): build, guard, freeze, record
  history, snapshots, and checks that fail the run (= email) on any mismatch.
- `data/` is written only by the Action (league.json, frozen/, snapshots/, week-guard.json).
  Never have the owner upload a `data` folder.

## Data rules decided with the owner
- Only **locked points** count for players (starters_points; bench points never count).
- 2026+ has a league-median game; it counts in win-loss records like Sleeper does.
  Head-to-head (rivalry, luck) excludes it.
- Last place = loser of the last-place game (toilet bowl, lower score finishes last).
- Draft records are rookie drafts only (2023 startup excluded). 2024 pick 23 is ignored
  (duplicate Sleeper entry, player unknown).
- Completed seasons (2023–2025) are frozen in `data/frozen/`; Sleeper has served stale or
  partial old weeks before. The current season is protected by the week guard.
- Front Office / trade values: a player counts for the team that got him until he left;
  a pick counts as the player it became (flipped picks net out). "Est." = still changing.
- Colors are navy (not green); tokens at the top of `styles.css`.

## Testing
- Most visitors use phones (owner's iPhone is 402px wide). Test layouts at 320, 375,
  390, 402, 414, 430 px and desktop. Media query blocks must be closed correctly.
- Preview: `.claude/launch.json` config "hoops" serves this folder (`.claude/serve.ps1`).
  Without `data/league.json` locally, the site builds live from Sleeper (slow, ~20s) and
  WITHOUT frozen seasons, so old numbers can be wrong. For testing, download the real file
  from raw.githubusercontent.com into `data/` and delete it afterward.
- Verify numbers against the data before reporting; the owner checks things in the app.

## Not built yet (sidebar shows "Soon")
Home, Weekly Props, Trade Court, Timeline,
Draft History, Cheat Sheet, Draft Grades. The owner shares screenshots of a football
reference site (fantasyhoff.com) for each feature and wants it adapted for basketball.
