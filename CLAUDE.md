# Seis Dynasty Basketball Hall of Fame

League history site for the Seis Dynasty Basketball league on Sleeper (8 teams, NBA,
dynasty). Static site on GitHub Pages; a GitHub Action rebuilds the data nightly.

- Live site: https://debugburkhart.github.io/seis-dynasty-hoops/
- Repo: https://github.com/debugburkhart/seis-dynasty-hoops (public)
- Owner says he IS a developer (Nov 1 2026): technical detail is fine; still give exact upload steps (no git/Node
  locally). Sleeper login (CHANGED Nov 8 2026): the public site, the nightly job, weekfix and the Dev Dashboard stay on
  Sleeper's public API (no dummy account, ever); the ONE exception is the Test features tab "Sleeper Insider", where the
  owner pastes HIS OWN Sleeper token himself (this browser's localStorage only). ALSO (Nov 8 2026, owner asked): Home +
  Matchup Hype + 2K + Depth Chart + Assistant Coach read Sleeper's NO-LOGIN private lock data in the browser (see
  LIVE LOCKED SCORES); the watcher still never does. CHANGED Nov 9 2026 (owner: "yes, build it", after the Scoring check
  kept failing on week 2-3 ties): the NIGHTLY JOB now reads the same no-login lock data for weekfix (see SLEEPER LOCKS FOR
  THE SOLVER under locks.js). Claude never types his password, never
  handles or asks for the token. (Nov 1 2026 he had said public API only; he changed his mind Nov 8.)

## How the owner deploys (important)
- No git/Node locally. The owner uploads files through GitHub's web UI:
  from the repo's **main page**, Add file → Upload files, drag the `assets` folder
  (and/or `scripts`, `index.html`) in **one batch**. Never tell them to upload from
  inside `assets` (that once created `assets/assets/`).
- `.github/workflows/update.yml` can't be uploaded (hidden folder): the owner edits it on
  GitHub with the pencil and pastes. Put the new content on their clipboard with
  PowerShell `Get-Content -Raw ... | Set-Clipboard`.
- Workflow actions (Oct 27 2026, Node 20 retirement notice): checkout@v5, setup-node@v5 (node-version 22 for
  the script), configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5 = the first majors on Node 24
  (newer checkout v6/v7 change how git credentials are kept; the "Save data" step pushes with them). The
  Sunday 8 PM / 11 PM crons were missing on GitHub until this paste: always compare the live file
  (raw.githubusercontent.com/.../.github/workflows/update.yml) with the local one before giving a new paste.
- Always end a change with the exact list of files to upload.- The repo is public: check runs/files with `curl` against api.github.com,
  raw.githubusercontent.com and the live site (github.io is blocked in the Browser pane).

## Architecture (all plain ES modules, no build step)
- League logo (owner chose the "Hex Ball", Oct 2026): assets/logo.svg (sidebar, top bar,
  favicon), assets/icon-180.png (iPhone home screen) and icon-512.png, all drawn from the same
  shapes; downloadable copies in brand/ (SVG, 512/1024 PNG, 1024 avatar on navy). PNGs are
  drawn with PowerShell System.Drawing (no Node locally), matching the SVG geometry.
- LIGHT / DARK MODE (owner, Nov 8 2026): `assets/theme.js`, switch "Theme Light / Dark / Auto" in the sidebar foot
  (themeSwitch/paintTheme in renderSidebar, .theme-* in styles.css), localStorage 'theme' (per device, not synced;
  default light; auto = the device's setting, follows changes). NO hand-written dark CSS: when dark is on, theme.js reads
  every styles.css rule once and writes <style id="theme-dark"> (html.dark + each selector, every color declaration
  re-emitted so rule order/specificity is unchanged, wrapped in @media screen so print/PDF stays light). Colors converted
  by ROLE in OKLab: backgrounds (light surfaces -> dark navy-tinted, solid navy/dark and bright accents L<.9 C>.085 kept),
  text (dark -> light; kept when the rule's own solid background is kept, or the selector sits inside a rule with a
  bright background, e.g. `.bk .bk-table tr.on td` -> `tr.on .bk-rk`), borders, SVG fill/stroke (graphic), custom props by
  name (--*bg* / --*edge* / --*ink*, -c). Rules inside containers that are ALREADY dark in light mode (single-class
  selectors with a solid dark background: .sidebar, .bk, .fight...) and KEEP (.bk-total/.bk-dyn/.bk-lock badges) are
  written unchanged. index.html sets html.dark before first paint + a body background (no white flash). JS inline
  colors aren't converted: advstats-ui.js swaps its navy series color to light blue in dark. Checked Nov 8 2026: text
  contrast audit on every public page + most commish tabs (only chips that are the same in light mode), 402 + desktop.
  If a new component looks wrong in dark: add its container selector to KEEP, or give it a solid background.
- `index.html`: shell + import map. Every module in `assets/` must be listed in the
  import map with `?v=dev` (the Action replaces it with a version fingerprint).
- `assets/rules.js`: the league Rulebook text (#/rules, under Now). Rules grouped by season
  added (LEAGUE_START 2023 = original); a changed point = today's text + changed: {season,
  was} (page shows a note + "Rule changes" history). Owner's answers: show current rule +
  change note; taxi size changed 30 -> 15 for 2026-27 (owner, Oct 2026; point has covers:
  'taxi' so the Timeline drops Sleeper's "Taxi 30 → 15" slot change); the mid-week
  trade-lock rule is an original rule (1.3); Awards rule = 2025-26 per its parentheses.
- `assets/timeline.js`: League Timeline (#/timeline, Hall of Fame; modeled on the owner's
  reference screenshot). Per season, newest first: champion (+ final score), Rulebook rules
  added/changed (rules.js; a rule with covers: 'median' replaces the auto setting entry),
  league renamed, Sleeper settings changes (DATA.seasons[].settings saved nightly by
  settingsOf() in build-data: starters, bench, taxi, IR, teams, playoff teams, median,
  scoring), the draft's 1.01, founding (+ "same N managers"), and hand-added MILESTONES.
- `assets/app.js`: all pages (hash routes: home, rules, timeline, rivalry, records, power, hype, standings,
  transactions, awards, players), sidebar.
- Home (#/home, the default page; renderHome in app.js): Main event = top of hypeSlate for
  the week the Hype page opens on (preseason: last season's final week + tip-off note). Since Oct 22 2026
  (owner) the card holds EVERY game of that week as slides in hype order (homeSlide per game, kicker says
  "Main event" / "Game N of M"): desktop ((hover: hover) and (pointer: fine)) auto-advances every
  HM_CYCLE_MS 8 s, paused while hovered/focused or the tab is hidden (cycles even with Reduce Motion, owner
  asked; that only drops the fade); phones get ‹ › arrows + dots, no auto-advance (bindHomeSlides). Since
  Oct 27 2026 (owner) the ‹ › arrows show on desktop too; a manual move restarts the 8 s timer; only keyboard
  focus (:focus-visible) pauses, a mouse click on an arrow doesn't. Slides
  share one grid cell (.hm-slides) so the card keeps the tallest slide's height; the shown slide
  (box.dataset.slide) survives the minute score refresh;
  "Record watch" ticker (newest 8 league + 6 personal record events): desktop auto-scrolls;
  phones (<=560px, owner's request) get a swipe row, one card + next peeking, dots and
  "1 of N · Swipe" (bindTicker); plain
  swipe strip when the device has Reduce Motion on); Power top 3 (latest edition); all-time
  standings top 5 with Wins/Titles/Median %/Total points/Pts per season buttons (regular
  season, same numbers as the Standings table); 6 newest transactions. Every item links to
  its page. Wager Weeks tracker (homeWager, below the standings; WAGER in config.js): shown
  in the 2026 season until the week after week 14; per week 8-14 the payer (lowest score, or
  next-lowest under the 2-time cap), live "on the hook" during a wager week (liveWeek once on
  load), a tie for the payer spot = "commish decides" and nobody charged, tally dots + pot.
  Bet results: wager.json at the repo ROOT ({ parlays: { week: { result: won|lost, amount } } },
  amount = total ticket payout, per manager = amount / teams). Entered in Commish → League
  office → Wager Weeks (renderWagerAdmin): Copy results + "Open wager.json on GitHub" (edit
  URL), owner pastes and commits (push redeploys, ~3-5 min); last save kept 20 min in
  localStorage wager-saved so the form shows it until GitHub publishes. Card stays up after
  week 15 until every paid week has a result.
  WHAT'S NEW (owner, Oct 27 2026; homeNew in app.js, .hm-new-*): card right under the Main event (above the Props
  / Trade Court lines) listing new features with an icon, one line and a link: WHATS_NEW = [{ icon, title, text,
  href | jump }] (jump = id of a Home card to scroll to, e.g. hm-taxi). Now: Trade Court, Weekly Props, Taxi players
  of the week. Edit WHATS_NEW to add/remove items.
  TAXI PLAYERS OF THE WEEK (owner, Oct 27 2026; homeTaxi in app.js, #hm-taxi under Power/Standings, .hm-taxi-*):
  the 5 best SINGLE games by taxi-squad players in the last finished week, one game per player (his best), from
  data/taxi-week.json built by update.mjs -> assets/taxiweek.js updateTaxiWeek(): week = the newest week of the
  current season in data.games; taxi = Sleeper rosters' taxi lists at build time; box scores /stats/nba/{s}/{w}
  (All-Star rows skipped, gp or sp), that league's scoring; BUILT ONCE PER WEEK (a week already in the file is
  never rebuilt), so a player called up later stays listed. File version 2 (owner, Oct 27 2026) = { version, at,
  weeks: [{ season, week, dates, taxiPlayers, played, games }] } oldest first, EVERY week kept (a version 1
  one-week file is carried in). Card: ‹ Week N › arrows (.hm-taxi-nav) step through saved weeks (opens on the
  newest); each name has a pill "N×" (.hm-taxi-x) = times on the list through the week shown (taxiAppearances
  in taxiweek.js; tooltip lists the weeks) + a key line under the list. 2K breakdown (owner, Oct 27 2026): the
  AWARD "Taxi player of the week" = the week's No. 1 ONLY (owner: "only give the award to the top player each
  week"): green Awards chip (.bk-aw.taxi) "2 x Taxi player of the week (Wk 1, Wk 2)" (season names only when weeks
  span seasons; tooltip per week: rank, FP, opponent, fantasy team); Compare's Awards row counts No. 1s only.
  Anyone in a week's top 5 gets the AUTO TAG "Made Taxi POTW" (AUTO_TAGS in breakdown.js, au-taxi green), chip
  "Made Taxi POTW ×N" (N = top-5 appearances, tooltip lists week, rank, FP), in the Tags filter row too. Both from
  loadTaxiWeeks() (BK_TAXIW, data/taxi-week.json, once per visit). Card: rank, photo, name, fantasy team, NBA team vs opponent + day,
  stat line + minutes, FP. No file = no card. Week 1 2026: Lendeborg 40, Ja'Kobe Walter 33, Harper 31, Brazile
  30, Traore 28 (83 taxi players, 57 played).
  Record links use `#/records/{cat}?rec={slug}` (+ `manager=` for personal),
  which opens and scrolls to that leaderboard.
- `assets/build-data.js`: pulls everything from Sleeper (`api.sleeper.com`, cache-busted),
  applies `corrections.js`, loads frozen seasons. Output = `data/league.json`.
- `assets/records.js`: Record Book (6 categories, filters, record-change history). Every
  category uses the grouped table layout (GROUPS = sections per category, BAD = muted
  records). Manager filter: records with many entries per manager rank his own entries
  1-10 in gold (personal records) with league rank alongside. recordHistory() also emits
  personal events ({personal, owner, order}: a manager beating his own best in a "mark"
  record; bad and schedule/luck records excluded; same performance announced once; last
  30 kept). The Record Book page shows the 6 newest under "Personal records"; league
  "Recently broken", badges and the weekly recap ignore personal events. Oct 2026 additions
  (owner): Players: Most points by a player in a season (all teams), Best points per start
  in a season (MIN_STARTS_SEASON 10) and career (MIN_STARTS_CAREER 40; Playoffs stage view:
  MIN_STARTS_CAREER_PLAYOFFS 3, owner Oct 2026; constants at the
  top of records.js, scaled down for playoff/one-season filters; owner may change them),
  Most points as a rookie (DATA.rookiePool: rookies with locked points per season, built in
  build-data with the ROY rookie rule, carried over once a season is complete, current
  season redone nightly; locked points = that season's scoring, so 2023 is 0.5/pt).
  Matchups: Beat the median by the most, Shootout week (league total, not personal).
  Streaks: Longest playoff win streak; Fastest to 25 wins removed. Win/losing streaks come in
  two versions (owner): "(head-to-head + median)" = every result as Sleeper counts it (from
  2026-27 a week is H2H then median; a 1-1 week ends it) and "head-to-head" only; same split
  for career wins/win %, season wins and worst season record (+ H2H losses). Careers "Vs the
  median": best/worst record vs the weekly league median (all seasons), most lucky H2H wins
  (won below the median) / unlucky H2H losses (lost above it). Milestones (owner): 400 and
  450-point clubs, 1st-place regular-season finishes, career points clubs (POINT_CLUBS every
  5,000 from 15,000, all-time only), 50 career H2H wins (date reached; all-time only), 2-0 and
  0-2 median-era weeks; Player milestones: 60-point club, 1,000-point club (player-season for
  one manager), 40-point playoff performances; the same three by PLAYER in Players & Lineups
  → Milestones (playerCounts(), with managerRows for the Manager filter). New Awards category
  (from awards.js/draft.js banners): manager awards won (GM, Draft of the Year, Steal),
  winners/All-Stars/All-Fantasy rostered, player All-Fantasy/All-Star/individual awards.
- `assets/frontoffice.js`: trades/waivers/drafts valued by locked points ("stints").
- `assets/standings.js`: Legacy score + standings table + final finishes.
- `assets/power.js`: Power Rankings. Preseason edition (owner, Oct 2026; week=0 in the URL):
  LINEUP 60% (best lineup from current roster: PG,SG,G,SF,PF,F,C,UTIL,UTIL, Sleeper season
  per-game projections api.sleeper.com/projections/nba/{season}?season_type=regular under
  league scoring; taxi/IR/Out excluded; pts/week = per-game sum scaled by calibrate() so the
  average team = last season's real average weekly score, owner's choice), DEPTH 10% (next 4), LAST YR
  20% (last finish), SCHED 10% (opponents' LINEUP). build-data saves DATA.preseason[season]
  nightly until week 1 is played, then update.mjs carries it over unchanged. Default edition
  while a season has no games; Home's Power card uses it too; Week 1 arrows = vs preseason.
  No preseason editions for 2023-2025 (no saved projections). Oct 21 2026: a mid-week run rebuilt the 2026
  edition from Sleeper's in-season feed (last box scores, no gp: SGA 52/game), which changed the hype scores and
  the week 1 Main event (jimmy-bigtrey 77 over tzola-burk 59). Fixed: build-data only rebuilds when the feed
  is real projections (rows with gp >= 1 are half or more; same test as dynasty.js seasonFeedOk), else keeps
  the saved edition; scripts/preseason-fix.json = the edition saved Oct 20 5:56 PM CT (before tip-off), merged
  over last night's by update.mjs (verified: slate back to tzola-burk 59, jimmy-bigtrey 47, logan-simeon 34,
  TRT3-BenDover 30). `assets/freeze.js`: frozen seasons + week guard.
- `assets/hype.js`: Matchup Hype (hype score, Main event, labels, moments). TUNING (owner chose
  "V5", Oct 2026, so 100 is reachable): Quality relative to that week's league (top-2 pair =
  100, average pair = 50), Closeness free within 2 Power pts then -3.5/pt, History x1.5
  (capped). 2025 final went 81 -> 91. League rivalries (RIVALRIES + RIVALRIES_FROM in config.js,
  owner IDs; owner chose 2026+ only, earlier seasons untouched): "Rivalry" tag (red) and
  +25 History after the boost, capped (= up to +5 hype); a regular week where every game is
  a rivalry gets a "Rivalry Week" banner (2026: weeks 7, 14, 21). Public "How hype works"
  lists the rivalries (owner made them public Oct 2026). Named rivalries (owner, Oct 2026): RIVALRIES
  entries are [a, b, name] (major: The Finals Fallout jimmy-tzola, The Crown Clash burk-TRT3, The Never
  Ending Negotiation logan-bigtrey, The Race to Relevance simeon-BenDover) + MINOR_RIVALRIES (Battle of
  Brothers TRT3-bigtrey and simeon-jimmy, Culture Clash TRT3-logan); RIVALRY_BONUS {major 10, minor 5}
  added straight to hype (capped 100; replaced the old +25 History boost); isRivalry() returns
  { name, level, bonus }; tag text = rivalry name (major red, minor gold); hype meter shows a bonus
  line; Rivalry Week = every game a MAJOR rivalry. Rivalry page: named-rivalry chips (.rv-named) +
  name banner on the fight card (.rv-title). TRAVELING TROPHIES (owner, Oct 2026): each MAJOR rivalry
  has a trophy (RIVALRIES[i][3] = assets/trophies/<slug>.webp, cut from the owner's image with real
  alpha). seasonSeries(DATA, season, A, B, beforeWeek) in hype.js: R + P (bracket) meetings that
  season (X consolation games excluded), wins, then most points in those games if level (2-2 after a
  playoff meeting, or a tie game); clinched when lead > games left (unplayed scheduled meetings + 1
  possible playoff meeting until one is out: mathematically eliminated (eliminatedBy() = commish
  playoffPicture at the last regular week played, cached), not in the bracket, or lost a P game; level
  on wins with nothing left = decided on points right away); trophyHistory(): holder = latest season
  winner incl. a clinched current season, else vacant ("first awarded this season"). UI: Rivalry page
  "Trophy case" (all 4, trophyCase()) + Minor rivalries chips + trophy in the fight-card banner +
  "The traveling trophy" card (trophyDetail: holder, series, games, still to play, past winners,
  rules); Hype page "Playing for" card (trophyStake, series before that week); Home "Rivalry trophies"
  card (trophyCase(true)) + a trophy line on the Main event card. Starting strength (owner, Oct 2026): before
  PEDIGREE_WEEKS (6) are played, strengthsBefore() blends the real Power score with the PRESEASON
  Power Rankings (preseasonPower(), DATA.preseason) instead of last season's finish, so offseason
  trades/rookies count from week 1; seasons without a saved preseason (2023-2025) still use the
  finish (unchanged). 2026 week 1 Main event went jimmycooks2-bigtrey (71) -> tzola-bigdaddyburk (58).
  Uses only games
  before the week. The page (app.js) fetches Sleeper state + live scores in the browser and
  reveals a week only once it's under way, except week 1, which shows as soon as the season's
  schedule is saved (owner, Oct 2026: every season; HYPE_NOW.pre = preseason, labeled "Opening
  week", no live refresh before tip-off). Live scores
  refresh every minute while the page is open (Home's Main event card too). LOCKED POINTS (owner, Oct 20
  2026): Sleeper's matchup score counts every starter's latest game, locked or not. REVISED Oct 22 2026
  (owner: locks can't be read reliably mid-week): PUBLIC pages (Hype duel + lead line + slate, Home Main
  event, Wager) show Sleeper's live total, labeled "Live" / "Live · updated" (owner removed the "not locked" words Oct 22 2026) + a
  lead-line note; finished weeks show the saved final ("Final · locked scores") = the locked score. Only the
  commish office (Scouting report, Briefing) shows LOCKED points big + live small: liveWeek(season, week,
  { locked: true }) adds `locked` (lockedFor -> gm.js lockedPoints(): a starter counts when his counted score
  is an earlier game than his latest, he has no games left this week, or "I locked him" was marked in this
  browser; null on failure). Public calls never fetch box scores.
  PULL TO REFRESH (owner, Oct 2026): pullToRefresh() in app.js, touch screens only, from the very top of
  any page: arrow follows the finger (.ptr in styles.css), spins past 64px, release = location.reload();
  sideways swipes never start it; html.ptr-on sets overscroll-behavior-y: contain. The nightly
  Action stays once a day (GitHub won't run more often than every 5 min and runs late).
- `assets/transactions.js`: Transactions page data (move kinds, Ledger totals); values come
  from frontoffice.js (trades/pickups/letGo carry `tx` = index into DATA.transactions).
  Players carry `t` = current NBA team (added Oct 2026; older data files lack it). Trade rows
  are links to #/rivalry?a=&b=&trade=<DATA.transactions index> (first two teams of a 3-team
  deal); the Rivalry trade card has id tr-<tx> and is scrolled to and highlighted.
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
  config.js); the owner confirmed the 2025 list. All-Fantasy Team = top 10 of DATA.mvp (now top 60 kept) whose fantasy team at season's
  end made the playoffs (rulebook rule 4.3, owner chose to fix the site, Oct 2026); League
  MVP has no playoff rule. AWARD_SCORING (config.js) {2023: 2024}: 2023-24 award totals (MVP,
  All-Fantasy, ROY, All-Rookie, Commish Award races) use 2024-25 scoring (1/pt; 2023 league
  used 0.5/pt), because the owner already handed out awards that way (Brunson, not Fox).
  DATA.rookiesScoring records the scoring each saved rookie list used; update.mjs passes it
  back, and a list is redone only when that differs (once after a scoring change). Draft Kit stats
  keep each season's own scoring.
  PAST AWARDS ARE FROZEN (owner, Oct 26 2026: "any changes we make now shouldn't affect that"): update.mjs passes
  last night's DATA.mvp and DATA.draftStats to buildLeagueData; a COMPLETED season (lg.status complete) keeps them
  as saved (MVP / All-Fantasy list; draft stats behind Draft of the Year / Steal banners and past Draft Grades
  seasons); only the season in progress is rebuilt. rookies / allStars were already carried. Tested: a planted
  value in the saved 2024 list survived a full build; 2026 rebuilt. NEVER rebuild a past season's award data
  without the owner's OK.
  SLEEPER SEASON TOTALS vs GAME BY GAME (found Oct 26 2026, owner compared Jokic with Sleeper's History): Sleeper's
  season-total feed (/v1/stats/nba/regular/{s}, used for DATA.mvp, draftStats, rookies, dynasty past seasons, award
  races) (1) counts each bonus (40/50 pts, 20 reb, 15 ast) at most ONCE a season and flags bonuses for players who
  never earned them, (2) can miss games (2023-24 Jokic 78 GP: the Apr 14 2024 game vs MEM is missing). The 2K
  breakdown adds per-game box scores = how matchups score. BUT Sleeper's per-game data also contains the ALL-STAR
  GAME as a regular-season game (team/opponent not NBA codes: EST/WST 2024, CHK/SHQ 2025, STP/STR 2026; ~15-24
  players a season), so the 2K numbers include it (Jokic 2023-24: 80 GP / 2,098 pts vs official 79 / 2,085;
  without it = Basketball-Reference exactly). It never counted in matchups (all 47 All-Star-week starters 2023-25
  locked a real game). FIXED Oct 26 2026: config.js NBA_CODES + exhibitionRow(g) (team or opponent not one of the
  30 codes) skips All-Star rows in every per-game reader: breakdown.js weekRows (season tables, recentForm) +
  gameLog, gm.js loadBoxes + lockedPoints, dynasty.js seasonActuals, commish.js loadWaivers; weekfix.js has its own
  copy (allStarRow; no imports there). STATS_VERSION 2 makes the nightly job rebuild data/season-stats.json (until
  then pages build tables themselves). Jokic 2023-24 now 79 GP / 2,989 FP (2023 scoring) = Basketball-Reference.
  The NBA CUP FINAL is in Sleeper's per-game data too (1,231 games a season; Basketball-Reference leaves it out) but
  it DOES count in matchups (2024 wk 9 Giannis locked 64 = Cup final, 2025 wk 9 Anunoby 42), so it is KEPT.
  END-OF-SEASON CHECK (owner asked, Oct 26 2026): per-game data for 2023-2025 has every scheduled team-game with
  stats through the last day (2024-04-14, 2025-04-13, 2026-04-12); the only schedule entries without stats are
  postponed games listed twice. The missing last game is a SEASON-TOTAL feed problem (DATA.mvp, draftStats,
  rookies, award races, dynasty past seasons); past seasons are frozen, the current season still uses the feed.
  SMALL PRINT fpNote(kind) in app.js (.fp-note): 'game' = 2K list card, Season by season, Compare, Injury Report;
  'season' = Awards page (above the lg-fine line), Draft Grades.
  AWARD RACES SHOW BOTH (owner, Oct 26 2026: "default to Sleeper totals but also show game by game"; commish
  Award races only): renderRaces loads gameByGameTotals(season) (breakdown.js season table, AWARD_SCORING scoring;
  { pid: { fp, gp } }) next to seasonTotals(). MVP, ROY, All-Stars race so far, All-Fantasy, All-Rookie rows: big =
  Sleeper's total (decides the race, as before), small .cm-gbg "game by game N +/-gap · N gp" (gp only when it
  differs); line under each list (.cm-gbg-line, gbgLine) = who would be in/out or move if it went game by game.
  Explainer fold .cm-gbg-help at the top (replaces fpNote there): bonuses once a season + phantom bonuses, missed
  games, timing (Sleeper's total a day behind in season), Cup final (in game by game + matchups, NOT in Sleeper's
  total or Basketball-Reference: 2024-25 SGA 77 vs 76, Giannis 68 vs 67), All-Star Game in neither. Checked:
  2024-25 same top 5/10; 2023-24 All-Fantasy same 10, Brunson 8 -> 7, Durant 7 -> 9; ROY Jaquez/Podziemski swap.
  Rookie of the Year / All-Rookie Team (top 5) = DATA.rookies: total fantasy points, rookie =
  NBA games that season and none in the 10 seasons before (Sleeper's years_exp is wrong for
  some players, e.g. Amen Thompson, Yabusele); computed once per completed season, carried
  over by update.mjs. Ties at a team's cutoff are all included. Award order on banners:
  01 GM, 02 Player of the Year, 03 League MVP, 04 Rookie of the Year, 05 All-Stars,
  06 All-Fantasy, 07 All-Rookie, 08 Draft of the Year (draftOfYear in draft.js: best class
  grade from that season's rookie draft judged on year one only, data filtered to seasons/
  drafts/draftStats <= that season so the banner never changes), 09 Steal of the Draft (own
  award since Oct 2026: that draft's pick furthest above its spot after year one, race = top 3;
  08 and 09 carry a "Year-one numbers" tag and a "Today:" line with the live Draft Grades
  numbers when they differ (owner chose to keep year-one banners, Oct 2026);
  startup-only seasons say so). Record Book draft records are locked-points based and
  were renamed "(locked points)" with a note pointing to Draft Grades (owner chose to keep
  both views). Awards lists show position only (Sleeper's NBA team is
  today's) plus the FANTASY team that had the player: season's end for season-long
  awards, the All-Star break week (allStars[s].week; Sleeper fantasy weeks = NBA stats
  weeks) for All-Stars, most-points team for Player of the Year. From awards.js ownerAt()
  over frontoffice `stints`. Coach of the Year on
  hold. frontoffice values carry `weeks` ({k: season*100+week, p}) for season-limited sums.
- `assets/draft.js` + Draft Kit in app.js (#/draft-history, #/future-drafts, #/draft-grades:
  one page with 3 tabs). History: board per draft (2023 startup = 22-round snake, shown but
  with NO tier colors at all (owner, Oct 2026: plain .dk-plain squares, no legend, hover card =
  production only; rookie boards keep colors), and
  never graded; rookie drafts 3 rounds, linear), rows = rounds, columns = draft slot, cells
  colored Steal/Hit/Fair/Miss/Bust (Barely played = light red), Rookie of the Year badge
  ("ROY '25", = DATA.rookies[season][0], also on the Grades pick list), tap -> Player Index;
  mouse hover card (bindTips, only when (hover: hover), so phone taps still open the player)
  shows produced vs expected pts/game and the tier. ?manager= highlight fades other managers'
  picks (dropdown kept across season chips). Rookie boards also render a flipped table
  (.dk-board-phone: rounds across, picks down) shown under 700px instead of the wide one;
  the startup board keeps one layout everywhere. Report cards: "See every pick" lists each class
  (pickRow, shared with Every pick); #/draft-grades?view=cards&manager=ID opens that card. Future: next 3 drafts from
  Sleeper traded_picks (live in browser) via commish pickLedger(); "Own" or holder; trade
  paths; picks held; projected next-draft order = reverse regular-season standings (win %,
  then PF, median games incl.), bottom 2 coin-flip for #1 (shown "1-2"); verified against
  the real 2025 and 2026 drafts. Grades (rules from the owner): pick value = NBA fantasy
  pts PER GAME since the draft under each season's league scoring, whoever rostered him
  (DATA.draftStats: season -> pid -> [pts, games], built nightly). Injury rule (owner,
  Oct 2026): only seasons with 20+ games (MIN_GAMES) count; a pick with none = "Barely
  played" (once a quarter of his first season is done; before that "Incomplete"), never a
  bust. Sleeper can't tell injury from benching, so both are skipped. Expected = least-
  squares a + b*ln(overall pick) per kind (rookie/startup), b <= 0; z = (value - expected)/sd;
  class grade from sum of z (letterFor thresholds); report card = GPA of class grades.
  2024 picks 5 and 11 were filed by Sleeper under "DUPLICATE" entries; fixed site-wide
  with DRAFT_CORRECTIONS (Matas Buzelis 2835, Ronald Holland 2836). Corrections now take `pid` (used before the
  name lookup): Sleeper renamed him "Ronald Holland II" on Oct 21 2026, the name match failed and the nightly
  Scoring check failed 4 runs in a row on the duplicate-pick warning (site still deployed: deploy runs first). Tested: no change to
  any Front Office value, record top 5 or GM of the Year, only the pick-11 name.
- `assets/players.js`: Player Index (#/players, under Hall of Fame): every player's locked
  points with season/manager filters, sort (points, weeks, per start: 5+ starts first),
  search (accent-insensitive), and a breakdown by fantasy team and by season.
- `assets/sync.js`: Google sign-in + Firestore sync of saved settings (see "Cross-device sync").
- `assets/commish.js`: Commissioner's office (#/commish, lock button under the menu, not in
  NAV). Header button "Run nightly update" opens GitHub's workflow page (owner taps Run
  workflow; no token is stored, the repo is public). Passcode asked every time the office is opened (flag also in sessionStorage cm-open so a reload or pull to refresh inside the office stays unlocked, owner Oct 2026; cleared when leaving the route or closing the app); only its
  SHA-256 is stored (the owner knows the code; never write it in files). Scouting report
  (default team bigdaddyburk = Parma John Wall; any team selectable) uses live Sleeper data
  in the browser: rosters, /schedule/nba/regular/{season}, per-game projections
  /projections/nba/{season}/{week}, season stats, matchups. LEAGUE IS LOCK-IN SCORING: each
  starter counts ONE game per week (locked by the manager, else his LAST GAME OF THE WEEK only: owner's
  wording Oct 31 2026; a locked player stays in his starting slot, can't be benched or moved; an unlocked
  starter benched before his last game of the week gets 0 for the week, owner Nov 1 2026: his earlier games
  never count; so a 0 for a starter with games played is a real result, not only a feed error), verified
  against box scores. Projection = per-game proj x lock factor (1g 1.00, 2g 1.11, 3g 1.23,
  4+ 1.25) x 1.08 calibration; backtest 2024-25: ~27 pt avg miss, picks winner 72%.
  Playoff picture tab: playoffPicture() clinch/elimination math (6 teams, top 2 byes,
  QF 3v6 and 4v5, verified against 2025's real bracket), magic numbers, season/week pickers.
  Weekly recap tab: weeklyRecap() plain text + copy button. Health report also has a taxi
  limit check. LEAGUE TAXI RULE (from the owner): a player may stay on taxi until he
  completes his 3rd NBA season (TAXI_SEASONS = 3 in commish.js). This matches Sleeper's own setting
  (owner's screenshot, Oct 2026: "2 Years: players with more than 2 years of experience in the NBA must
  be activated from the Taxi Squad"; rule 2.1 now quotes it). Flagged once he played 3 NBA seasons before this one,
  counted from real games. Taxi SIZE check (owner, Oct 2026): TAXI_SIZE = 15 in commish.js
  (rule 2.3), "Taxi squad size" card lists every team's count, flags any over 15.
  TAXI LOG (owner, Oct 2026, after the Adem Bona inquiry; Sleeper keeps no taxi history and matchup
  "players" include taxi): update.mjs saves data/taxi-log.json { since, at, last: { owner: [pid] },
  events: [{ at, owner, pid, name, move: on | up (activated) | out (left roster while on taxi) }] } on
  every run (last 1000 events); Health report "Taxi moves" card (newest 25).
  Rule 9 Wager Weeks (rules.js, 2026-27 only, weeks 8-14): lowest score funds a $5 parlay, max 2
  times per manager, then next-lowest manager not at the limit (owner's wording made official).
  Tabs: Scouting report, Waiver wire (unrostered players with an NBA team, Out hidden:
  risers = last-14-day FP/G vs season, Sleeper trending adds 48h, best available,
  streamers by projected locked pts), Draft picks (future rookie picks from
  /league/{id}/traded_picks + trade paths from DATA.transactions; next 3 drafts), Award races (season picker; live season totals + rookies from
  Sleeper via seasonTotals(); every award in banner order 01-09 + Championship MVP; finished
  seasons match the Awards page), Early hype (unrevealed
  regular weeks' hypeSlate, default = next week to be revealed; views (owner, Oct 2026): Summary /
  Hype page = renderHype(box, params, previewWeek) / Home = renderHome(box, previewWeek): the real pages
  as that week will look (now.week = preview, live labels, no live scores, "Tip-off pending", links stay in
  #/commish?tab=hype&view=page&week=&m=; other Home cards show today), Health report.
  Health report: GitHub runs, scoring-check.txt, week-guard.json, warnings, corrections,
  lineup check, activity (flag >21 days in season), trade review (750+ net, 4+ trades/pair).
- `assets/gm.js` + "My GM" tabs in the commish office (Assistant GM, owner's plan Oct 2026).
  The commish tab bar has groups: My GM (Briefing = default tab; the Lock-in coach is now "Assistant Coach" and
  was MOVED to Test features by the owner Oct 26 2026: TEST_FEATURES entry id 'coach', so ?tab=coach and the
  Briefing's links still work; code comments still say Lock-in coach) and League
  office (the 8 older tabs; Scouting now needs ?tab=scout). Every GM tab has a team picker
  (default COMMISH). Planned next, in order (owner agreed): dynasty value model (3 seasons,
  this one weighted most) -> Dynasty + Managers tabs, Trade finder (Sleeper's trade block is NOT
  in the public API; owner keeps his own block in localStorage), Playoff odds INSIDE the Playoff
  picture tab (Monte Carlo + "root for"), Draft helper last (before the 2027 rookie draft).
  Lock-in coach MATCHUP BOARD (owner's sketch, Oct 2026): top card shows both CURRENT starting 9s
  across from each other (you left, opponent right, slot in the middle; .mb-* in styles.css), team
  header "locked points (starters left to lock)" with the gap above "vs" (owner, Oct 22 2026: "+12 (2 more)" = your
  locked lead, green up / red down, then starters left to lock vs theirs: N less / N more / even; what-if locks
  count, tally() treats them as locked; .mb-gap; below it "Z per slot" = |gap| / |difference in starters left|, hidden when
  either is 0, .mb-per; then "Median: N per slot" = (projected median coach.now.medianScore - your locked) / your starters
  left to lock, "Median: already past it" when locked >= median (owner, Oct 24 2026; medianPer)), score boxes next to the slot (locked = navy, live =
  orange, unlocked score = outlined, none = dash), then Bench and IR sections (both teams, no
  scores); phones show "D. Fox" names. Every player (both teams, starters/bench/IR) taps open his
  card below the row (.mb-detail, open keys kept in MB_OPEN across refreshes): starters = the lock
  card (opponent's without "I locked him"), bench/IR = week's games + what he could still add. The
  separate call-card grid is gone. Each player shows a dynasty tier tag (coachDynasty(), injured at
  FULL value always, owner's choice); under each team score a small "if locked now" line = locked +
  every unlocked lock/wait score (live games not included), (left minus those players), injury tag, and a green "Today vs X" chip + green edge
  (.mb-on) when his team plays today; bench/IR players with no games left (future or today
  pre-game) are red + struck through (.mb-gone).
  Lock-in coach: optimal stopping per starter. One game ~ normal(mu = Sleeper per-game projection
  over games it projects > 0 (loadWeek perPlay) x LOCK_CAL 1.04, sd = 0.30 mu); lock bar with k
  games left: V1 = mu, Vk = E[max(X, V(k-1))]; risk Safe/Balanced/Bold shifts bars -0.25/0/+0.25 sd
  (owner chose Balanced default; saved in localStorage gm-risk). Backtest 2025-26, all starts:
  coach 65,348 vs managers' real 62,199 (last game 53,052, hindsight 68,250); bigdaddyburk 8,707 vs
  8,402, flips weeks 6 and 18 losses + week 12 tie to wins. Sleeper's public API doesn't show
  locks: players_points = score counting now; if it differs from his latest game and equals an
  earlier one, he's locked; else the "I locked him" button (localStorage gm-locks-{season}-{week}).
  PICK THE LOCKED GAME (owner, Oct 22 2026: "sometimes I miss a lock"): a mark is { date } = locked on
  that game; every PLAYED game chip on a starter's card (both teams) is a button (.gm-pick): tap = he was
  locked on that game, tap the marked one again = undo; "I locked him" = his latest game. A mark beats
  Sleeper's own reading (coachCall checks it first) and lockedPoints counts the marked game's score. Old
  number marks still work (= the counted score). row.lockDate = the locked game (marked or inferred).
  Marks are per player and count for EVERY team (owner, Oct 2026): gameCoach passes them to all teams,
  so marking an opponent's player (pick his team, or "They locked him" on the opponent's card on your
  board) shows in your board, odds, Briefing and live locked points; marking clears the LIVE cache.
  Box scores per game from /stats/nba/{season}/{week}. Assumes a DNP doesn't replace the counted
  score (not verified yet). Checked Oct 21 2026 (week 1, nobody had 2 games yet): every one-game starter's
  players_points = his box score exactly, team points = sum of starters; schedule status names are
  pre_game / in_game / complete (code now accepts in_game as well as in_progress); live box rows carry
  sp (seconds) but no gp until the game ends. LOCKS ARE REPORTED this season (Oct 23 2026: SGA counted
  Tue's 52 after Thu's 24). LAG BUG (owner, Oct 23 2026): right after a game Sleeper's counted score can still be the
  earlier game, so Holmgren read as "locked on Tue's 30" after Thu's 39 went final (counted 39 by morning) and the
  owner couldn't undo it. Fixed: no lock is inferred from a game played TODAY (coachCall + lockedPoints: latest.date <
  today), and a "Not locked" button on every locked card sets the mark { none: true } (ignore marks + Sleeper's
  reading; lockedPoints counts him only with no games left; "Undo 'not locked'" clears it; data-act on .gm-mark).
  NO AUTO LOCKS (owner, Nov 6 2026: "when I lock a score it'll show a different game as locked later"): coachCall and
  lockedPoints NO LONGER infer a lock from Sleeper's counted score (players_points flips between games read to read, see
  THE MATCHUPS FEED DISAGREES WITH ITSELF). Locked = a mark only (local gm-locks or a Dev Dashboard pick); a marked game
  keeps its lock all week and its points = that game's CURRENT box score (a Sleeper stat correction shows); no mark =
  unlocked until he has no games left, then his last game counts ('final'). Local marks now carry t; undo saves
  { cleared, t }; gm.js mergeMarks(local, lawMarks) = the NEWER of a coach mark and a pick wins per player (lawMarks now
  carries at = the pick's save time; marks without t lose to a pick, as before). Used by gmWeek and lockedPoints. The Dev
  Dashboard (solver, Needs you, feed hints, Likely locked) is unchanged, and coach marks still save as picks (coachPick).
  Opponents' unmarked locks are now unknown to the sim (treated as unlocked smart players).
  HELD, NOT DONE (owner, Nov 6 2026: "the ONLY time a player should be auto locked is if they are still in the lineup at
  the end of the NBA week when all games have completed"): a starter whose own games are over while the NBA week isn't
  (any game on the week's slate not 'complete') is call 'held' (label Held, outlined score box, gold card like Wait), NOT
  'final': not in locked points / the board's locked tally (counted in "left" and the small "if locked now" line),
  planner piece fixed + benchable (the best fit can sub him out for a later player), lockedPoints counts an unmarked
  starter's last game only when weekDone (every game final). 'final' ("Week over: his last game counts") only then.
  Still to check: whether a DNP replaces the counted score (Oct 23 9 am: no week-1 starter had played, then sat a later team game; only 4 starters had 2 games, all played both; re-check after Fri/Sat/Sun games).
  Modes (localStorage gm-mode, was gm-risk): "Play to win" (Beta; was the default until Oct 20, 2026, see SLOT PLANNER),
  plus Safe/Balanced/Bold points modes. gameCoach(): builds every team's lockCoach rows -> sim
  states (simState: {fixed} or {cur,k,mu,sd}); winChance() plays out the week (seeded RNG, 3,000
  runs, other unsettled players follow Balanced bars; opponents' locks inferred the same way);
  for each unlocked score compares lock vs keep playing on P(H2H win) + P(beat median) (owner's
  goal: both), diff < 1% -> keep the points call. Backtest 2025-26 regular season vs opponents'
  real scores (H2H+median wins, 168 team-weeks): managers 167, Balanced 195, Play to win 196-201
  over 4 runs (~199): small but never worse. Bench swaps (owner's Sleeper rules): a bench player
  earns only games AFTER he's moved in; locked starters can't be moved; a benched starter's score
  is lost. Swap if bench worth (Balanced value of his future games) beats the starter's keep value
  (settled score, or max(current, bars[k])) by 3+, slot eligibility via fantasy_positions
  (teamRoster `elig`), top 3, each with win chance before -> after. Opponents (owner, Oct 2026): every
  team but yours is simulated with bestLineup() = its best healthy lineup from now on (locked /
  in-progress starters stay; Out/IR/Suspension/Inactive/Doubtful starters keep only their current
  score; healthy bench players with games left fill slots they fit; greedy by value, pickiest slot
  first). Your lineup stays as set. SCORE_CAL (owner asked why Briefing ≠ Scouting, Oct 2026): the
  sim draws games around 1.082 x projection (the measured average game) while lock bars keep
  LOCK_CAL 1.04 (gameDist: mu/sd for draws, barMu/barSd for bars); before, scores ran ~6% low.
  Scouting report also shows the opponent's "Best lineup" projection (bestLineup() players scored
  with the report's projNow) + a note naming who moves in/out; now within ~3% of the Briefing.
  Coach shows "Their best lineup" (From bench tags + assumed-out
  list); Briefing odds/expected finals use the same.
  SLOT PLANNER (owner, Oct 2026; replaced per-starter bars, winChance and the greedy bestLineup in
  gameCoach): every team's roster is planned against the 9 slots. teamPlan() -> pieces (starters +
  healthy bench; games = schedule minus dates Sleeper projects at 0 = loadWeek missDates; no games
  left -> fixed, movable) -> makePlan(): plan.now = bestFit() (Hungarian, max total value, slot
  eligibility via fits/SLOT_FITS), plan.T = lockBar() per piece per game day, nowLock. lockBar(plan,
  pi, d): keep = best fit with him valued at his own W (Balanced value of his games left); lock
  value = his score + best fit of the others in the other slots; bar = keep - best rest (= own bar
  when nobody competes; better players with games left raise it; drops as they run out). Lock slot
  = best rest, ties -> fewest other players fit it, pickier slot, current slot. Text names the slot
  (+ "move him there", who shifts, "keep G open for X" when X still has games) and the rival
  (bumped). simTeam(): day by day, bench players who play today move in for the weakest starter they
  can replace (bitmask feasibility; a benched score is lost), locks at plan.T; same luck per piece
  index across versions (CRN). gameCoach: 2,000 runs, all 8 teams with the same planner (owner: assume
  opponents play smart), Play to win compares planWith(lockSlot) vs planWith(playOn); asSet = your
  starters only. lineupMoves(): swaps (bench +3 hysteresis, "before {first game}", "X plays Mon
  first: lock only at T+") + slot moves; swapList shows odds as set vs following the coach.
  Projected median (owner, Oct 24 2026): oddsOf() also returns medianScore = average over the runs of that run's  median ((4th + 5th of 8) / 2); gmOdds shows "Projected median N" next to Beat the median (coach + Briefing).
  COACH TRACK RECORD (owner, Oct 24 2026: "track every win % ... look at past weeks as they accumulate"; owner OK'd
  the mockup): `assets/coachlog.js` (no DOM/Node APIs) + update.mjs (try/catch) -> data/coach-log.json { version,
  at, seasons: { s: { weeks: { w: { days: { date: { at, r (1 = rebuilt later), t: { owner: [h2h, median chance,
  projected median, expected final, opp's expected final] }, c: { owner: [[pid, name, score, game date, later
  scores, counted now]] } } } } } } } }. Every run: week = Sleeper state (regular/post), plus last week if logged;
  each slate date <= today without an entry gets snapshotDay(): rewind() rolls the week back to that morning (boxes
  and finished games before it, statuses pre_game, Sleeper's counted score = a lock only if his next played game was
  before that day, else his latest game before it), gameCoach for all 8 teams (Balanced; odds same in every mode),
  ~1 s a morning. First write wins per date (a 2 AM run = that morning); week 1 Tue-Sat 2026 rebuilt (owner chose
  it; marked *: today's lineups/projections/injuries). refreshCalls() updates every call's later games + counted
  score each run. Each team's own view assumes it follows the coach (SCORE_CAL) vs others at OPP_CAL, so the two
  sides of a game add up to LESS than 100% (week 1 Tue: 30% + 50%): matchups use ctChance = average of both views.
  Card "How the coach is doing" on the Lock-in coach (ctCard/fillTrack in app.js, .ct-* in styles.css, above "How
  the coach decides"): Show picker = Season scorecard / Week N (CT_VIEW kept across refreshes); week = per matchup
  each morning's chance for the left team (navy = favoured), expected (last morning) + final; your team morning by
  morning (win, median, expected you-them, projected median, lock calls: held = no later game beat it, locked =
  counted at the end) + a live "Now" row (coach.now) + Final row (DATA.games / medianGames). Scorecard (finished
  weeks only; First / Every / Last morning chips): favourite won, Brier (win, median), expected final and median
  miss, lock calls held + followed (only calls with a later game), calibration buckets 50-100% (bar = won, gold mark
  = said), by weekday, by week (tap opens it). Tested on live week 1 + made-up results (local only).
  ~0.6 s desktop mid-week. Owner (Oct 20, 2026): Balanced is the DEFAULT (localStorage key moved
  gm-risk -> gm-mode so old saved choices reset) and Play to win carries a "Beta" tag (.gm-beta).
  IT HAPPENS THE MOMENT A WEEK ENDS (found Oct 26 2026, 2026 week 1): right after the week, the matchups
  feed already had wrong team scores (e.g. bigdaddyburk 358 vs official 381, jimmycooks2 317 vs 390: Kawhi
  Leonard's locked 41 shown as 0), starters_points for some players = a different game than the one locked,
  and it kept changing the next morning (simeon 310 -> 313 -> 339). The site saved those, so standings
  showed 1-1 records that never happened, Power Rankings and rivalry finals were off; the Scoring check
  caught it (failed run). TRUTH = rosters settings fpts / wins / losses (official standings, cumulative).
  Week 1 fixed by hand in corrections.js (scores from fpts; players = the only combination of each
  starter's box-score games that sums to the official score, closest to Sunday night's saved values;
  simeoncampbell7 + BenDoverPlz123 had several fits: the owner read them in the Sleeper app Oct 26; all 8 teams
  now sum to the official scores). Oct 28 2026: TRT3 had 7 fits and the pick was WRONG (Sabonis 34 / Siakam 39;
  app: 40 / 33): whole lineup now pinned from the owner's app read. Same day the owner read the last open players:
  jimmycooks2 Brown 38 / Buzelis 27 / Wembanyama 40 (was 35 / 27 / 43, also WRONG), BenDoverPlz123 Young 36 /
  Barrett 38 / Carter 21 (right). Week 1 is now fully confirmed (every multi-fit team read in the app). CAUTION: in the app the
  owner first read each player's best game (sum 408 vs official 394); always check a team's pins add up to fpts.
  AUTOMATIC FIX BUILT Oct 26 2026 (`assets/weekfix.js`, no DOM/Node APIs; called from build-data only when
  update.mjs passes `weekFix`; the browser fallback still uses the feed): every run recordOfficial() saves
  the official cumulative totals per owner [pf, w, l, t] under last_scored_leg in data/official-weeks.json
  { seasons: { s: { legs: { N: { at, t } }, weeks: { w: { owner: answer } } } } } (only when every team's
  w+l+t = leg x 2 (median era), so playoff legs / half-updated tables are never saved; fpts is regular season
  only: verifySeason passes on every frozen season). During a live week (state week > last_scored_leg)
  recordLive() snapshots each team's starters + counted points -> data/live-weeks.json { seasons: { s: { w:
  { runs: [{ at, seen?, t: { owner: { s, p } } }] } } } } (unchanged run = `seen` time only; newest 4 weeks;
  runs = 2 AM + every upload). For finished REGULAR weeks settleWeeks(): team score = corrections.js score ??
  legs[w] - legs[w-1] (missing leg w-1: legs[w] minus the site's own weeks so far), trusted only if it gives
  the same H2H + median wins as the official table; per starter settleTeam(): candidates = his box-score games
  that week (weekGames: /stats/nba/{s}/{w}, gp or sp, league scoring; no games = 0); corrections.js players
  are PINNED (single value, matched by name); newest snapshot taken on or before the week's last game date
  (lastSnap) = hard fact when it shows a lock (counted = an earlier game while a later one was already
  played) or he had no games left after it; else every game, last game preferred. Lineups tried: newest
  snapshot's starters, then the feed's. Exactly one combination that adds up = 'unique'; several = 'tie'
  (the one closest to the preferred values is used AND the players that differ are listed in the Scoring
  check with their games, until corrections.js pins them); snapshot didn't fit = relaxed + listed; nothing
  fits = 'nofit' + listed. Answers saved in weeks[w][owner] { v, key ([score, corrections]), how, fits,
  unsure, players, games, snap } and redone only when the score or corrections change. Corrections still
  win over everything; the week guard keeps working (official weeks match the standings).
  TESTED Oct 26 2026 on real week 1 (browser, live Sleeper): without corrections 4 teams unique and right,
  4 ties (the "most likely" pick was WRONG for jimmycooks2: Brown 38 vs 35, Wembanyama 40 vs 43, which is
  why every tie is listed, never trusted); with a simulated Sunday 2 AM snapshot 6 unique, all 72 picks
  right (open = players with a Sunday game who weren't seen locked); full buildLeagueData with corrections:
  8/8 unique, scores 394-305, 383-305, 343-390, 381-402, median 382, playerWeeks identical to the live file.
  BenDoverPlz123 week 1 Trae Young 36 / RJ Barrett 38 / Wendell Carter Jr. 21 pinned from the site's values
  (owner's app check only changed the other 3). Playoff weeks still come from the bracket + feed (fpts has
  no playoff points); live snapshots are saved for them too but not used yet.
  SUNDAY-EVENING RUNS (owner, Oct 26 2026): update.yml also runs Sundays 8 PM + 11 PM Central (crons
  '0 1/2/4/5 * * 1', same offset gate as 2 AM) just to snapshot the live week; Draft Scout + contracts now
  run once per Sunday (built/at !== today). Snapshots save g = games each starter had FINISHED (finishedGames:
  his box rows whose game_id the schedule /schedule/nba/regular/{s} calls complete; box rows have NO gp this
  season, only sp), so candidates() knows exactly which games were done. Lag guard: an earlier-game value is
  a hard lock only when a later game was finished on an earlier day than the snapshot (same-day = soft,
  most likely only); counted = his latest finished game with nothing left = hard. Simulated Sunday 11 PM
  snapshot of week 1 (true values): 8/8 unique and right with NO corrections. A run GitHub delays past
  midnight is dated Monday and ignored by lastSnap.
  SLEEPER'S OLD WEEKS ARE BROKEN (found Oct 21 2026): /v1/league/{id}/matchups/{week} for 2024 and 2025
  now drops many locks (players_points / starters_points = latest game or 0; e.g. 2025 wk 21 Parma
  327 live vs 422 real; season totals 53,147 vs 59,653). Backtests MUST take real scores from
  league.json games (ap/bp) and locked points from playerWeeks (bt useFrozen). Box scores and weekly
  projections are fine. The Oct 20 backtest numbers (managers 167, Balanced 185, Play to win 176,
  "opponents +22/week", "managers lock worse") used the broken feed and are WRONG.
  THE MATCHUPS FEED DISAGREES WITH ITSELF (found Oct 31 2026 11:58 PM CT, week 2, every game final): 40 reads
  seconds apart (api.sleeper.app + api.sleeper.com, cache-busted) gave DIFFERENT starters_points for 8 starters,
  team `points` always = the sum of that read (so each read is one consistent server copy). Two kinds: (1) lock vs
  latest, ~50/50: Pritchard 36 (Mon, first game) x21 / 37 (Fri, latest) x19, LaVine 34 (Thu) / 10 (Sat, latest),
  Peterson 27 (Mon) / 25 (Sat); (2) real score vs 0, mostly real: Toppin 24/0, Garland 28/0, D. White 18/0,
  Podziemski 37/0, Queta 22/0 (4-9 of 40 reads = 0). Team totals jumped e.g. simeon 222 / 246 / 250 / 274 within 10 s.
  So ONE read (recordLive snapshots, the coach, lgs.mjs) is a coin flip for some players. Also VanVleet (Parma) = 0
  on every read with 3 finished games (36 seen Oct 30, 29 Oct 31 2 AM): the OWNER LOCKED HIM ON FRIDAY'S 29, so the
  feed DROPPED A REAL LOCK to 0 while the week was still live (Saturday night) on every server copy.
  ANSWERED Nov 1 2026: the owner locked Pritchard on Monday's 36, so the earlier-game reads were the truth and the
  "latest game" reads were copies that LOST the lock. Every error seen so far loses information (lock -> latest
  game, or -> 0). LATER DISPROVED the same day (Bane, Peyton Watson: false earlier-game reads): feed readings are
  hints only, see `assets/locks.js` + DEV DASHBOARD.
  The real-vs-0 players (Garland, Toppin, D. White, Podziemski, Queta) ALL still had a Sunday game; LaVine,
  Peterson, VanVleet didn't. Fits the owner's rule: an unlocked starter's score isn't settled until his last
  game of the week, so some server copies may show 0 for him meanwhile (not every unlocked Sunday player
  flickered in 40 reads: Bane, Wagner, Kessler... stayed put). Side note: /schedule/nba/regular/{s} rows carry
  home/away .starters = NBA starting five (a free source for GS; not used yet).
  MATCHUP / SPREAD BACKTEST (owner asked, Nov 4 2026: should boom/bust, splits and vs-defense feed the coach? harness
  deleted, NOTHING CHANGED IN THE COACH YET): every played game with a Sleeper per-game projection >= 15 FP, 2024-25 (14,864)
  and 2025-26 (15,443), league scoring; defense numbers from earlier games only (8+). Projections look pre-game (957 DNPs
  in 2025-26 still had a projection > 0). Fit 2024-25, test 2025-26: (1) SPREAD is the big one: actual / projection sd by
  projection level 15-20 0.49, 20-25 0.42, 25-30 0.37, 30-35 0.33, 35-40 0.29, 40+ 0.27 (same both seasons); the coach's flat
  LOCK_SPREAD 0.30 puts only 67% of games inside its 80% range (level-based: 81%), log-lik -2.831 -> -2.698 per game. A
  player's OWN spread (boom/bust) adds nothing beyond his projection level (shrunk personal sd scored worse). (2) Defense:
  raw "FP allowed vs average" is already in Sleeper's projections (t 0.3 next to the other term); "players beat their
  projection vs this D at this position" carries over: coef ~0.30-0.40 (t 3-5), typical +-1.5%, extremes +-3-4%, MSE -0.3%.
  (3) Back-to-back -2.5% (t -3.4 in 2024-25, -1.6 in 2025-26) but ~0 out-of-sample gain. (4) Home +1%, nothing out of
  sample. (5) Player-specific splits (his own B2B / home / soft-D edge) don't repeat half to half (corr -0.02..0.11): noise.
  Side finding: calibration by projection level (15-30 projected score ~92-94% of projection, 35+ ~97-100%) vs one SCORE_CAL.
  LOCK + ODDS BACKTESTS (same day, owner said build it): lock policy on 5,154 / 5,379 player-weeks (2+ games, 15+ proj)
  of 2024-25 / 2025-26, every variant (flat / level spread, +defense, +calibration by level) within ~0.1% of the others at
  its best LOCK_CAL (153.2-153.5k / 156.2-156.5k locked pts; last game 124.7k / 126.5k, hindsight 164.3k / 167.9k): locks
  don't care. Level spread was ~0.1-0.2% worse for locks at the same cal -> BARS KEEP flat LOCK_SPREAD. Lower LOCK_CAL (0.96)
  scored a bit more in this points-only test but the Oct 21 wins/slot-aware test said keep 1.04: NOT changed. Team-week
  odds (167 / 162 real team-weeks, playerWeeks starters, coach lock policy simulated): predicted final sd flat 26 / 25 vs
  real 29 / 27; level 27 / 27 (z sd 1.15 -> 1.10, 1.08 -> 1.03; 80% range holds 75 -> 76%, 80 -> 81%).
  BUILT (Nov 4 2026): `assets/matchup.js` (no DOM): data/matchup.json { version, at, season, sk, weeks: { w: { 'DEF|G':
  [actual, projected, dates] } } } (nightly updateMatchups, current season, finished weeks kept, current week re-read;
  ~15 KB at week 3); matchupTable() -> per DEF|G ratio vs the league ratio (edge), games; matchupFactor(table, opp, pos)
  = 1 + COEF 0.33 x edge clipped +-CLIP 0.12 (max +-4%), only with MIN_GAMES 8+ (same group rule as defense.js pos5).
  gm.js MODEL { spread: 'level', matchups }: simSpread(pg) (SPREAD_BY_PROJ, interpolated) for gameDist's simulation sd
  only; setMatchups(table) (app.js gmWeek loads it before gameCoach; update.mjs sets it before the coach track record);
  coachCall puts mf (factor) on every sched game, perGame = projection x average factor of games left (pgRaw = without),
  bars from it; teamPlan pieces get fac per game (starters from sched mf, bench from gameFactor), simTeam multiplies each
  drawn game by its factor, W table by the average; pipeline seqWorth per date. weekTotals (Weekly Props) runs with
  spread 'flat' + no matchups and restores MODEL (owner: lines never move; lockedDraws already flat). UI (renderCoach):
  .mb-mu chip ("+4%" green / "−3%" red) on upcoming game chips when the factor moves 1.5%+, and a .gm-mu line on lock and
  bench cards ("Matchups: Fri @ NOP +4% · Sun vs UTA +3%. + = guards have kept beating their projections against that
  defense this season. Already in his expected score."); hidden for locked / final players. B2B, home, personal splits
  and personal spreads NOT used (backtest). Checked Nov 4 2026, week 3: MIL vs centers edge +28.2% / 8 games by hand from
  raw box scores + projections (clipped -> +4%); 78 of 90 DEF|G ready; Parma (median only) 32% -> 35% (spread) -> 34%
  (+matchups), expected 332 -> 339; no page overflow at 402; no console errors on Briefing / coach. The coach track
  record (coach-log.json) logs with the new model from the first night after upload.
  RECALIBRATION (Oct 21 2026, fit 2024-25, test 2025-26, frozen scores, harness deleted): one game =
  0.975 x proj for every active-roster player (2025-26: 0.981; old 1.082 came from hindsight lineups)
  -> SCORE_CAL 0.975 (your team's draws); simulated opponents matched their real finals at ~1.0 x ->
  OPP_CAL 1.0 (simTeam { scale } for other teams); managers lock about as well as the coach's own bars
  (94% / 100% of the edge over last-game), so no lock-skill discount (simTeam { skill } exists, = 1).
  LOCK_CAL stays 1.04 (0.975 bars: same on 2024-25, 3-6 wins WORSE on 2025-26). TUNE in gm.js holds
  score/lock/opp for tests. Wins of 336 (fair start = lineup picked from projections; managers' real
  168/165 are not comparable, their final lineups carry hindsight/news): idle slots filled: Balanced
  155 / 143, Play to win old sim 151 / 143, CALIBRATED 161 / 145; lineup set once: Balanced 145 / 135,
  old 146 / 131, calibrated 152 / 137; points equal. Slot-aware vs own bars (Balanced): filled +4 / +5
  wins, set once +4 / -1, managers' final lineups +2 / -3.
  WHAT-IF LOCKS (owner, Oct 21 2026): card button "What if I/they lock him (in SLOT)?" -> localStorage
  gm-whatif-{season}-{week} { pid: { date (his latest game), slot } }; coachCall treats it as locked
  (row.whatIf, valid only while that game is his latest), teamPlan closes the suggested slot (occupant
  takes his old one); coach page + Briefing only (lockedPoints reads gm-locks only, so Home/Hype/live
  scores never change); dashed .mb-whatif box, .mb-wi row, "What-if" label, banner with Clear
  (whatIfBanner/bindWhatIfs in app.js). "I locked him" marks stay the real ones (this device only).
  Also fixed: .mb-locked/.mb-live were colouring whole board rows; now scoped to .mb-pts.
  Briefing: lock calls, this week (gameCoach's expected finals + win/median chances), lineup tips
  (swaps), "Games by day" (owner, Oct 22 2026, for streaming; replaced "Tonight": day buttons for every
  date of the week with games + player count, today selected, choice kept across auto-refresh in GM_DAY;
  panel = active roster (starters + bench) who play that day in tip-off order, slot/Bench, matchup, score
  / Live / DNP / tip time), injury news (localStorage gm-inj-{owner}, rolls over daily), top 3
  waiver risers. TIP-OFF TIMES (owner, Oct 22 2026): Sleeper's schedule has dates only, so gm.js
  loadSlate() adds g.tip (UTC ISO) from ESPN's public scoreboard site.api.espn.com/.../nba/scoreboard?
  dates=YYYYMMDD (one request per date, CORS *, no date ranges; cdn.nba.com refuses browsers), cached
  6 h in localStorage gm-tips-{date}; ESPN codes GS/NO/NY/SA/UTAH/WSH -> Sleeper GSW/NOP/NYK/SAS/UTA/WAS;
  browser only (no localStorage = no times). tipTime(g) = "6:30 PM" Central; app.js tipShort = "6:30p".
  Shown on Lock-in coach game chips (upcoming games), the board's "Today vs X · 8:30p" tag (.mb-tip keeps
  it lowercase) and Games by day. Board rows with a lock call say "TEAM · Lock by 8:30pm on Fri"
  (owner, Oct 22 2026; next game's tip, "today" for today, "Lock before Fri" without a time; .mb-lockby wraps).
  Unlocked starters (Wait/Plan/Live) and bench players also get "· Next Fri 8:30pm" (owner, Oct 22 2026; nextTip in
  renderCoach; skipped when the next game is today, the Today tag already has the time; .mb-wrap).
  STARTING PIPELINE (owner, Oct 22 2026, streaming; "Beta" tag until the owner has tested it): card under the board on the Lock-in coach (pipelineCard in
  app.js, .sp-* in styles.css; logic startingPipeline(coach, slate, date, today, boxes) in gm.js on coach.plan's
  pieces). Day buttons (days left with games; today only while a game is to come or one just ended; choice kept
  in PIPE_DAY), tip-off chips, a "Before {first tip}" moves box, then one row per slot. Per day: values use
  Sleeper's projection for THAT game (teamRoster dayProj = per-date projections from loadWeek) through seqWorth
  (W table with per-game mus). Main lineup = best fit with that day's players (bench needs +3, bench players with
  no game that day excluded); then OPENERS: a player whose game ends (GAME_LEN 2h15m after tip) before a main
  player's tip (or, for a starter with no game that day and no held score, before his next game) keeps that slot
  warm for free. Each row: line x = what the replacement is worth (opener: the player he warms it for; else the
  best spare bench player tipping after his game ends) when that beats his own later games; swapIn() checks slot
  fit, letting only players whose game hasn't started (or who don't play that day) shift slots; lock bar = plan.T
  (or the row's bar once played); bar = red under x / grey keep / navy lock, gold marker = his score (live/done);
  one more link (r.next) when the replacement has his own later backup. Every player shows "worth about N" = valueNow() (owner, Oct 2026: same number as Bench players to start; whole-week value, so it can differ a little from the line, which uses that game's projection). Players holding a score the coach says to
  lock show that call instead. Locked / what-if spots are closed (what-if shows in its suggested slot). Re-renders
  with every lock mark / what-if (same gmWeek). Known limits: later days assume today's lineup; a spare bench
  player can be the backup for 2 rows (said in the text); a played-and-low starter is usually swapped through the
  "Now:" moves box (main fit) rather than a row verdict.
  scoutWeek().started is false in preseason (HYPE_NOW.pre), fixed Oct 2026.
  STEP 2 (built Oct 2026): `assets/dynasty.js` dynasty values (owner: weights 50/30/20, 0-100 score,
  blunt Managers tone). Per player: v1 = Sleeper season per-game projection (league scoring;
  Out = x0.5; no projection -> last season 10+ gp), v2/v3 = AGE_CURVE (fitted 2015-2025, 3,017
  player pairs, centered; beat flat on 2019-23 checks). worth = E[max(0, raw - floor)] with
  uncertainty 4 (6 if age <= 22), floor = waiver line = mean FULL-HEALTH raw of the 158th-177th best
  players with an NBA team (FLOOR_BAND; owner Oct 2026: the old 5th-best free agent flipped scores by
  a point on every pickup/drop/injury; a 3rd-8th FA average was tested and was WORSE, 0.4 swings);
  roster moves and Out listings never move it; set to match the old line (20.1). One-time rebuild
  (update.mjs hist.floorV2): this season's nights via rebuildSeasonDays() (rosters rolled back through
  transactions after each day's end, that night's saved projections unless only rounding differs, saved
  Out flags; nights without saved projections shifted by the first rebuilt night's change) + last
  season's weekly rebuild re-run (backfill now keeps every earlier-projected player, at his last value);
  score = 100 x worth / top. Injury
  toggle (owner, Oct 2026): dynastyValues(DATA, f, { fullInjured }) from localStorage gm-dyn-full
  ("Injured: discounted / full value" on the Dynasty tab; applies to Dynasty, Trade finder, Managers,
  Waiver wire). Discount = Out players' v1 x0.5 (p.outCut); above-floor scoring makes it big for
  mid-level players (Ingram 35 -> 11). Rows say "listed Out: this season at half / full value";
  trend arrow compares v3 with the undiscounted v1. Score history (owner, Oct 2026): update.mjs saves
  data/dynasty-history.json nightly ({ days: { date: { pid: score | [score, fullValueScore] } } },
  rostered or score > 0, ~3 KB/night; in try/catch so it never breaks the run); tapping a Dynasty
  roster row (.dy-row) opens an SVG line chart (bindScoreCharts: nightly points + today live, tier
  lines, high/low summary). Backfill (owner chose option 2, Oct 2026): backfillSeason() in dynasty.js
  rebuilds the last finished season's regular weeks once (update.mjs, hist.backfilled; only marked
  done with 10+ weeks): per week, rosters from matchups, "this season" = running blend of that
  week's per-game projections (BACKFILL_SMOOTH 0.3; avg weekly move ~2 pts), no projection that
  week = last known value + treated as Out; dated the week's last day. Chart is one panel per NBA
  season (seasonOfDate: Aug+ = that year; scoreSeasons/bindSeasonStrip): scroll-snap strip, swipe on
  touch (hint + dots), ‹ › arrows only with a mouse (hover:hover), opens on the current season,
  same y-range across a player's seasons. Risers & fallers card (owner, Oct 2026; fillMovers): biggest
  score changes per season from the history (past season: first -> last saved point; current season:
  first saved point, or 30/7 days back, -> today's live scores), League / My team, top 10 each way,
  missing day = 0, team shown = current holder, follows the injury toggle. Same-day check vs the
  season-long method: avg 3 pts apart (median 2, 90th pct 8), no bias. Chart: offseason drawn as a
  short dashed gap, years on old dates. Scale fix: 100 = most valuable player at FULL health
  (healthy() in dynastyValues), so a star listed Out no longer shifts everyone. Picks:
  Draft Grades rookie curve expect(no) +- curve sd, x hit rate, valued as a 20-year-old, x0.9 per
  year away; unknown slot = round average (avg 1st ~12). Ages: DATA.birth (build-data saves birth
  dates for rostered + used players; fallback /v1/players/nba in the browser). Transactions now
  keep `bid` (waiver_bid) when Sleeper has it. Dynasty tab: outlook (label from now/2-yr ranks,
  meter), league map SVG (labels avoid dots/labels) + table, roster by score with 2-season
  trend, taxi clock (taxiLeft from NBA seasons in the last 3), picks. Managers tab: per manager
  trades (Front Office net, partners, net with you), waiver/FA adds (+FAAB), draft report card,
  positions, draft age, dynasty ranks, H2H vs you (all games), last move, blunt summary
  (inactivity line in season only). Prospect grade (owner asked, for low-score young guys):
  players <= 24 get chances in 3 seasons of rotation (top 120), starter (top 72), star (top 24),
  logistic fits on x = (ppg carried 3 yrs on AGE_CURVE) / last season's 72nd-best ppg, 1,777
  NBA players <= 24 with 20+ gp 2012-2022 (busts out of the NBA count as misses; TEAM_ rows in
  Sleeper stats must be skipped), holdout 2019-22 calibrated. Grade A+..F (GRADES in dynasty.js);
  shown as chips in the roster + taxi clock and a Prospects card. Every player now has p.chances
  (rotation/starter/star in 3 seasons; <= 24 = the prospect fit, 25+ = VET_*_FIT in dynasty.js,
  fitted on 2,453 vet seasons 2013-2022 with a max(0, age-33) term, ridge on it; calibrated by age
  group incl. 36+), shown as an "In 3 seasons" line on every Roster by dynasty score row. Roster
  filters (owner, Oct 2026): All/Guards/Forwards/Centers by main Sleeper position (p.pos: PG/SG/G = G,
  SF/PF/F = F, C), plus players whose fantasy_positions (p.fpos) include that group, marked
  "secondary position: guard"; "Hide taxi" checkbox; both client-side, saved in localStorage
  gm-dyn-pos / gm-dyn-hidetaxi; "Include secondary positions" toggle (gm-dyn-sec, default on). Weekly
  moves (owner, Oct 2026): fillWeekArrows() puts ▲N/▼N (.dy-wk) by each roster score = live score minus
  the newest saved night >= 7 days back (or the season's first night) + a team line (#dy-week: up,
  down, net). Prospect grade changes card (#dy-grades, fillGradeLog): update.mjs saves hist.grades
  { pid: [[date, grade]] } only when a saved player's grade changes. TOP 100 PROSPECTS (owner, Oct
  2026): My GM tab "prospects" (renderProspects): prospectRanking(v) in dynasty.js = every graded player
  (<= 24, rostered or FA with an NBA team) by grade (A+ first), then star %, starter %, rotation %;
  "Grade changes" card on top (league-wide, newest first, 12 + "N more"; hist.grades now covers EVERY
  graded player incl. free agents; rebuilt once from hist.proj back to Oct 14 (hist.gradesBackfilled),
  a night grading the same as today's ROUNDED projection counts as today's grade so 0.1 rounding on a
  grade line (Dominick Barlow, 12.0% rotation) isn't a fake change; prospectFor() in dynasty.js);
  filters All / On rosters / Free agents / My team; ▲N/▼N/NEW vs the saved order ~7 days back
  (update.mjs hist.prospectRanks[date] = top-100 pids, last 21 nights) + risers/fallers line; rows open
  the score chart. Dynasty Prospects card and every Waiver wire list show #rank chips (.pr-chip; waiver
  chips link to the list's Free agents filter); both prospect cards are sorted the same way. Waiver wire tab (owner asked)
  also loads dynasty values: "Dynasty pickups" (unrostered with an NBA team, by 3-season raw,
  Out included) and "Prospects on the wire" (unrostered <= 24 by chances), plus grade chips +
  "dynasty N" on every waiver row (prospectChip shared). Waiver rows (owner, Oct 2026) also show
  every position (posText), age, trend and the "In 3 seasons" chances line like the roster; position
  chips include secondary-position players (marked, shared posGroups/POS_WORD helpers); Top 10 / Top 30
  switch (?n=30) for every list; every waiver row with a dynasty value opens the score chart
  (bindScoreCharts, same as the roster). Projection smoothing (owner, Oct 2026, after Rui Hachimura
  went 2 -> 21 overnight on a Sleeper projection refresh): TURNED OFF by the owner Oct 14 (role was
  real; smoothing only delays news): PROJ_SMOOTH = 1 (0.25/day turns it back on) in dynasty.js
  (smoothProjections); update.mjs saves data/dynasty-proj.json { states: [{ date, pg }] } (last 3,
  Chicago dates); pages load it (loadDynastyFeeds in app.js) and step once from the newest state
  before today, so page = nightly. p.projRaw/projUsed -> "catching up" note (projNote). Backfill
  (f.projPg) is not affected. Projection log (owner, Oct 2026): every update.mjs run compares Sleeper's
  raw season per-game projections (v.projRaw) with the last run's -> data/projection-log.json { last:
  { at, pg }, runs: [{ at, stamp (Sleeper max updated_at), total, changed (>= 0.05), added, removed,
  avg, movers: [pid, name, from, to] top 10 }] } (last 500 runs); Health report card "Projection
  updates" (projectionLogCard). Sleeper stamps ~all rows in one daily batch (~6:50 AM CT seen), so
  the stamp alone doesn't mean numbers changed. Chart explanations (owner, Oct 2026): update.mjs also
  saves hist.proj[date] = { pid: projUsed } (players in that day) and hist.league[date] = { floor, top }
  (historyExtra in dynasty.js); last season redone once more for them (hist.projBackfilled; the rebuild
  reproduced all 21 saved weeks exactly). Score chart: tap a dot -> .sc-info line (scoreInfo/scoreWhy:
  score, projection, Out, waiver line + cause of the change since the point before: projection, Out
  status, waiver line, top value >= 1%); ▲▼ (.sc-mk) where the projection moved 0.5+. Projections
  are Rotowire stat lines (one average game, gp = 1) scored with league settings (bonuses/techs not
  projected); last season's = blend of weekly projections. Role test (owner asked, Oct 2026): adding
  per-minute production (per 36, overall or bench-only <20 mpg) or minutes trend to the prospect
  model did NOT help on the 2019-22 holdout (log loss / AUC equal or worse, also for low-minute
  players), so the per-game model stays. Managers tab also has "Startup draft: still on the team"
  (owner asked): each manager's own 2023 startup picks (p.o = who made the pick) on his live roster
  today incl. taxi/IR, %, league total, tap for kept (+ "came back" if he ever dropped/traded him)
  and gone (current holder or not on a roster); also a "Startup picks" line on each card.
  STEP 3 Trade finder (built Oct 2026, My GM tab "trades"; logic assets/tradefinder.js): modes
  get a player / fill a need (G/F/C: other teams' players better this season than your weakest
  starter there) / sell a player. Package value = (sum score^1.6)^(1/1.6) (two 30s ~ 46), +5% per
  extra player a side must take on; windows give 95-120% (get), take 90-115% (sell); partner must
  not lose more than 2 on THEIR timeline (VIEWS in dynasty.js: now 70/20/10 for Contender/Win now,
  later 20/30/50 for Rising/Rebuilding, else standard); up to 3 pieces from each side's top 28.
  "Why they'd say yes": fairness, their timeline gain, thin/deep positions, picks for builders,
  prospects, trade history, roster spots. Trade block in localStorage gm-block-{owner} (+15 rank
  per block player). Need offers sorted by your-timeline gain; sell shows each team's best first.
  Trade finder filters (owner, Oct 2026): ?picks=no ("Keep my picks", Get a player + Fill a need)
  = no picks on your side; Fill a need ?tier=i (SCORE_TIERS index, Replaceable excluded) targets
  that score band from every rostered player (c.allAssets) and drops the beat-your-weakest-starter
  rule ("+N a game" shown only when > 0). Get a player's list = all rostered players too. Headliner
  rule CENTERPIECE in tradefinder.js: target 90+ needs one given piece >= 70% of it, 70+ >= 60%,
  50+ >= 45% (so 3 high-end starters can't buy Jokic). Every offer card has "Open in Evaluate a
  trade" (writes gm-eval {n:2, teams, legs} and switches to mode=eval).
  Trade evaluator (owner, Oct 2026): Trade finder mode "eval" (renderEvaluator in app.js, logic
  evaluateTrade in tradefinder.js): 2 or 3 teams, each team's outgoing players/picks (teamAssets with
  { all: true }; 3 teams = pick the destination per asset), draft saved in localStorage gm-eval.
  Per team: gives/gets package value, net (standard + own timeline), verdict (within 10% = about
  even), before -> after via teamOutlook() (now moved out of dynastyValues, shared): this-season /
  2-yr / total ranks + best-9 sums, outlook label, value-weighted age, G/F/C strength vs league avg
  (=100), roster size change, taxi vs 15. League table of every team's ranks before -> after, past
  trades between the teams + Front Office net. Position strength (owner): positionStrength(v, rosters,
  when) in tradefinder.js (shared by the evaluator) = best 3 G / 3 F / 2 C per-game (now: v[0], taxi
  out; later: v[2], taxi in) / league avg; Dynasty tab card (drawPositions): all teams, This season /
  In 2 years, >=110 green, <=90 red, plus "who counts" for the viewed team; small numbers under each
  score = players whose MAIN position is in that group (positionStrength().count = { active, ir, taxi }):
  active, IR in red (.pos-ir), (taxi) in parentheses; same in both views; who counts says "8 active ·
  1 on IR · 6 on taxi" (owner, Oct 2026). Team needs (owner):
  teamNeeds() in app.js = positions under 95 now (red chips) or under 90 in 2 yrs (gold), outlook
  shopping style (Proven starters now / Youth + picks / Younger core), Taxi full (15), No {next} 1st;
  shown as a "Needs" row on every Managers card and a Needs column in the Position strength table.
  Guide: dynastyGuide() on the Dynasty tab (#dy-guide, opened/scrolled by ?guide=1, linked from the
  Trade finder): SCORE_TIERS with live counts + examples, arrows, prospect grade, picks, trade math.
  Tier tags (owner asked): tierTag(score) in app.js = SCORE_TIERS short names (Cornerstone, Star,
  High-end starter, Starter, Flex, Depth, Stash, Replaceable; classes .tier-0..7) next to player
  names in the Dynasty roster + taxi clock, Trade finder offers and Waiver wire rows; also on each
  guide row.
  Team tracker (owner, Oct 2026; My GM tab "tracker", every team, default yours): moveImpacts() in
  tradefinder.js rolls rosters + pick owners back through this season's transactions newest first and
  compares each team just before/after a move at TODAY's values (snapshotFor: teamOutlook +
  positionStrength); alerts list with chips (now/2 yrs/total with ranks, age, G/F/C), highlighted when a
  rank changes, a position moves 5+, total 10+ or now 5+; "New" since last view (localStorage
  gm-tracker-seen-{owner}; first visit = last 7 days); no-effect moves collapsed. Drift = 7-day change
  in the team snapshot minus move effects, plus the roster's biggest player-score changes. Charts per
  metric (now, 2 yrs, total, age, G, F, C) vs league average (dashed), season panels (bindSeasonStrip),
  ▲ markers for trades + moves with total 5+. Data: update.mjs saves hist.teams[date][owner] = { c, f }
  (teamSnapshot arrays, TEAM_KEYS; c = Out discounted, f = full) nightly; last season rebuilt weekly once
  via backfillSeason(onWeek) (hist.teamsBackfilled). Briefing shows a "Team tracker" card when there are
  new moves.
  DRAFT SCOUT (owner, Oct 2026; My GM tab "draftscout", replaces the planned step-5 Draft helper):
  `assets/scout.js` (no DOM/Node APIs; runs in the job and in a browser for testing). Built WEEKLY ONLY
  (owner: Sundays, Chicago) by update.mjs, or any run when data/draft-scout.json is missing or its
  version != SCOUT_VERSION (bump it when the build changes) -> data/draft-scout.json (classes, sources,
  raw parsed copies = fallback when a source fails, history = weekly consensus order for ▲▼) +
  data/scout-pool.json (comps pool: drafted college players 2011+ matched to Sleeper ids; first build
  downloads Torvik 2011..; then only new draft years). Next 3 drafts (nextDraftYear: July+ = next year).
  Sources, read as a labeled bot (UA SeisDynastyHoops; NBADraftRoom returned 403 to it, so it's NOT
  used; ESPN blocks too). FROM GITHUB ACTIONS (first live run, Oct 2026): Tankathon + CBS OK, Torvik 403
  and 247Sports 406 (they work from a home PC). So: update.mjs getText tries Node fetch then curl;
  247 -> On3 industry rankings (__NEXT_DATA__ JSON, parseOn3) -> last good copy (prev.raw, else
  scripts/scout-seed.json = HS top lists saved Oct 19 from a home PC); Torvik missing -> Tankathon's
  per-prospect stats (parseTankathon st: per game, per 36, TS%, usage, BPM; value divs carry quality
  classes; assist rate = 0.357 + 5.247 x ast/36, fitted on Torvik) with freshmen weighted by date
  (Nov 5 -> Dec 15); comps pool from scripts/scout-pool.json (seed built at home, POOL_VERSION 2,
  per-36 fields; data/scout-pool.json once saved). One Monday retry when a non-optional source failed
  Sunday. Rebuild seeds from a home PC (browser + a local POST-save helper) if they go stale.
  WEEKLY HISTORY (owner, Oct 2026): draft-scout.json weeks = [{ date (that week's Sunday, weekOf),
  p: { key: [draft year, rank, grade, starter %, star %, rotation %] } }], all weeks kept until the
  player's draft passes; rerun same week replaces. Page: "Grade changes" card per class, and each
  opened prospect draws a weekly chart (scoutSeasons: starter solid, star dashed, grade-letter lines,
  one panel per Aug-Jul season via bindSeasonStrip; follows a player who changes class).
  HOLDOVER CHECK (owner, Oct 2026: Joaquim Boumtje-Boumtje, a reclassified Duke freshman too young for
  2027, was missing from 2028): source "freshmen" = last year's HS class (On3 first: it keeps reclassified
  players in their old class, 247 had him 29 vs On3 4); findHoldovers() = top 25 of it on NO next-draft
  board/mock (sameName: last name + first initial; skipped if boards < 50 rows) -> added to the class
  after next (hsClass extras, holdover {hsClass, from}, "Waiting a year" chip, recruitRank kept; class
  ranks re-sorted by chances). Seeded in scripts/scout-seed.json (raw.freshmen). Health card line.
  Health report has a "Draft Scout" card (scoutHealthCard: build age + next Sunday, each class present,
  every source ok/failed + fallback copy date, stale lists >60 days, Torvik vs Tankathon stats, comps
  pool size, weeks of history).
  Tankathon big board + mock (page title gives the year; after a draft they flip
  to the next year automatically), CBS prospect rankings (top 30), 247Sports composite HS rankings
  (class Y-1 -> draft Y, top 30) for the 2 later classes, Bart Torvik CSV getadvstats.php?year=Y&csv=1
  (no header; column map T in scout.js; before games start the new-season file repeats last season
  without per-game columns: detected by equal gp/minp/usg), Sleeper stats (comps' NBA careers,
  starter line). Consensus = freshness-weighted mean of ln(rank) (missing = list length + 8; mock 0.5).
  Model (fitted Oct 2026 on 618 drafted college players 2011-2023, outcome = 3rd NBA season top
  120/72/24 by FP/G with 20+ gp, same as dynasty.js prospect grade + same GRADES letters):
  DRAFT_FIT logistic on ln(pick) (+ln^2); stats did NOT help the yes/no chances in leave-one-class-out
  CV, but on a continuous outcome (best FP/G in seasons 2-3 / starter line) BPM, assist rate and age
  did (others: size, stl, blk, FT, 3PA, usage, rec rank = nothing beyond slot) -> VALUE_FULL shifts the
  slot (effPick); unknown stats = TYPICAL(x) for the slot, weight gp/12. Chances averaged over slot
  uncertainty (spreadFor months to draft + source disagreement). HS classes: HS_FIT on ln(national
  rank) (1,950 top-150 freshmen). Holdout 2019-23: ~46% starter -> 35% real, slightly optimistic.
  Class strength = lift of the top-24 expected values vs the slot curve minus CLASS_LIFT; history
  says only about +-2% is visible pre-draft (owner told); classStrength() clamps 0.85-1.15 and
  dynasty.js multiplies rookie pick expectations by it (pick.strength, pick.avgScore = without);
  HS classes = 1. Comps: nearest pool players with NBA careers (COMP_KEYS weights, same position
  group), shown with best FP/G season + tier; only for players with 5+ college games (freshmen from
  ~Nov; international/HS none). Traits (green >= 75th pct of recent 1st-rounders, red <= 25th;
  wording TRAIT_WORDS in app.js) are notes only. Page: team picker, year chips (later years
  "early"), your picks (league slot -> "likely there" by expected value), class outlook + sources,
  board (position filter, tap = why/stats/traits/comps, ?p=key opens one), fine print "How Draft
  Scout works" (owner asked). Test locally by serving saved source pages through a getText stub.
  DRAFT NIGHT 2026 (owner, Oct 2026, "Option A"): year chip "2026 draft night" in Draft Scout (DRAFT_NIGHTS
  in app.js; loadDraftNights reads assets/draft-night-{year}.json, a STATIC file the owner uploads, never
  touched by the nightly job). Built once in the browser by scout.js buildDraftNight() (+ parsePastDraft for
  tankathon.com/past-drafts/{year}): collegeClass with one board = the real picks (opts.oneSource: no
  disagreement), today = {year}-06-25 (spread 0.25), Torvik {year} + {year-1} files (downloaded with curl from
  a home PC; Torvik's pick column matched all 54 college picks), comps/traits from pool players drafted
  before {year} with NBA results through {year-1}; Sleeper ids for all 60 (pool + /v1/players/nba, birth
  dates checked); picks verified against Basketball-Reference. Hand-checked: Dybantsa B+ (61/27), Peterson B,
  Boozer A (64/33), Mara C+, Philon D; class 4.7% stronger than average. Page: header (strength, grade
  counts), "Then vs now" (top 5 on draft night vs the live board's top 5 + how grades are holding up: higher/
  same/lower vs today), board by pick (draft-night grade -> today's grade, team, dynasty score, tap: why,
  final college season, traits, comps, "How he's doing now": prospect grade + chances (vets: gradeOf of
  p.chances), score + tier, NBA games/FP per game this season from /stats/nba/{season}, Sleeper projection,
  fantasy team (teamName) or free agent). Live 2027 model and weekly build unchanged. To freeze 2027 next
  June: same steps with a scratch page calling buildDraftNight, add 2027 to DRAFT_NIGHTS.
  FOUND Oct 21 2026: Sleeper's season projections (/projections/nba/2026) came back EMPTY for 55 of the 60
  2026 rookies (they had them the night before, e.g. Dybantsa 26.4), so dynastyValues gives them score 0 and
  no prospect grade everywhere (Dynasty, Trade finder, Prospects); the draft-night page says so per player.
  FIXED Oct 21 2026 (other chat, owner: "major overreactions" on day 2: Paul George 80%+ star, SGA 100,
  Dybantsa 0): once games start, Sleeper's SEASON projection feed becomes each player's LATEST box score with
  no gp (Cade's = his 22/4/8 opener; players who sat have nothing), and dynastyValues divided by gp || 1. Now
  dynasty.js seasonFeedOk(proj) (rows with gp >= 1 are at least half) decides; when false, this season =
  inSeasonProjections(): (PRESEASON projection x PRESEASON_GAMES 10 + actual FP/G this season x games) /
  (10 + games) (actual = games of 10+ min, see below); PRESEASON_GAMES was 15, set to 10 after a test (owner,
  Oct 2026: ~640 players 2023-25 predicting rest-of-season FP/G from the first N games, best 8-10, 15 ~2%
  worse; Rotowire week-1 projections as the prior did no better than last season x age curve); no preseason value -> actual
  with 5+ games, else the average of this + next week's per-game projections (f.weekProj, gp = 1, > 0).
  Frozen preseason = dynasty-proj.json `preseason` { season, at, pg }: update.mjs refreshes it while the feed
  is OK and keeps it fixed after; first run without one = the oldest saved state (preseasonOf()). Weekly
  per-game projections as the MAIN source were tested and rejected (median 0.97 of preseason, 1 in 10 players
  30%+ lower). Result vs the clean Oct 21 night: median score change 0, 2 players moved 3+ (Paul George 9 ->
  14 after a 53-FP game). Out rule: listed Out = half this season ONLY if Sleeper projects no game > 0 for him
  in this or next week's per-game projections (playsSoon); short absences (Dybantsa ankle, Knueppel, Sexton,
  Coby White...) keep full value, long ones (Butler, Beal, Porzingis, Ingram...) are still halved.
  Real games in the blend = only games of MIN_GAME_MINUTES (10)+ (owner, Oct 2026: garbage-time cameos like
  Tarris Reed's 1.2 min / 0 FP shouldn't dock a prospect; DNPs never counted): seasonActuals() sums per-game
  box scores /stats/nba/{season}/{w} for weeks 1..current -> { pid: [fp, games] }; update.mjs saves it as
  dynasty-proj.json `actual` { season, at, games }; pages pass it to loadDynasty (DYN_ACTUAL), and build it
  themselves only when no saved copy exists.
  OUT-OF-CHARACTER RULE (owner, Oct 31 2026, after Kyle Filipowski (3rd year, 4 games of 6-9 min) kept score 16 on
  his preseason projection): seasonActuals() now = finished games only (schedule complete, no All-Star rows); ROOKIES
  (years_exp 0) keep the 10+ minute rule (DNPs never count); everyone else: a short game counts unless his usual
  minutes (median of games played) are USUAL_MINUTES 15+ (then it's an injury exit / blowout, skipped), and a HEALTHY
  DNP (Sleeper per-game projection > 0 for that date) counts as a 0-point game; projected-0 DNPs (injured / out) never
  count. Checked Oct 31 2026 vs the old rule on the same games: only Filipowski 16 -> 3, Taylor Hendricks 4 -> 1, Ben
  Saraf 4 -> 2, Naji Marshall 6 -> 4 (healthy DNP) moved 2+; Zubac / Markkanen / Jaren Jackson / Missi protected.
  NBA CONTRACTS (owner, Oct 22 2026; information only, never in scores/grades): `assets/contracts.js`
  (no DOM/Node APIs). Source = Basketball-Reference /contracts/players.html (Spotrac 403s and HoopsHype 402s
  bots: never use or work around them). update.mjs reads that ONE page weekly like Draft Scout (Sunday, a
  Monday retry when Sunday's read failed, or any run when data/contracts.json is missing or its version !=
  CONTRACTS_VERSION), with the shared getText (labeled UA, Node fetch then curl; hoisted above Draft Scout,
  plus getSleeperPlayers() cache). Failed read -> prev.raw (last good parse), else scripts/contracts-seed.json
  (parsed rows read from a home PC Oct 22 2026); Health report "NBA contracts" card says which. NOT YET KNOWN
  whether Actions' IPs are blocked: the first Sunday run (or the first run, since the file is missing) shows it.
  parseContracts(): table #player-contracts (no </tbody> on the page; header rows repeat in the body), columns
  y1..y6 = seasons from the header (2026-27 -> 2026), cell classes salary-pl / salary-tm (/ et) = player /
  team / early-termination option, remain_gtd = guaranteed. matchContracts(): normName (scout.js) -> Sleeper
  id, ties by team then active; CONTRACT_IDS = BRef id -> Sleeper id overrides (Ron Holland); BRef BRK/CHO/PHO
  = Sleeper BKN/CHA/PHX. Waived players have a row per team with the old deal repeated: the Sleeper-team row
  is used, others = `waived`, line shows only guaranteed money, no flags. Oct 22: 460 rows, 0 unmatched, 11
  rostered players without a row (two-way types). data/contracts.json { version, at, source { ok, read,
  count, error, fallback }, players { pid: { team, seasons [{season, salary, option}], guaranteed, exp
  (Sleeper years_exp), waived? } }, unmatched, missing (rostered, NBA team, no row), raw }. readContract():
  options the guaranteed amount still covers were already picked up (Flagg's 2027-28) and drop out; rookie =
  NBA seasons before this one (p.nbaSeasons, only counts the last 3, so 3 needs exp <= 3) + seasons left <= 4;
  flags: Contract year / Rookie deal ends (no later seasons), Extension next summer (rookie, 1 more year),
  Can opt out (player/ET option next), Team option / Rookie team option, Easy to waive (<= MIN_DEAL $3.5M
  and not a rookie, or not fully guaranteed). UI (app.js): loadContracts() (gmDynasty + Waiver wire load it),
  contractLine(p) under Dynasty roster, Waiver wire and Trade finder offer rows ("No standard NBA contract"
  when he has an NBA team but no row; "(listed with X)" when BRef's team differs); flag tooltips = why;
  contractsCard() in the Dynasty side column: share of roster dynasty score in a contract year (+ options
  after this season), league average/rank, groups, every-team table; contractsHealthCard() on Health.
  Next: step 4 Playoff odds (after 3-4 weeks of games).
- `assets/lockcard.js`: Lock Report Card (Test features, see there).
- `assets/locks.js` + DEV DASHBOARD (owner, Nov 1 2026): which game each starter's week counted, without flip-flopping.
  (1) The commish's PICK on the Dev Dashboard = WORD OF LAW: Firestore locks/{season}_{week}_{pid} { s, w, pid, o, k, d,
  p, src 'you', t }, k = lock (+ d = game date) / last (not locked: his last LINEUP game of the week) / zero (benched before
  his last game). Beats corrections.js and everything read from Sleeper; only he changes it ("Clear my pick"). Used by
  weekfix (pins), gm.js lockedPoints(..., law) + gmWeek marks (lawMarks: { date } / { none } / { none, zero }).
  (2) BENCH GAMES NEVER COUNT: benchDates(lgs, season, pid, owner, week) / lineupGames() = the game-day watcher's lineup
  records (data/lgs.json v 0 for that owner, that week). (3) Everyone else: weekfix solves from the official score.
  (4) FEED HINTS ONLY: scripts/lgs.mjs lockSweep (start of every run + every LOCK_EVERY 30 min, LOCK_READS 12 reads of the
  live week, skipped once state.week moves on) tallies every value each starter showed -> data/locks.json (version 2: {
  seasons: { s: { w: { pid: { o, v: { points: [reads, firstAt, lastAt] } } } } } }, only ever added to). Shown on the
  dashboard ("feed 36×5 / 37×3"), NEVER treated as a lock: the owner checked in the app (Nov 1 2026, week 2) and
  earlier-game readings were real for Pritchard (Mon 36), Porter Jr. (Tue 43), VanVleet (Fri 29, later read 0 / 36),
  but FALSE for Bane (Wed 28 on 1 of 8 reads; started Fri, not locked) and Peyton Watson (Mon 36 = his best game on 8
  of 24 reads; not locked); Podziemski's "Mon 32" was because his Fri 37 was played from the BENCH. Copies often show a
  player's best game (usually the locked one, not always); per player, not whole stale reads.
  weekfix changes: settleWeeks({ law, bench }); snapshots never decide a value (settleTeam always non-strict: they
  only order candidates); pins = corrections + picks. WEEKFIX_VERSION stays 1 ON PURPOSE: a bump re-solved week 1 from
  Sleeper's CURRENT week-1 feed, which lost bigtrey5456's traded starters (Garland, Isaiah Stewart) -> "nofit". Answers
  are redone only when their key changes (old key format kept when there are no picks / bench records); a re-solve
  tries the saved answer's own lineup (answer.starters, saved from now on; older answers: Object.keys(games)) and also
  offers each player's previously solved points, because Sleeper CORRECTS BOX SCORES later (Isaiah Stewart Oct 25:
  26 -> 24, updated Oct 30) while the official score keeps the old number. Tested on live data: plain re-solve of week 1
  = league.json playerWeeks exactly; a matching pick (George Tue 53) -> same unique answer; a wrong pick (George 27) ->
  "nofit" in Needs you. update.mjs: weekFix.law = { docs } (loadLockDocs; failure = Scoring check note), weekFix.lgs.
  firestore.rules: locks/{id} public read, commish-only write, src must be 'you' -> the owner must re-publish the rules
  (League office -> Props -> Copy rules) before picks save.
  Dev Dashboard (Test features tab=devdash, renderDevDash in app.js, .ld-* in styles.css): week chips; legend; "Needs
  you" = finished-week ties ("could go more than one way" + options), nofits, picks that don't add up to the official
  score; a "To watch this week" fold (LD.watch) for live players whose reads disagree this visit (LD_READS 8). One card
  per matchup: team total of the values shown + "Official N" (scored weeks, lineup = the solver's) or "Sleeper feed N";
  per starter: games chips (counted game navy, bench games struck "· bench"), tag ("Counted Fri · Solved", "Locked Tue
  · Your pick", "Counting latest (if not locked) · Live"), feed hint line, value; tap = picker (each LINEUP game / not
  locked / benched 0 / clear). Live week value = his latest lineup game (unknown locks aren't guessed). ?week=&p=&o=
  opens a player. Tested Nov 1 2026: weeks 1 + 2 live (72 starters, week 1 totals = official for all 8), 402 px +
  desktop, no overflow. NOT tested: Firestore writes (rules not published), the watcher's sweeps in Actions.
  LIKELY LOCKS (owner, Nov 1 2026): live-week rows without a pick show a dashed gold "Likely locked Tue · 43? (feed n of
  m)" + dashed chip (likelyLock() in app.js: a hint value = an earlier lineup game, not his latest, with a later lineup
  game finished on an earlier day; most-read value wins). A GUESS: never in totals, the solver or the coach.
  COACH -> DASHBOARD (owner, Nov 1 2026): every Assistant Coach lock mark (setMark: game chip, "I locked him", "Not
  locked", undo) also saves a Dev Dashboard pick via coachPick() (lock + date / last / clear; owner = the roster that
  has him now; points from w.boxes), quietly, only when this browser is signed in; so coach marks are law and the
  Monday solve pins them. gmWeek returns the merged marks (picks over local marks) so undo works on a dashboard pick.
  Rules published + files uploaded by the owner Nov 1 2026 (REST read of locks = 200). Firestore write from the coach
  not tested here (needs the owner's sign-in).
  SLEEPER LOCKS FOR THE SOLVER (owner, Nov 9 2026): locks.js sleeperLockDocs({ leagueId, gql, locksFromLegs, query }) =
  matchup_legs_raw (sleeperpriv.js, no login) for every finished regular week (league last_scored_leg, < playoff start) ->
  records { s, w, pid, o (matchup team), k: 'lock' + d = locked game | 'last' (not locked: last lineup game), src: 'sleeper' }
  for every final-lineup starter; update.mjs pushes them into weekFix.law.docs after the Firestore picks (failure = a log
  line only). lawFor: 'sleeper' records first, the commish's 'you' picks override. weekfix settleWeeks: corrections.js pins
  beat sleeper pins; a team-week already 'unique' WITHOUT Sleeper's data keeps its answer (a re-solve would hit later box-score
  corrections: Isaiah Stewart 26 -> 24 made week 1 bigtrey5456 'nofit'); answers solved with it carry slp: 1 (so they keep using
  it); a night with no sleeper records for the week keeps slp answers as they are. Tested Nov 9 2026 in the browser (real
  buildLeagueData + raw data files): 179 locked + 37 unlocked starters weeks 1-3; ties 8 -> 0 (week 2: tzola13, bigtrey5456,
  simeoncampbell7, jimmycooks2, BenDoverPlz123; week 3: tzola13, bigtrey5456, TRT3), Scoring check notes 0, every 2026
  playerWeeks value = last night's file, stable over 4 simulated nights incl. one with Sleeper down. Sleeper's locks alone
  left 3 ties (unlocked starters); the 'last' rule settled them, matching the solver's old picks.
  TRADED MID-WEEK (owner, Nov 1 2026; week 2: bigtrey5456 -> simeoncampbell7 Oct 28 sent George, Durant, Garland; Parma <->
  BenDover Oct 30): a starter traded AFTER his lock stays in his old team's MATCHUP lineup and his points count there
  (matchups: bigtrey still starts George 35 + Durant 40), but the old roster's `starters` shows '0' = an empty slot; an
  unlocked one moves to the new team's lineup (Garland on simeon). commish.js teamRoster fills an empty slot from the live
  matchup's starters[i] (traded: true; livePts falls back to starters_points); coach board tag "Traded · counts here"
  (.mb-traded). coachPick saves the pick for the team whose MATCHUP lineup has him (not his new roster), like the
  dashboard; picks are per player, so the coach shows them in that slot. Checked on bigtrey: George + Durant back in
  SF / FLEX, locked 35 / 40.
- `assets/corrections.js`: manual fixes, win over weekfix.js (team scores, player locked points = pinned in its solver, draft picks,
  All-Star positions, PHOTO_CORRECTIONS: name -> NBA.com ID for headshots Sleeper has
  wrong; Sleeper's LeBron James photo (id 1362) is Bronny). All player photos go through
  playerPhoto() in records.js. Checked Oct 2026: no duplicate photos among league players;
  families/twins (Thompson, Murray, Champagnie, Lopez, Ball, Holiday...) are correct.
- `assets/props.js` + renderProps in app.js: WEEKLY PROPS (#/props, In Season; owner, Oct 24 2026).
  Owner's choices: all 8 managers pick (Google sign-in), lines set by the site from projections, EXACTLY
  10 props a week (owner: "an even 10"; median picks dropped): spread on all 4 games, combined-score
  over/under on the top 2 hype games (hypeSlate order; options show line / 2 in parentheses, owner Oct 25), 1 player prop in each of those 2 games (the planned
  starter with the highest median locked score), top-scoring team, highest-scoring game. 1 point per correct
  pick, push = nothing, bragging rights only (no Wager tie), picks hidden until the lock, lock = the week's
  first tip-off (ESPN scoreboard; fallback 16:00Z that day), managers claim a team and the commish approves.
  Regular-season weeks only (needs 4 games + 8 teams). Lines: update.mjs -> updateProps() each night builds
  the open week once (openWeek: first regular week whose first game date >= today) with coachlog rewind() to
  that week's first morning + gm.js weekTotals() (every team planned like an opponent: SITS, Balanced, bench
  moves, OPP_CAL scale, 4,000 runs) -> spread/total = median, rounded to x.5 (half()); player line = median of
  gm.js lockedDraws() (his games at OPP_CAL, locked at the plan's slot-aware bars T); top/game odds = share of
  runs. BUILT ONCE, NEVER CHANGED (owner, Oct 25 2026: "we can't have lines moving"): the first nightly run
  on or after firstDate - OPEN_DAYS (3: a Monday start -> Friday's run) builds the week; any later run sees
  it saved and keeps it. A player who ends up not starting = no bet (no replacement). Picks still store the
  line ({ o, l }; always = the week's line now). Week 2 2026 was built Oct 25 under the old nightly-redo
  code (fields at/builds/replaced) and is kept as is. data/props.json { version, at, seasons: { s: { weeks: { w: { week,
  firstDate, lockAt, built, at, builds, props: [...], replaced } } } } } (prop shapes at the top of props.js;
  m = the site's pick at the last build). Grading in the browser from league.json: weekResults() (R games,
  playerWeeks locked points), settle() + gradePick() (player prop = no bet when he has no playerWeeks row,
  i.e. not a starter), leaderboard() (+ "The site" = model picks; it can't win a week; weekly winner = most
  correct, ties share). Page: season tabs (only when 2+ seasons have props; ?season=, default this
  season) + week chips (?season=&week=, every past week keeps its picks + results), account card (sign in / claim form / waiting / "Picking for"), lock
  countdown (redraws at the lock), 10 prop cards (tap a side, tap again to clear, saved 0.7 s later), after the
  lock every manager's name under his option + gold "Site" tag, after final ✓ and Hit/Miss/Push/No bet,
  side cards "Who's in" (status docs, n/10) / week scores and the Standings card (Season / All-time switch, PR_BOARD; all-time = allTimeBoard() in props.js, every season's leaderboard added up). POINTS ONLY (owner, Oct 25 2026: "don't count it like a record"): rank, manager, points (= correct picks); ties share a rank; week card shows "N pts". Home: one-line card
  (#hm-props, homeProps; reads props.json only, no Firebase on Home). Commish -> League office -> Props
  (renderPropsAdmin): claims waiting (Approve/Deny), linked managers (Unlink), one-time setup = "Copy rules"
  (fetches firestore.rules from the site, fills COMMISH_UID with the signed-in uid) + Open Firebase rules.
  Firestore layout under "Cross-device sync". Tested Oct 24 2026 in the browser: week 2 built from live
  Sleeper (1.7 s; totals ~710 vs coach log week-1 expected finals 297-369 per team), made-up finals graded
  right (a push on the exact line, a no-bet player), layouts 320/402/desktop. NOT tested: real sign-in,
  claims, saving picks (live rules block them until the owner publishes the new rules).
- `scripts/update.mjs`: nightly job (Node 22 in Actions): build, guard, freeze, record
  history, snapshots, and checks that fail the run (= email) on any mismatch.
- `data/` is written only by the Action (league.json, frozen/, snapshots/, week-guard.json, official-weeks.json, live-weeks.json, taxi-log.json, coach-log.json, props.json, season-stats.json, trade-talk.json, taxi-week.json, injury-log.json, defense.json, adv-stats.json, matchup.json, lgs.json + locks.json (written by scripts/lgs.mjs via lgs.yml, not the nightly job),
  dynasty files, draft-scout.json + scout-pool.json + contracts.json weekly).
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

## Cross-device sync (Firebase, owner Oct 24 2026)
- Why: settings lived only in each browser's localStorage (lock marks entered twice, phone + PC).
- Firebase project **dynasty-hof** ("Dynasty HOF", free Spark plan, owner's Google account).
  Google sign-in enabled; authorized domains: localhost (default), dynasty-hof.firebaseapp.com,
  debugburkhart.github.io. Firestore (Standard, nam5/US). Web app "Hoops site". The config in
  assets/sync.js is public by design; **the real protection of synced data is the Firestore rules**
  (`firestore.rules` in the repo = reference copy; live rules are pasted in console -> Firestore ->
  Rules -> Publish). The commish passcode only hides the office, it protects nothing in Firestore.
- `assets/sync.js` (Firebase JS SDK 10.14.1 from gstatic, dynamic import only after "Sign in" is
  tapped once on that browser: localStorage sync-uid; other visitors load nothing). Sign-in box
  (`[data-sync]`, paintSync): sidebar foot ("side") + commish header ("office"); Google popup,
  redirect fallback; name/photo, Sign out, status dot Connecting / Synced / Saving / Offline / Sync problem.
- How it works: localStorage stays the working copy (signed out / offline = exactly as before).
  gmSave in app.js (the ONLY writer of saved settings) skips unchanged values, then syncSave(key)
  -> users/{uid}/prefs/{key} = { v: JSON text, t: ms, dev }. onSnapshot listener copies newer docs
  (t > local sync-meta[key]) into localStorage and calls syncRedraw (app.js): clears LIVE on lock-mark
  changes and redraws the open commish tab (CM_REDRAW; waits while a field there has focus). Newest t
  wins per key. Every connect reconciles (local newer -> push, remote newer -> apply). FIRST connect of a
  browser to an account (sync-merged != uid) combines: gm-locks-/gm-whatif- objects merged (newer side
  wins per player), gm-block- lists unioned, gm-tracker-seen- max, others newer wins; any replaced local
  value is kept in localStorage sync-backup. gm.js lockedPoints still reads gm-locks from localStorage.
- Synced keys = SYNCED in sync.js: gm-locks-*, gm-whatif-*, gm-mode, gm-block-*, gm-eval, gm-dyn-*,
  gm-tracker-seen-*, gm-inj-*, wager-saved, gm-tags, gm-bk-*, gm-notes, gm-dc-* (Depth Chart). NOT synced: gm-tips-{date} (cache), sessionStorage cm-open,
  sync-* bookkeeping. **To sync a new setting:** save it with gmSave/gmLoad (never raw localStorage)
  and add its key or prefix (ending in '-') to SYNCED; add a MERGE rule if two devices' values should be
  combined instead of newest-wins; the rules need no change.
- Firestore layout: users/{uid} = { name, photo, seen } (written at sign-in); users/{uid}/prefs/{key}.
  Rules: only request.auth.uid == uid reads/writes its own tree; prefs docs only { v (string < 500 KB
  or null), t (int), dev }; everything else denied. Any Google account can sign in and gets its own
  private tree (harmless; the other managers have nothing to sync yet).
- Shared collections (Weekly Props, Oct 24 2026): claims/{uid} { owner, name, photo, t } (a manager's
  "I'm this team", own doc only, commish reads all); members/{uid} { owner, t } = account -> Sleeper owner
  id, written ONLY by the commish (isCommish() = uid == COMMISH_UID in firestore.rules; the repo copy keeps
  the placeholder, Commish -> Props -> "Copy rules" fills it in), public read; props/{season-week} { lockAt }
  (created by the first member who saves, lockAt must be within 14 days, only the commish can change it);
  props/{sw}/picks/{uid} { owner (must = his members doc), picks, t (= request.time, serverTimestamp) },
  readable by its owner only until lockAt, then by anyone; writes only before lockAt; props/{sw}/status/{uid}
  { owner, n, t } public. sync.js exports firebase() (loads SDK + waits for the first auth state, also
  signed out), onAuth(cb), currentUser(). Trade Court reuses members/{uid} (see "Trade Court"; owner bigdaddyburk =
  1035475215997906944; his uid shows in Commish -> Props once signed in).
- Tested locally (Oct 24 2026): SDK loads, signed-out Firestore read = permission-denied, merge/apply
  logic with a fake Firestore, layouts 320/402/desktop. Real Google sign-in only by the owner.

## Trade Court (#/trade-court, In Season; owner, Oct 25 2026)
- `assets/court.js` (no DOM) + renderCourt / courtCard / courtFoot / homeCourt / rivalryCourt in app.js,
  .tc-* in styles.css. Modeled on the owner's fantasyhoff screenshot, navy instead of green, NO "Trade
  Autopsies" tab. Every DATA.transactions trade (all seasons, 2- and 3-team) = a case, numbered 001..N
  across ALL seasons, oldest first (tradeCases()); page lists one season newest first, season chips +
  "Season 2026-27" badge, default = current season; ?season=, ?case=N (or the case key) opens + gold ring.
  Card: "Case 075" / "Week N transaction" (3-team: "Week N 3-team trade") / date; one column per side
  ("Side 1 · gets": what that team RECEIVED; side 2 mirrored on desktop, all stacked under 700px), red
  swap icon on the divider; rows = position badge + player + NBA team (today's), picks R1/R2 + "Originally
  X" (pickOwner) + "became Player" (frontoffice key) + "from X" in 3-team deals; "Show the numbers" fold =
  Front Office got/gave/net per side (same as Rivalry) + Full breakdown link.
- Owner's rules: voters = the 8 managers (Google sign-in + approved claim, SAME members/{uid} as Weekly
  Props; shared memberBox()/bindMemberBox() in app.js; Commish -> Props approves claims for both);
  managers IN the trade may vote but are tagged "(in trade)" and NOT counted; votes public by name
  (names under each ruling); vote any time, change any time, tap your ruling again = withdraw (no
  deadline, old trades too). Verdict needs MIN_JURORS 3 counted votes: 2-team = average on the 1-5 scale
  (1 side 1 handily, 2 slightly, 3 even, 4 side 2 slightly, 5 handily), .5 rounds toward Even; 3-team =
  7 buttons (each team handily/slightly + Even), most votes wins, tie = "Split jury".
- Firestore: court/{season}/votes/{caseKey}_{uid} = { k, owner, w (winner owner id | 'even'), m ('h'|'s'|''),
  t (server time) }; case key = `${season}-${ts}` (ts = Sleeper status_updated, stable incl. frozen
  seasons). Rules (firestore.rules): public read; create/update only your own doc id for your linked team;
  delete your own. Reads use Firestore's REST API (loadVotes, no SDK, works signed out); writes use the SDK.
  THE OWNER MUST RE-PUBLISH THE RULES once (Commish -> League office -> Props -> Copy rules -> Open
  Firebase rules -> paste -> Publish); until then the page says the vote rules aren't published (403).
- Home: "Trade Court · Case N" card under the Props card (newest case + verdict / vote count, REST read).
  Rivalry trade history: each trade has a "Trade Court · Case N" link; a signed-in linked manager also sees
  "Your vote: ..." / "You haven't voted" (only loads Firebase when localStorage sync-uid is set).
- Tested Oct 25 2026 with faked votes (fetch stub): tallies, verdicts, party exclusion, 3-team plurality,
  layouts 320/402/1300. Owner uploaded it, published the rules and confirmed it works live (Oct 25 2026).

## MyGM (#/mygm; owner, Nov 8 2026)
- The home for the GM tools as they graduate from Test features ("I'm building a lot of these test features to eventually
  be deployed in a full feature called MyGM"). Owner's answers: its OWN page (not the office's "My GM" tab group, which
  stays as is for now), COMMISH ONLY for now (same passcode + session flag as the office: COMMISH_OPEN / cm-open; going
  between #/commish and #/mygm stays unlocked, any other page locks both), Beta tags kept until he says a feature is live.
- app.js: renderMyGM(main, params) (lock form like the office's, then header "Commish only · Beta" + tab bar .mygm-tabs +
  #cm-body.tf-body); MYGM_TABS [[id, label]] + MYGM_SHOW { id: renderer }: TO ADD A FEATURE add both (and remove its
  TEST_FEATURES entry). Sidebar: a second dashed button "MyGM Beta" (.commish-btn.mygm-btn, clipboard icon) under Commish.
  render() keeps the session unlocked for page mygm too.
- Tabs (see also ROSTERS ... TROPHY ROOM below): CONTRACTS (#/mygm?tab=contracts, the Contract Sandbox; moved out of Test features Nov 8 2026: TEST_FEATURES entry
  removed, #/commish?tab=contracts forwards to #/mygm with the same params, contracts-ui.js here() + back links / 2K + Adv
  back pills point to #/mygm, its first card is titled "Contracts"). Everything under "CONTRACT SANDBOX" in Test features
  below still describes it. Checked Nov 8 2026: gate, unlock, tab, old-link redirect, 2K card + "Back to Contracts", leaving
  to Home locks again, 402 px no overflow.
- 2K LOOK (owner, Nov 8 2026: "everything in MyGM will look like the 2K breakdown", from his NBA 2K MyLEAGUE screenshots):
  `assets/contracts-2k.js` (no DOM; in the import map; .mg-* at the end of styles.css; page gets class mg-page = navy card
  heads with gold italic titles). ring() = SVG ring (gold arc, red when over). capTable() REPLACES Team status ("Salary cap
  table"): team chips, big italic team name, 4 season buttons (S.capSeason, data-capseason; each shows $ room + pool years
  free), CAP ring (T.bySeason[i] vs CAP, centre = room) + POOL ring (sum of max(0, len - i) over signed rows vs POOL, centre
  = years free; owner: "a similar circle design ... next 4 years ahead"), callouts, legend, dark cap-hit table (selected
  season tinted, gold left edge = real NBA deal over), All 8 teams + Tier cutoffs in folds. Later seasons = contracts already
  running only (planner adds come on top). resignBoard() = "Contract extensions" card in the planner (was the Expiring
  table): hero (photo, italic name, contract N of 2, re-sign price ring) for the picked row (S.reSel, data-resel), table
  Name / Age / Status (Undecided / Re-sign N yrs / Released / Ineligible) / Expected / Contract / Decision (same sel()),
  strip re-signed N / 6, pool, cap room, roster; ineligible (2 contracts done) sorted last. contractCard() = EVERY player
  name in Contracts (card2k now = a button data-ccard) opens it at the top (S.card; × = data-ccard-close): header (#, pos,
  first + LAST, NBA team, age, Nth NBA season, fantasy team, FP/G ring), light panel (Contract N of 2 / Taxi / Free agent +
  why, tier, signed, dead money if cut, real NBA deal end, links to the 2K card + Advanced stats with back), season table
  (age, real NBA salary, cap hit). Checked Nov 8 2026: 320 / 402 / desktop no overflow, dark mode (.mg kept navy).
- DAY-ONE RELEASE + 23 CONTRACTS (owner, Nov 8 2026: "Initial contracts should have a max of 23 contracts offered. Add a
  Release option"): gm-ct-deals { rel: true, o, t } = no day-one contract; buildLeague moves him out of team.rows into
  team.released (grid all FA at his tier; free agent from 2027-28, next deal = contract 1), so payroll, pool, roster, planner,
  trade block and auction ignore him; picking a length (setLen) un-releases. Initial contracts: .cx-offer box "N / 23
  contracts offered · release N more" (red over, green otherwise; ROSTER_MAX, taxi exempt), a red "Release" button
  (data-rel) on every deal + rookie-deal row, "Released (free agents)" table with Undo (data-unrel; disabled while at 23).
  Not enforced beyond the warning (teams start at 26-28). Checked: Parma 26 -> released 3 -> 23 / 23, payroll $525 -> $520,
  pool 26 -> 23, every other tab renders.
- TAB ORDER (owner, Nov 8 2026): How it works, Initial contracts, Team status, Trade block, Offseason planner, Free agency
  auction, Waiver wire (VIEWS). Initial contracts' name column is frozen while its tables scroll sideways (.cx-init sticky).
- ONE-TIME TAXI FORGIVENESS (owner, Nov 8 2026): on day one a player NOT on taxi who is taxi-eligible for 2027-28 (taxiOk(exp,
  START_SEASON, cur) = inside his first 3 NBA seasons; today = the 2025 + 2026 classes on active rosters, e.g. Flagg, Dybantsa)
  gets a purple "Back to taxi" button (data-forgive) next to Release; gm-ct-deals { taxi: true } -> buildLeague slot 'taxi'
  (row.forgivable / row.forgiven; pick = rookies[pid] ?? { left: 0, forgiven: true } so he's on the rookie path: taxi while
  eligible, then $1 rookie deal from call-up through his 4th NBA season). Not a contract, not one of the 23; offer box also
  shows "N back to taxi" + taxi N / 15 (red over); "Back to taxi (one-time forgiveness)" table with Undo (data-unforgive,
  disabled at 23). In-season call-ups need cap room for the $1 (rule text in the table + How it works card 7; not simulated).
  Checked: owner 866760756052537344 (6 eligible) 22 -> 20 contracts, Wilson + Dybantsa Taxi 2027-29 then $1 2029-30, planner taxi call-ups right.

- ROSTERS, ASSISTANT COACH, DEPTH CHART, REPORT CARDS, TROPHY ROOM (owner, Nov 8 2026: "move 2k breakdown into the MyGM and
  call it Rosters, add the Assistant coach and depth chart ... a Report Cards section ... a Trophy Room section ... keep the
  beta tags on everything"): MYGM_TABS = Contracts, Rosters (renderBreakdown, tab id rosters), Assistant Coach (renderCoach),
  Depth Chart (renderDepth), Report Cards (renderReportCards), Trophy Room (renderTrophyRoom); their TEST_FEATURES entries are
  gone. MYGM_IDS maps office tab ids to MyGM ids (breakdown -> rosters); renderCommish forwards #/commish?tab=breakdown|coach|
  depth|contracts to #/mygm (same params). officeHash(tab, rest) = the right link for any office / MyGM tab (Briefing links,
  bindTeamPick); inOffice() = page commish OR mygm (replaced every `route().page !== 'commish'` guard: the moved renderers
  share #cm-body). Every internal 2K / Depth Chart link now points at #/mygm?tab=rosters / depth (app.js, advstats-ui.js,
  contracts-2k.js). renderMyGM sets CM_REDRAW (synced settings redraw the tab). Beta tags: tab labels + tf-body pseudo-tags.
  REPORT CARDS: team picker (?team=, default COMMISH) + renderLockCard(box, params m=team, { only: true, hash }) (only = no
  league board / highlights, adds "League rank N of 8"; week chips stay in MyGM; link to the whole league's card) + "Draft
  report card" = reportCardsView(owner) (Draft Kit card for one team, .dk-card-in, link to Draft Grades). Owner listed lock +
  draft report cards; possible later: Trade Court verdict record, Front Office / Value Desk trade grades, Props record.
  TROPHY ROOM (completed seasons with a champion): trophy case stats (titles, runner-up, No. 1 seeds by win % then PF like the
  Awards banner, playoff trips, manager awards, rivalry trophies), Season by season table (team name that season, record,
  seed, finish via finishes()), Manager awards (gmOfTheYear winner.o, draftOfYear winner.owner + steal.o; draftKitData()
  first), Rivalry trophies (RIVALRIES with this team, trophyHistory: seasons won, current holder, trophy image), Player honors
  on this team (breakdown.js playerAwards entries whose o = this team + championshipRings rings won here; grouped chips
  "2 × All-Fantasy (seasons)", ring = navy, individual = gold; names open the Rosters card with back = Trophy Room). .tr-* in
  styles.css. NOT included yet: Record Book records held. Checked Nov 8 2026: Parma = 2024-25 title, 3/3 playoff trips, Steal
  of the Draft 2024-25 (Sarr) + 2025-26 (Raynaud), The Crown Clash not won yet, 32 players (Banchero Championship MVP); Report
  Cards Parma lock grade B (5 of 8), draft B+ GPA 3.15; old links forward; office Test features list no longer has 2K /
  coach / depth; 402 px + dark OK.
- MYGM NAV (owner, Nov 8 2026, picked from 4 mockups: "C on desktop, D on phones"): MYGM_TABS entries are [id, label, short,
  icon]; renderMyGM draws <nav class="mg-nav"> (replaced the plain st-tabs bar). Desktop (700px+): navy 2K-style menu bar,
  26px icons, italic caps labels, gold text + underline on the open tab, a small Beta tag on every item. Phones (<700px): the
  same nav becomes a bottom tab bar fixed to the screen (icon + short label: Cap, Rosters, Coach, Depth, Grades, Trophies; gold
  top edge on the open tab; Beta tag only on the open tab), .mygm-page gets bottom padding, and .back-float / .bk-tray sit
  above it (body:has(.mg-nav)). New icons in ICONS: contract (page with a $), whistle. Solid navy in light mode, so theme.js
  leaves it as is in dark. Checked 320 (dark) / 597 / 1280 px, no page overflow.
## Test features (commish office, owner Oct 25 2026)
- Third tab group in the commish office ("My GM", "League office", "Test features"): where brand-new
  features are born and tested, early access for the owner only (the office is passcode-gated).
- RULE: every Test features tab AND every card inside it carries the "Beta" tag (.gm-beta) until the
  owner says the feature goes live. `assets/test-features.js`: TEST_FEATURES [{ id, label, since }]
  (tab id = #/commish?tab=id; testTabs() adds the tag to the tab label), BETA (the tag), betaCard(title,
  body, { sub, cls, id }) = a card with the tag in its title: draw EVERY card of a test feature with it.
  To add one: an entry in TEST_FEATURES + its renderer in renderCommish's `show` map (app.js).
  A test tab's body gets class tf-body (renderCommish); CSS adds a Beta pseudo-tag to every `.card-head h2` there
  without a .gm-beta, so pages built before they moved here (Assistant Coach) are tagged without code changes.
- GRADUATING (only when the owner says so): move the feature out of Test features to its real place
  (a public page in NAV/READY, or a My GM / League office tab), remove its TEST_FEATURES entry, swap
  betaCard for plain cards (no Beta tags), and note the date + new place here.
- Current test features:
  SLEEPER INSIDER (tab=sleeper; owner, Nov 8 2026): Sleeper's PRIVATE GraphQL API (https://sleeper.com/graphql, the one
  sleeper.com + the app use; unofficial, undocumented, can change any time, likely against Sleeper's terms: owner accepted),
  READ-ONLY. Logic `assets/sleeperpriv.js` (no DOM), page `assets/sleeperpriv-ui.js` (renderSleeperInsider(body, params, h),
  h = { DATA, esc, name, teamName, COMMISH, sleeper } from app.js renderSleeperPage), .si-* at the end of styles.css. HARD
  RULES: token only in this browser's localStorage 'slp-token' (NOT gmSave, NOT in SYNCED: a comment in sync.js says so,
  never in the repo / data/), sent only to sleeper.com (gql(): Authorization = the raw token, no "Bearer", like the site
  does), "Forget token" button; readOnlyProblem() refuses any text with "mutation"/"subscription" outside strings/comments
  BEFORE a request is made; `me` asks only user_id / username / display_name (never email / phone / token). Token how-to on
  the page (desktop: DevTools -> Network -> a graphql request's `authorization` header, or Application -> Local Storage ->
  sleeper.com -> `token`, where sleeper.com's code saves it at sign-in; iPhone has no DevTools). tokenInfo() reads a JWT's
  exp locally to show expiry.
  RESEARCH (Nov 8 2026, sleeper.com league app bundle sleepercdn.com/js/bundle-*.js + live calls): (1) LOCKS ARE IN
  `starters_games` = { player_id: Sleeper game_id } on matchup_legs / matchup_legs_raw / matchup_legs_related_to_roster: the
  game each starter is locked on (Lock-In mode; the app's lock button writes it via mutation update_matchup_leg); unlocked
  starters have no entry. game_id = the public /schedule/nba/regular/{s} rows' game_id. matchup_legs_raw(league_id, round)
  { starters starters_games ... } answers WITHOUT A LOGIN (points null in a live week). Checked vs the owner's Dev Dashboard
  picks: weeks 2-3 64 of 65 the same (only Peterson week 3: Sleeper locked Fri Nov 6, pick "not locked" = unresolved, ask
  him); week 2 27 / 27 on the page; 12 reads in a row byte-identical (unlike the public matchups feed). (2) TRADE BLOCK:
  league_players(league_id) { player_id metadata settings } also WITHOUT a login: settings.otb = roster_id that listed him,
  otb_added_at ms; metadata.note (the league's player notes, e.g. award/ring notes) + likes; settings
  last_substituted_as_starter:regular:{s}:{w} = ms of his last move into the starters that week (not used yet). 32 on blocks
  Nov 8. (3) NEED A LOGIN: matchup_legs (+ points, proj_points, max_points, players, subs), matchup_legs_related_to_roster,
  league_transactions_filtered (status_filters 'pending' = waiver claims, 'proposed' = trade offers; full field list in
  CANDIDATES), league_transactions_by_player, league_event_logs, me. Other no-login reads: scores(date, season,
  season_type, sport) (game_id, status, start_time, metadata with on_court + starters), roster_draft_picks. NOT TRIED WITH A
  TOKEN YET (Claude has none): what the login-only queries really return.
  Page cards (betaCard): "Your Sleeper token" (status, paste box type=password, Save / Check token (me) / Forget token, how-to
  fold, warnings); "Locks from Sleeper" (no login: week chips ?week=, every matchup's starters with 🔒 day · AWY @ HOM · box-
  score points (locks.js weekBoxes, league scoring) or "not locked", "= pick" / "≠ pick" vs Dev Dashboard picks
  (compareWithPicks, Firestore locks/), summary + differences line); "Trade block from Sleeper" (no login, per team, since
  date); "Explore Sleeper's private API" (CANDIDATES chips tagged no login / needs login, ?q=, fields per query, editable
  query + variables, "Send my token" (default on only for login queries with a token saved), Run -> HTTP / ms / KB / token
  sent?, Unauthorized explained, starters_games note, Copy JSON, 60 KB shown then Show all). NOTHING ELSE USES IT YET: coach,
  Dev Dashboard, weekfix, nightly job unchanged. Tested Nov 8 2026: live no-login queries (locks weeks 2-3, trade block,
  real "unauthorized" for event logs), token flow with a FAKE JWT and stubbed login answers (save strips "Bearer ", expiry,
  me check, forget), mutation refused with 0 requests sent, 320 / 402 / desktop no overflow, light + dark.
  OWNER'S ANSWERS (Nov 8 2026): locks = SHOW ONLY for now (coach / Briefing / live points unchanged); solver = ONLY BY A
  BUTTON ('Save Sleeper's locks as picks for week N' on this page -> Dev Dashboard picks; BUILT Nov 8, see below; nightly job stays
  public-API only); he'll use the token on his PHONE too (make the token card phone-friendly); wants next, after he checks
  Explore with his token: real trade blocks in Trade finder / Managers / 2K tags, his pending waivers + trade offers on the
  Briefing, lock history / event log (if it holds lineup or lock events), Sleeper's proj_points / max_points next to the coach's.
  SAVE AS PICKS (built Nov 8 2026, owner said build it): box at the top of the Locks card. picksToSave(locks, law,
  ownerOf, ptsOf, { done }) in sleeperpriv.js: Sleeper locks of LINEUP starters with no pick -> add { k 'lock', d, p =
  box-score points }; owner = the roster whose MATCHUP leg has him (traded-after-lock stays with the old team, like the
  Dev Dashboard); locks whose game id isn't on the schedule are skipped; unlocked starters with no pick are NOT saved.
  Existing picks are NEVER overwritten by "Save N as picks" (confirm first): each difference is listed with its own
  "Use Sleeper's" button (confirm); Sleeper "not locked" vs a lock pick can be replaced (k 'last') only when the week
  is over (week < Sleeper state week or last_scored_leg >= week), live weeks say "Sleeper may show his lock later".
  Writes go through app.js savePick (passed in h; same Firestore doc shape + rules as the Dev Dashboard, no rules
  change): the first save pops up sign-in / rules problems and stops; the rest are quiet; the card redraws after. Saved
  picks = word of law, so the coach / Briefing / Lock Report Card / Monday solve use them like any pick (said on the
  card). Tested with a STUBBED savePick on a copy of the page (week 3: 18 new + 36 matching = Sleeper's 54 locks, args
  right, Peterson replace = lock Fri 36 for simeoncampbell7) + made-up edge cases; a real Firestore write was NOT
  tested (needs the owner's sign-in). 320 px OK.
  NOT LOCKED = LAST LINEUP GAME (owner, Nov 8 2026): Sleeper's lock source has NO per-player points (matchup_legs_raw
  refuses players_points / starters_points; only team points, null while live). So every number on the Locks card is OUR
  math: locked = box score of the locked game (weekBoxes, league scoring); unlocked = countedGame() in sleeperpriv.js = his
  last game of the week IN THE LINEUP (bench dates from data/lgs.json via locks.js benchDates + breakdown.js loadLgs;
  "(N bench games skipped)"; no lineup game = 0); live week: "latest so far ... (N games left)" from weekBoxes sched for
  his NBA team. Each team gets a total line: "So far N (k starters still playing)" / "Total N = Sleeper's N ✓" / red
  "Total N vs Sleeper's M (+d: a box score corrected since, or a bench game the watcher missed)". Checked Nov 8 2026: week 2
  8 of 8 = Sleeper, week 1 7 of 8 (bigtrey5456 340 vs 343 = LaVine 45 -> 44 + Isaiah Stewart 26 -> 24 box-score
  corrections), all 25 unlocked starters of weeks 1-2 = league.json playerWeeks (incl. Podziemski / Hachimura bench
  games). Week 1 has no bench records (watcher started Oct 29). 320 px OK. Display only: picksToSave unchanged.
  STAT CORRECTIONS + ODD GAMES (owner, Nov 8 2026: "report player scores accurately (post stat correction) and keep whatever
  sleeper has as the final score ... make a note of it on the team ... add a section of all these weird games"): logic
  weekReport() + weekOddities() in sleeperpriv.js; the page loads each week once per visit (loadWeekRep: matchup_legs_raw +
  weekBoxes + lgs bench dates + league.json playerWeeks as `saved` = what Sleeper counted then; cache cleared after 5 min).
  Player rows = TODAY's box score; a row whose saved value differs gets a note ("Stat correction: Sleeper counted 45 then,
  box score now 44", or "Our records have N = his {day} game, not this one" when saved = another of his games). Finished
  week team line = "Final N (Sleeper)" (✓ when nothing to note) + notes: "Box scores now add up to X: LaVine 45 → 44, ..."
  and, if official - today - corrections != 0, a red "+d not explained" line. New card "Odd games this season" (between Locks
  and Trade block): every week 1..current scanned (newest first), kind chips with counts: corr (stat corrections), total
  (unexplained team total), other (records vs Sleeper on the game), pick (Sleeper's lock != Dev Dashboard pick; computed
  live every visit), zero (starter, every game from the bench = 0), bench ("Benched late": unlocked starter on the bench for
  games AFTER his last lineup game, so an earlier game counted; routine bench games before he moved in / before a lock are
  NOT listed; zero + bench only once he has NO games left: owner caught Dejounte Murray flagged mid-Sunday-game), extra
  (locked but not in the final starters), nogame. Weeks finished 3+ weeks ago are cached in localStorage
  si-odd-{season}-{week} (not synced; picks never cached). Checked Nov 8 2026: week 1 bigtrey5456 "Final 343" + LaVine /
  Stewart notes, the other 15 team-weeks of weeks 1-2 ✓; odd games = 4 (2 corrections wk 1, Dejounte Murray benched late wk 3,
  Saddiq Bey benched to 0 wk 3); the owner had already changed Peterson's wk 3 pick to Sleeper's (locked Fri), so no pick
  difference; 320 px + dark OK.
  LIVE LOCKS ON THE 2K BREAKDOWN + DEPTH CHART (owner, Nov 8 2026: "update the 2k breakdown as soon as a lock hits ...
  effectively live updated"): breakdown.js liveLocks(DATA) (page-side only, cached 2 min) = Sleeper's locks for the regular
  week in progress (state.week, only while last_scored_leg < week) from matchup_legs_raw (sleeperpriv.js, NO login) ->
  rows shaped like DATA.playerWeeks { s, w, t 'R', o (team whose MATCHUP lineup has him), pid, p (that game's box score,
  league scoring), date, live: true } + locked Set 'o|pid'. withLiveWeeks(DATA, live) = DATA with those rows appended to
  playerWeeks (a copy; DATA itself, the nightly job, weekfix, records and awards never see them). withLiveLgs(lgs, live) =
  a copy of data/lgs.json with that team's records of the player AFTER his lock date in the live week flagged 'k' at once
  (the watcher's markAfterLock still does it for real once the week settles). lgsSettled() = a finished week, or the live
  week once that player is locked for that team (Lock per start % counts only settled weeks). 2K breakdown (renderBreakdown,
  BK_LIVE; current season or Career only): Locked points / Wks Lk / Lk% / LGS column + card line (" · incl. week N lock
  (live)", .bk-livelk), Season by season Locked/Starts/LGS, Compare locked, game log navy lock row (x.live -> its date) and
  after-lock games no longer yellow. Depth Chart: LGS + Locked use the same overlay. Checked Nov 8 2026 week 3 (live): 55
  live locks, 82 after-lock LGS dropped across 45 players (Jrue Holiday locked Mon: 6 -> 3, Curry 3 -> 1); Parma locked points
  = Locks card (Sengun 97 -> 148, Booker 57 -> 99, ...); Sengun's game log Nov 2 navy, Nov 4 / 7 plain. FOUND: week 2 games of
  Oct 26-28 had no LGS (watcher started Oct 29), so locked weeks > LGS (Sengun 3 vs 2, 150%): scripts/lgs.mjs FILL_INS now
  [['2026', 1], ['2026', 2]] (one-time, next watcher run: 29 counted games of Oct 26-28 added as [1, owner, 'b'], 43 watched
  games untouched; simulated in the browser, the watcher itself not run). Lineup games of Oct 26-28 that weren't the counted
  game stay unknown.
  LIVE LOCKED SCORES ON HOME + MATCHUP HYPE (owner, Nov 8 2026: "currently locked scores as the big number ... 100%
  accurate"; REPLACES the Oct 22 rule that public pages show Sleeper's live total): breakdown.js liveTeamScores(DATA,
  season, week) per owner = Sleeper-locked starters (box score of the locked game) + unlocked starters whose LAST game of
  the week has tipped (in_game / complete: that game always counts, live while played; sat on the bench for it = his last
  lineup game via countedGame); unlocked starters with games left = `open` (not counted); `live` = starters in a game now.
  liveWeek() (app.js) adds out.lk (current season only, 9 s timeout, null = fall back to Sleeper's live total as before).
  lkScore(d, o) / lkNote(d, o). Hype: duel numbers = locked, label "Locked · K open · J playing" (data-lbl, refreshed
  every minute), lead line "X leads by N locked · ... K starters still open", status "Locked · updated", slate "locked".
  Home slide: score = locked, status "Locked · updated time" (owner removed the live totals the same night: "they don't add
  anything"; Sleeper's live total only shows when the lock data can't be read). Traffic: locks query ~3 KB + today's scores(date) statuses
  ~1 KB per call, season schedule once per 30 min, week box scores (~300 KB gzip) only while a game is in progress (max every
  2 min) or a game ended since (LS cache). Sleeper's per-day stats endpoint /stats/nba/{date} returns EMPTY stats (not
  usable). Checked Nov 8 2026 9:25 PM (week 3 Sunday): Main event 310–422 locked vs live 334–435 (live counts latest
  games); settled teams 386 / 399 / 362 / 422 = the Insider's Locks card totals. Wager Weeks tracker still uses Sleeper's
  live total (not changed).
  ASSISTANT COACH USES SLEEPER LOCKS (owner, Nov 8 2026): sleeperMarks(season, week) in app.js = liveLocks rows as marks
  { pid: { date, sleeper: true } } UNDER the manager's marks + Dev Dashboard picks: gmWeek marks = { ...slp, ...mergeMarks(...) }
  (coach, board, odds, Briefing, pipeline) and lockedPoints(..., fill) in gm.js (commish locked points). Opponents' locks
  are now known (My D Rose 399 locked, 0 left; Parma 260 = its 6 Sleeper locks). "How the coach decides" text updated.
  A LOCK IS A START (owner, Nov 8 2026: "assume week 1 locks had one LGS that week so max Lk% is 100%"): breakdown.js
  withLockLgs(lgs, DL) adds a virtual [1, owner, 'v'] LGS for any locked week (playerWeeks incl. live rows) with no LGS for
  that team that week; 2K + Depth Chart apply it after withLiveLgs; the game log ignores 'v'. Checked: Lk% over 100% for 17
  players (max 200%) -> 0 (max 100%); 30 virtual LGS today (week-2 gap; the watcher fill-in makes them real). Game-log tint:
  owner first asked to remove it on games after a current-week lock, then said the whole-row LGS tint is fine: unchanged.
  SOFT LOCK + NO MANUAL LOCKS IN THE COACH (owner, Nov 8 2026; REPLACES "HELD, NOT DONE" and the I-locked-him / game-chip /
  Not-locked marks above): "all locks will now be detected from Sleeper". sleeperMarks() returns null when Sleeper's lock data
  can't be read; gmWeek marks = slp ?? (old local marks + Dev Dashboard picks), lockedPoints(..., fill) uses fill alone when
  given. The coach card has no "I locked him" / "They locked him" / "Not locked" buttons and game chips are plain (handlers left
  in place, nothing to bind); the "What if I/they lock him?" button stays. SOFT LOCK = an unlocked starter on his LAST game of
  the week (gm.js coachCall: call 'held' (done playing, week not over, incl. no games = 0) or 'live' with no games left, flag
  r.soft): counts as locked (board tally: score in locked points, not in "left"; Briefing / board label "Soft lock", .mb-soft
  dashed box, .gm-soft card, summary "soft locked") but can still be moved off the lineup (planner still treats him as
  benchable, sim unchanged). lockedPoints (commish locked points) adds soft locks too (team's last game in_game / complete ->
  that game's box score). Soft locks NEVER touch the 2K breakdown / Depth Chart: those read liveLocks = Sleeper's real locks only
  (end-of-week settled weeks come from DATA.playerWeeks as before). Checked Nov 8 2026 week 3 Sunday night: Parma 324 locked,
  0 left (260 real locks + 3 soft = Home's locked score), My D Rose 399 / 0; Porter Jr. "Soft lock 27"; no mark buttons.
  TRADED PLAYERS' LK% PER STRETCH (owner, Nov 8 2026: LeBron's BenDoverPlz123 row in Season by season (League) showed 200%):
  stretches split a player's games by ownerAtWeek, so in a trade week EVERY game is the new team's; LGS were matched to a
  stretch by date, so the old team's LGS that week (and the virtual 'a lock is a start' LGS, dated the week's first watched
  day) fell outside both rows while the lock (matched by team + week, nearest stretch) still counted. Fix in renderBreakdown
  years(): segFor(o, w) = that team's stretch holding week w, else its nearest; locks AND LGS both use it (lgsIn's keep now
  gets the record's week). Checked all 30 players traded in 2026 (46 stretch rows): none over 100%; LeBron BenDover 2 wk /
  2 LGS = 100%, Parma 1 / 4 = 25%.
  DEFENSE VS POSITION (tab=defense; owner, Nov 2 2026): `assets/defense.js` (logic, no DOM) + `assets/defense-ui.js` (the
  page: renderDefense(body, params, h), h = { DATA, esc, gmLoad, gmSave, COMMISH, teamName } passed by app.js
  renderDefensePage; kept out of app.js on purpose), .dvp-* at the end of styles.css. Owner's answers: BOTH splits with a
  switch (PG / SG / SF / PF / C by Sleeper's main `position` from each box row's player (today's), or G / F / C = PG+SG,
  SF+PF), whole season or each defense's last 5 / 10 / 15 games, THIS SEASON ONLY (no blend; GP column + * under
  MIN_GAMES 3), placements: chart + this week's grades + chips on Coach / Briefing (streaming targets NOT wanted). Data:
  every finished game (schedule status complete) of the current season from /stats/nba/{s}/{w} (exhibitionRow skipped,
  played = gp or sp or min), each player's FP (fantasy(), that league's scoring_settings) added to the team he played
  AGAINST; per team-game row [date, game_id, def, off, then per PG..C: fp, min, starters' fp, starters' min]; starters =
  Sleeper schedule home/away .starters (NBA starting five; "Starters only" switch). Nightly update.mjs -> updateDefense ->
  data/defense.json { version DEFENSE_VERSION, at, seasons: { s: { weeks (finished weeks), through, sk (scoring key; a
  change rebuilds), rows } } } (current week re-read each night); pages: loadDefense() = saved file + weeks after it live
  (finished games, keyed game|def so no doubles), cached 2 min; no file = built from week 1. defenseTable(def, { split,
  window, who, metric: game | 36 (FP per 36 min at that position) }) -> per team per column v, rank (1 = allows the MOST =
  softest), diff vs the league average (average of the 30 teams). Grade (GRADE_CUTS on the rounded percent): A +12%+, B
  +5%+, C within 5%, D -5% to -12%, F under -12%. Page cards: chart (4 switch rows, gm-dvp-opts; sortable headers
  gm-dvp-sort, numbers sort softest first; heat green/red full at ±25%; Avg row; team column sticky, logos hidden <= 360px),
  "This week's matchups" (fantasy team select gm-dvp-team, default COMMISH; Sleeper state week's games per active player,
  taxi + IR left out, grade per game, finished games faded, player chip = average of games left, team line good A/B vs tough
  D/F), How it works. dvpChips(DATA, gmLoad, esc) -> (pid, opp) => chip in the page's saved view: Assistant Coach game chips
  (upcoming games, starters + bench/IR cards; game(r, g, pid)) and Briefing "Games by day" (pre_game). 'gm-dvp-' in SYNCED.
  Checked Nov 2 2026 (live, weeks 1-3, no saved file) vs raw box scores in PowerShell: ATL vs C 8 games 405 FP = 50.6, BOS vs
  SG 307 / 7 = 43.9, BOS vs PG 209 / 7 = 29.9 (= page); all switches; 320 / 402 / desktop no page overflow (the chart scrolls
  inside its box at 320). Seen while testing, NOT from this: the Briefing's Lock calls card is 428 px wide at 402.
  DEV DASHBOARD (tab=devdash; owner, Nov 1 2026): see `assets/locks.js` + DEV DASHBOARD under Architecture.
  ADVANCED STATS (tab=advanced; owner, Nov 4 2026: "plot graphs and charts with stats ... compare players and NBA teams ...
  in depth"): logic `assets/advstats.js` (no DOM), page `assets/advstats-ui.js` (renderAdvanced(body, params, h), h = {
  DATA, esc, gmLoad, gmSave, COMMISH, teamName } from app.js renderAdvancedPage), .as-* at the end of styles.css, hand-written
  SVG drawn to the card's width (redrawn on a 30px+ resize), tap any mark = its numbers in the card's navy .as-tip line.
  Owner's answers: all 4 chart types (game-by-game trends, percentile profile, scatter, consistency + FP mix) + all 4 "only
  here" views (role shift, rest / home / starter / opponent splits, team usage tree); players = the 2K Compare tray
  (gm-bk-cmp, up to 4, shared both ways; search box adds); teams = NBA + fantasy; pool switch His position (G/F/C) / Whole
  NBA / Rostered here; windows Season + Last 5 / 10 / 20 games, season chips 2023-24.. + Career; links from the 2K card
  ("Advanced stats →" in viewArrows, ?p= adds him, then dropped from the URL), the 2K Compare card ("Chart these players in
  Advanced Stats →", .bk-cmpadv) and the Depth Chart (.dc-adv: fantasy = Who carried the team, NBA = that team's usage tree);
  all carry back/backl (.bk-back pill). Saved view: gm-adv-opts { view, win, pool, trend, scatter, tree, teams, treeTeam,
  role, kind, ftree } ('gm-adv-' in SYNCED). Params ?view=players|teams, ?kind=nba|fantasy, ?nba=CODE, ?team=owner, ?season=.
  DATA: player games = breakdown.js gameLog per season (cached by get()), joined by enrichGames() with TEAM-GAME totals from
  data/adv-stats.json (nightly update.mjs -> updateAdvStats; ADV_VERSION 1): { seasons: { s: { sk (scoring key), weeks,
  through, complete, tg: { 'date|TEAM': TG [opp, home, fp, pts, reb, ast, stl, blk, to, fga, fta, oreb, min, tpm, fgm, ftm,
  PG..C fp] }, pt: { 'pid|TEAM': PT [gp, min, fp, pts, reb, ast, stl, blk, to, fga, fta, tpm, fgm, ftm, gs] }, pos } } }.
  Past seasons built once (maxPast 2 a night: first nights 2025 + 2024, then 2023; ~250 KB a season; no GS for past
  seasons; home flags from the schedule); the current season saves FINISHED weeks only (complete schedule games; gs = Sleeper
  schedule starting fives) and pages add later weeks live (loadAdv, cached 2 min). No file yet = current season built in the
  browser from week 1; past seasons say "arrive with the next nightly update" (usage / shares / rest / team views need them).
  A week of Sleeper box scores is ~1.7 MB, so pages never read a past season's weeks. Player cards: Game by game (dots +
  5-game rolling line, 3 for Last 5/10; FP / Minutes / Usage % / FP/36 / Points; x = date for one season, game number for
  Career / Last N), Percentile profile (radar of 8 + table of 11 stats; pool = SEASON averages of players with POOL_MIN 10+
  min/g and 40% of the most games; TO flipped), Scatter (Usage vs TS%, Minutes vs FP/G, Usage vs FP/G, Minutes vs FP/36;
  grey pool, darker = rostered here, dashed averages), Consistency (dots per game, 10th-90th band, median; boom/bust = 25%
  above/below his own window average, BOOM), Where the points come from (fpMix: per category under each game's season
  scoring; Bonuses = remainder: dd, td, 40/50-pt, 15-ast, 20-reb, flagrants), Role shift (one player, bars per fantasy week:
  minutes, usage, share of team shots, share of team FP, started %, FP/G; ▲▼ = minutes +-25% and 5+ vs the 3 weeks before;
  always the whole season, not the window), Splits (rest 0 / 1 / 2+ days since his TEAM's last game, home / away, started /
  bench, opponent soft / average / tough = that season's FP allowed to his position group vs average, +-5%, hindsight).
  Team cards (NBA): team chips (up to 4, select to add), Team profile (FP scored / allowed per game, pace = possessions
  FGA + .44 FTA + TO - OREB averaged with the opponent, FP per 100 possessions scored / allowed, league ranks; stacked FP by
  position and by category), Usage tree (squarified treemap of pt rows for that team: FP / Minutes / Shots / Plays used; grey =
  no longer on the team; top-3 share), Team map (30 teams, FP scored vs allowed, quadrants). The window applies to teams'
  last N games, not the usage tree. Fantasy: Who carried the team (treemap of DATA.playerWeeks locked points or starts by
  player, grey = not on the roster today) + Star power vs depth (all 8: locked, per start, players used, top-3 share).
  Checked Nov 4 2026 (live, weeks 1-3): Giannis 7 games 47.43 FP/G = raw box scores; Oct 21 usage 41.1% = by hand from MIA's
  team totals (Sleeper's TEAM_MIA row excluded, as the code does); Parma locked 716, Sengun 97 = league.json; browser run of
  updateAdvStats for 2025 + 2026: 2,462 team-games (1,231 x 2), 661 player-teams, 297 KB, 20 s; 2025-26 page from it (Giannis
  splits 36 games = home 19 + away 17); 320 / 402 / desktop no page overflow (wide tables scroll in .as-scroll). NOT checked:
  the first nightly run in Actions (look for "Advanced stats" lines in the log + data/adv-stats.json).
  CONTRACT SANDBOX (tab=contracts, tab label renamed from "Contracts" by the owner Nov 7 2026; owner, Nov 7 2026: the Reports' "Salary system v2" + "years pool" as a working sandbox): logic
  `assets/leaguecontracts.js` (no DOM; imports the rule constants now EXPORTED from report-salary-nba.js (tiers, cap
  rounding, dead money, rookie years) and report-yearspool.js (POOL 50, FOUR_YEAR_PER_SUMMER 2)), page `assets/contracts-ui.js`
  renderContracts(body, params, h) (h = { DATA, esc, gmLoad, gmSave, COMMISH, teamName, name, loadContracts } from app.js
  renderContractsPage), .cx-* at the end of styles.css (.ct-* is taken by the coach track record). Owner's answers (Contracts by player since round 4, see below): any team
  (picker, default COMMISH); day-one contracts are signed for START_SEASON 2027 (2027-28) = price = tier of his REAL 2027-28
  salary (nbaTier), locked for the league deal; a real deal not signed for that season = estimate (tier of his last real
  salary, never the rookie tier; italic "~$X") or the team's guess (gm-ct-guess { pid: price }, select on Initial contracts);
  "Suggest lengths" = age + FP/G (best FP/G first; age <= 24 -> 4, <= 27 -> 3, <= 30 -> 2, else 1; under SUGGEST_MIN_FPG 15 =
  1; max 2 fours; keeps SUGGEST_SPARE 3 pool years free); SANDBOX NOW, real later (saved per team with gmSave, synced via
  'gm-ct-'; a later step can publish the list as a static file). Data: data/contracts.json, live rosters, /v1/players/nba
  (years_exp: rookie tier = first 4 NBA seasons), loadBreakdown { list: 'league', withFa: true } (FP/G, age, free agents),
  rookiePicks(DATA) = rookie-draft picks with LEAGUE_ROOKIE_YEARS - (2027 - draft season) > 0 left (on the active roster =
  called up in his draft season; $1, fixed length); taxi = exempt, no contract. Cap = average day-one payroll + 10% rounded
  to $50 (Nov 7 2026 on 2027-28 prices: avg $458 -> cap $500, floor $400; the report's $450 used 2026-27 prices).
  Views (?view=, saved gm-ct-view; ?team= saved gm-ct-team): TEAM STATUS = League overview (all 8: payroll, room, pool, 4-yr
  deals, lengths set, est. prices; tap = that team) + team outlook grid (sticky player column, 2027-28..2030-31): navy cell =
  under league contract at the locked price, R = league rookie deal, striped "FA · $X" = re-sign / free agency at that
  season's tier, gold left edge + "new NBA deal" / "NBA deal ends · locked" = first season after his real NBA deal ends
  (nbaEnd = last season row incl. options; waived = none), Committed row per season. OFFSEASON PLANNER = summer before 2028-29
  (planSummer): expiring (len 1) with the new tier price + Re-sign 1-4 / Release (undecided = warning), still under contract
  with Cut (dead = 50% of price per season left, free at <= $3; years stay used this summer), taxi call-ups ($1 x 3, any taxi
  player), adds (name with a datalist of every player = his 2028-29 tier, or a made-up one with a picked price; Rookie pick
  = $1 x 3); live payroll / pool / 4-season count + warnings + 4-season money table; gm-ct-plan-{owner} { re, cut, up,
  adds }. INITIAL CONTRACTS = length buttons 1-4 per player (gm-ct-init-{owner} { at, len }), unset = 1; buttons that would
  pass the pool or the 2 fours are disabled with the reason; Everyone 1 season / Suggest (confirm when lengths exist).
  WAIVER WIRE (owner added the same day) = every free agent with an NBA team: FP/G (3+ GP sorted first), real salary, CAP
  HIT NOW = his tier on this season's real salary (rest-of-season deal, 1 pool year), 2027-28 price, Fits? vs the picked
  team's day-one payroll and pool; search + sort FP/G / Cap hit / Salary / Age, 50 at a time. Links everywhere: name ->
  2K card (list=league, &fa=1 for free agents), "Adv" -> Advanced Stats (?p= adds him to the shared compare tray), both with
  back/backl = "Back to Contracts". Checked Nov 7 2026 (live rosters + real files): Booker 2027-28 $61.0M -> $50, Haliburton
  $52.3M -> $40 (2028-29 $55.7M -> $50), Banchero $44.8M -> $30 (just under the $45M cutoff), Sengun $37.3M -> $30; Parma
  Suggest 47 / 50 years, 2 fours (Sengun, Banchero); planner re-sign 4 / release / cut / adds totals right; 320 / desktop no
  page overflow (grids scroll in .rc-scroll); 2K + Advanced back pills work. Not tested: Firestore sync of gm-ct- keys.
  SECOND ROUND (owner, same day): TRADE BLOCK view (?view=block, 2nd tab): gm-ct-block-{owner} = [pid] per team (sandbox: set
  any team's block). whoCanAfford(L, from, row) in leaguecontracts.js: per other team cap room + pool years free vs his
  contract (price + seasons left move with him; trades aren't new signings, so no 4-season limit; taxi = $0 / 0 years):
  Yes, or "Only if they send back $X+ and/or N+ yrs" with their cheapest single player that covers it AND keeps the seller
  under the cap + pool ("e.g. Jimmy Butler III ($50, 1 season)"); when the seller is over the cap even after moving him it
  says it can't take salary back. Cards: the team's block (verdict table per player), "Add players to the block" (+ Block,
  N / 7 teams that can afford), "Other teams' blocks: can {team} afford them?". PLANNER now shows the day-one decisions:
  summary line (N x 4 / 3 / 2 / 1 seasons, unset count in red = they expire here) + a "Day one: N seasons · 2027-28 –
  2030-31" line on every row (rookie deals too); "Still under contract (day-one deals running)" card moved above Expiring
  (owner: "I wouldn't be re-signing a player I initially signed on the 4 year deal": they were already carried, never in
  Expiring, but it wasn't visible). Checked Nov 7 2026: Parma Suggest -> Sengun / Banchero 4 seasons carried with 3 left,
  1-season deals in Expiring; Tatum on loganzarvell's block = 3 of 7 teams can afford, bigtrey via Butler; 320 px no overflow.
  THIRD ROUND (owner, same day): TAB ORDER Initial contracts, Team status, Trade block, Offseason planner, Waiver wire (VIEWS;
  default view = init when nothing is saved). UPCOMING FREE AGENTS card in the planner (upcomingFas in contracts-ui.js, above
  "Add free agents and rookies"): every OTHER team's planSummer expiring players not re-signed in that team's own plan
  (released = red tag, undecided = "not re-signed yet"), sorted by FP/G, top 30 + Show all, at the 2028-29 tier price, Fits?
  vs this plan (payroll after the plan + price <= cap, 1+ pool year free); "Add" = an add in this plan (1 season); added
  players now have a 1-4 length select (data-addlen). Red note when other teams have no day-one lengths set (their whole
  roster shows as free agents). Checked Nov 7 2026: 175 listed with only Parma's lengths set, Doncic added at $50 then 3
  seasons -> payroll $446, pool 24 / 50; 320 px no overflow.
  FOURTH ROUND (owner, same day: "fix the first two" of the gaps list): (1) CONTRACTS BELONG TO THE PLAYER: one synced store
  gm-ct-deals { at, d: { pid: { len, o (team that signed it), t } } } replaces gm-ct-init-{owner} (old per-team saves folded
  in once on the first visit, that team = signer); buildLeague({ deals }) gives every row signer + traded (signer != the
  roster he's on now), so a Sleeper trade carries length + price to the new team ("traded in (signed by X)" tag, .cx-trd);
  the 4-season limit counts only deals THIS team signed (t.fours, lengthBlock); Suggest / Everyone 1 season skip traded-in
  contracts (suggestLengths counts their years as fixed). Plans and trade blocks stay per team. (2) TIER CUTOFFS GROW WITH
  THE NBA CAP: leaguecontracts.js TIER_BASE 2026, CAP_GROWTH 0.07 (owner may change when real caps are announced),
  tierScale(s), tierFor(salary, s); priceFor reads a real salary against THAT season's grown cutoffs (rookie / no-deal tiers
  unchanged) and estimates from his last salary against that last season's cutoffs; report-salary-nba.js is NOT changed
  (current season, scale 1). Team status has a "Tier cutoffs by season" card (2026-27 .. 2030-31). Effect Nov 7 2026: cap
  $500 -> $450 (avg $425; same as the report), Parma $567 -> $525; Sengun 2027-28 $37.3M -> $20 (near max starts at $37.5M);
  Haliburton 2028-29 $55.7M -> $40 (max, was supermax); Booker 2029-30 $69.2M still $50. Tested: migration, simulated trade
  (Sengun signed by loganzarvell, on Parma: tag shown, Parma fours 1 / 2 after Suggest, his deal untouched), 320 px no overflow.
  FIFTH ROUND (owner, Nov 8 2026: "a rookie could technically be part of the team for 6 years (3 on taxi and 3 on rookie
  deal)"): leaguecontracts.js TAXI_YEARS 3 + taxiOk(exp, season, cur) = Sleeper years_exp + seasons ahead < 3 (his first 3
  NBA seasons, = commish.js TAXI_SEASONS). rookiePicks(DATA, history) now starts the $1 rookie deal clock at CALL-UP, not
  the draft: history = every league season's Sleeper rosters (past = as the season ended, current = live; fetched by the
  page), callUp = first season from his draft on where he finished on a roster off taxi; { ds, callUp, left }. Only OUR
  rookie draft picks get the league rookie deal (De Larrea / Reed / Philon on Parma's taxi are FA pickups: their call-up
  signs at their tier, $1 for NBA rookies anyway, 1 season). Grid taxi rows: "Taxi" while taxiOk (+ "last taxi season"),
  then for picks a projected dashed "$1 R" x 3 (k 'proj', .cx-proj, first = "call-up due"; NOT counted in money / pool
  until the planner calls him up), then FA; non-picks go to FA. Planner taxi card: "Can stay on taxi through X" or red
  "Taxi time is up: call him up or he's released" (forced, warning in the totals), call-up = $1 x 3 for picks, his tier x 1
  for others (planSummer takes cur). Checked Nov 8 2026: Stirtz (2026 pick) taxi 2026-28, call-up due 2029-30, R through
  2031-32 = 6 seasons; da Silva called up 2025-26 -> 1 left at 2027-28; forced in summer 2028: Cardwell, Raynaud, Penda.
  SIXTH ROUND (owner, Nov 8 2026: "any taxi rookie"): the league rookie deal ($1 x 3 from call-up) goes to every rookie draft
  pick AND every player ever seen on a taxi squad in the roster history (undrafted rookies stashed there); rookiePicks adds
  them with ds = first season seen on taxi, drafted false (a draft pick's own entry wins). Replaces the "only our draft
  picks" rule of the fifth round: De Larrea / Reed / Philon / Cardwell now show taxi -> call-up due -> $1 R x 3 and the
  planner calls them up at $1 x 3.
  SEVENTH ROUND (owner, Nov 8 2026), rookiePicks(DATA, history, start, { taxiLog, cur }) rewritten: (1) DROPS RESET IT: the
  latest waiver / free_agent ADD restarts a player's path; picked up straight onto an active roster = normal waiver add (no
  rookie deal, even for a former draft pick / taxi player); back on the rookie path only if he is seen on a taxi squad after
  that pickup (history season or taxi-log 'on' event). Trades and commissioner moves never reset. (2) TRADES KEEP IT
  ("taxi trades retain the rookie contract as they were never dropped"): Sleeper puts a traded taxi player on the new team's
  ACTIVE roster until it moves him, so in the season in progress a player whose last move is a trade that he left a taxi
  squad in (data/taxi-log.json 'out' event by the sender within 3 days of the trade; before the log: on taxi at the previous
  season's end) and with no 'up' event by the new team since = tradedTaxi: buildLeague treats him as taxi (exempt, no cap
  hit, tag "traded off taxi: still taxi"), no call-up. Real case: Morez Johnson Jr., Nov 2 2026, ~17 h active on
  BenDoverPlz123 before going to taxi. (3) SENT BACK DOWN at the trade deadline = "as if he had always been on the taxi":
  callUp = first season off taxi AFTER the last season he finished on a taxi squad (earlier call-ups wiped; rookie deal
  starts fresh at the next call-up; taxi time still ends after his 3rd NBA season). The page now loads data/taxi-log.json.
  Tested Nov 8 2026 with made-up cases (traded off taxi -> still taxi; activated by new team -> call-up; sent back down ->
  no call-up; dropped -> active = normal add; dropped -> taxi = rookie path) and live data: Tristan da Silva and Zaccharie
  Risacher (2024 picks, dropped and re-added in 2026 straight to active) are now normal deals, not rookie deals.
  NO FLOOR (owner, Nov 8 2026: "drop the floor"): the sandbox has a cap only. buildLeague no longer returns `floor`,
  planSummer has no floor warning, the page dropped the floor marker / "under floor" labels (header says "no floor").
  Reason given to the owner: low payroll here = young / rebuilding (rookies $1, taxi exempt), and with no real money a floor
  needs an invented penalty. The reports (report-salary-nba.js FLOOR_SHARE etc.) still describe a floor: they're the
  original proposals, unchanged.
  ROSTER LIMIT (owner, Nov 8 2026: "23 is the max roster size"): leaguecontracts.js ROSTER_MAX 23 (active + IR, taxi not
  counted = the Depth Chart's ROSTER_LIMIT rule) + TAXI_MAX 15. Shown: overview "Roster" column (red when over), team card
  "roster N / 23 + M taxi", Initial contracts summary, planner totals (P.roster) + warnings (over 23 signed; over 15 left on
  taxi). whoCanAfford adds needSpot (roster spot, or taxi spot for a taxi player): money + years fit but no spot =
  "Roster full (26 / 23): send back any player or drop one" (Taxi full for taxi players); trade-block table has a Roster
  column. Upcoming FAs "Fits?" needs P.roster < 23 ("Roster full"); Waiver wire "Fits?" needs a spot ("Drop first").
  Nov 8 2026: every team but simeoncampbell7 (22) is over 23 today (jimmycooks2 28, tzola13 28, Parma 26...).
  REST-OF-SEASON ADDS ARE EXEMPT from the years pool (owner, Nov 8 2026; the years-pool report said 1 year each): waiver
  "Fits?" checks cap room + a roster spot only; SUGGEST_SPARE = 0 (Suggest can use all 50 years; raise it to hold some
  back). Checked: Parma Suggest 50 / 50, 2 fours.
  ROS ON DAY ONE (owner, Nov 8 2026: "show the players that were added this season and that would be eligible for rest of
  season waiver exception to contract pool"): buildLeague({ txs: DATA.transactions }) finds each player's latest waiver /
  free_agent add; if it was this season (cur) and he's a 'deal' row, rosOk (a later trade keeps it). Eligible players
  default to ros = a rest-of-season deal (1 season, 0 pool years: t.pool skips them, lengthBlock / suggestLengths count
  them at 0) until the team picks 1-4 (= a real contract, full years). gm-ct-deals entry { len: 1, ros: true } = ROS.
  Initial contracts: green box "Added this season: N players qualify for the rest-of-season exception" (names + ROS / N
  seasons), an "ROS" button first in the length chooser, and "Picked up {date} (waiver $bid / free agent): ..." under each
  name; quick fills keep eligible players left at 1 season on ROS. Team status rows say "ROS (rest-of-season, no pool
  years)". Checked Nov 8 2026: Parma 7 pickups (Robinson, Hachimura, Eason, Portis, Coulibaly, da Silva, Risacher) -> pool
  26 -> 19; Robinson set to 3 seasons -> 22; Suggest gave Hachimura 2, Eason / da Silva / Risacher 3, kept the rest ROS
  (49 / 50); 320 px no overflow.
  PLANNER LABELS (owner, Nov 8 2026: Raynaud read as "not eligible"; the clock was right (2025 pick, rookie 2025-26, taxi
  through 2027-28 = his 3rd NBA season) but the owner took the planner for THIS coming summer): tab label "Offseason planner
  (summer 2028)", card "· summer 2028" + gold .cx-when box ("summer 2028, after the 2027-28 season (day one) and before
  2028-29 ... not this coming summer"), Upcoming FAs "summer 2028 (before 2028-29)"; taxi rows "Can stay on taxi through X
  (his 3rd NBA season)" / "Taxi time is up after X (his 3rd NBA season): call him up for Y or he's released"; grid tag "last
  taxi season (3rd NBA season)"; warning "finished their 3rd NBA season, so taxi time is up for 2028-29". Rule unchanged.
  FOUR SUMMERS (owner, Nov 8 2026: "year selections for the next 4 years so I can see how each year looks with accurate
  data"): planner chips Summer 2028 / 2029 / 2030 / 2031 (SUMMERS; gm-ct-summer). Plans per summer: gm-ct-plan-{owner} =
  { at, y: { year: { re, cut, up, adds } } } (an older one-summer save = summer 2028). leaguecontracts.js rollPlans(team,
  plans, { cap, cur, upTo, priceAt, mkRow }) chains planSummer: each P returns `next` (rows going into that season:
  carried with len = left, re-signed { signedIn, signLen, new price locked }, called-up taxi { calledUpIn, signLen }, taxi
  still eligible, adds via mkRow) + `deadNext` (dead money still owed: { name, amt, left }), which feed the next summer;
  planSummer adds incoming `dead` to money. Undecided expiring players in an earlier summer = released. Prices for later
  summers = each player's real contract for that season (grown cutoffs); made-up adds keep their price (r.fake). Rows show
  their origin ("Day one: 4 seasons · 2027-28 – 2030-31" from len0, "Re-signed summer 2028: 2 seasons · through 2029-30",
  "Added summer 2028 ...", "Called up summer 2028 ..."); top card: "Built on your summer 2028 + 2029 plans: ..." line and
  "Dead money from earlier cuts". Upcoming FAs per summer use every other team's own chain. "Reset this plan" clears only
  the shown summer. Checked Nov 8 2026: Parma 2028 re-sign Ingram 2 / cut Sengun ($20 x 4 left -> $10 dead) / call up
  Raynaud / add Doncic 1 -> 2029: Ingram + Raynaud carried, Doncic expiring, Sengun $10 x 2 dead; 2030: Ingram expiring;
  320 px no overflow.
  ROOKIE DEAL / SERVICE TIME / RE-SIGN LIMIT (owner, Nov 8 2026): (1) $1 LEAGUE ROOKIE DEAL = from CALL-UP (nothing on the
  books while on taxi) to the end of his NBA rookie years (first ROOKIE_SEASONS 4 NBA seasons; "Option A": then he costs
  his real-salary tier): rookieThrough(exp, cur) / rookieLen(exp, cur, from) in leaguecontracts.js; rookiePicks(..., { all })
  left = rookieThrough - start + 1 (<= 0 = normal deal); taxi grid projects $1 R only through rookieThrough (a player
  called up after 3 taxi seasons gets 1 cheap season); planner call-up upLen = rookieLen; rookie-pick adds = 4. Replaces
  the old 3-seasons-from-call-up rule. Checked: 2026 rookies 3 left on day one (Dybantsa, Peterson through 2029-30), 2025
  class 2 (Flagg), 2024 class 1 (Sarr, Castle, Clingan). (2) SERVICE_MAX 8 LEAGUE-WIDE (not per team), RETROACTIVE from
  2023: serviceMap(history, cur, skip) = league seasons he finished on an active roster or IR (taxi seasons and traded-off-
  taxi don't count); row svc / svcLeft / svcEnd; day-one lengths capped (lengthBlock "8-season service limit"; Suggest);
  grid red striped "FA · 8 seasons" + "service limit: free agent" tag (.cx-svcfa / .cx-svc1); Initial contracts line
  "League service: N seasons · can be signed through X at most"; planner: svcNow = svc + 1 per season under contract
  (next rows carry svc), at 8 = svcOut (choice forced to release, "8 seasons played: free agency", no re-sign slot used),
  re-sign lengths capped at 8 - svcNow; a summer free-agency signing (plan add) resets svc to 0; Upcoming FAs tag "8 league
  seasons: must hit free agency". Loaner trades in a player's 8th season need nothing extra (contracts travel). Startup
  players have 4 seasons by 2027 -> signed through 2030-31 at most -> the big wave of forced free agents is summer 2031
  (owner was told; leave as is for now). (3) RESIGN_MAX 6 re-signings per summer per team (players coming off the league
  rookie deal exempt; rest-of-season pickups count): P.resigns, warning, "re-signed N / 6" in the totals, further re-sign
  options greyed once 6 are used. Checked Nov 8 2026: Parma 7th expiring player's re-sign options disabled at 6 / 6; Booker
  on a 4-season deal = svcOut in summer 2031; 320 px no overflow.
  SERVICE = NBA SEASONS (owner, same day, REPLACES the league-seasons-from-2023 clock above: "based on their rookie year so
  numbers divisible by 8 would effectively be at 0 ... every player accrues service time regardless of league team
  rostering"): service = his NBA seasons from his rookie year (Sleeper years_exp; taxi, free agency, any team all count),
  in 8-season CYCLES: after his 8th, 16th, 24th ... NBA season he goes to free agency. leaguecontracts.js nbaYear(exp, s,
  cur) = his Nth NBA season in season s; cycleDone(exp, s, cur) = seasons done in the current cycle before s (0 = fresh);
  row svc = cycleDone at day one, svcLeft = 8 - svc, svcEnd; planner done = exp + (summer - cur), svcOut when done is a
  multiple of 8 (> 0), maxLen = 8 - done % 8; no reset bookkeeping (the cycle does it); serviceMap() is no longer used.
  Shown: Initial contracts "NBA rookie year 2015-16 · 2027-28 = his 13th NBA season · service 4 of 8 done (free agency
  after every 8th) · can be signed through 2030-31 at most" (svcLine in contracts-ui.js, also on every Waiver wire row),
  "NBA yr N now" in every row's sub line (this season), grid "FA · after NBA yr 16" + tag, planner "NBA yr 8 done (1 x 8):
  free agency", Upcoming FAs "NBA yr N done: must hit free agency". Sleeper's years_exp is wrong for a few players (see
  Rookie of the Year notes): the shown rookie year makes that visible. Checked Nov 8 2026: Booker (2015-16) 13th season in
  2027-28 -> through 2030-31; Banchero (2022-23) through 2029-30 (4 disabled); Sengun (2021-22) through 2028-29, a 2-season
  deal -> summer 2029 free agency; Harden (2009-10) 19th -> through 2032-33; Mo Bamba on the wire 10th season, 1 of 8.
  IN-SEASON PICKUPS FREE (owner, Nov 8 2026: "I don't want in-season waiver wire pickups to count towards the salary cap or
  the year pool ... remove the ROS thing from the initial contracts because that will be done in the offseason"): the "ROS
  ON DAY ONE" exception above is REMOVED (buildLeague no longer reads txs for pickups; rosOk / ros always false; no ROS
  button, green box or "Picked up" line; old { ros: true } saves = a normal 1-season deal; every day-one player takes pool
  years). Waiver wire tab = "Waiver wire: in-season pickups": a pickup has no cap hit and no pool years, only a roster spot;
  columns Player (NBA years line), FP/G, Real now, "2027-28 price" (= his tier if re-signed / signed on day one), "Roster
  spot?" (Yes / Drop first); sort chip "Re-sign price". Keeping him after the season = a summer re-sign at his tier (counts
  toward the 6, uses pool years). Checked Nov 8 2026: Parma all-1-season pool 26 / 50 (Robinson etc. normal rows), Suggest
  49 / 50; waiver rows show price + roster spot only.
  CUT PLAYERS (owner, Nov 8 2026, "Yes, build them"): (1) another team signs a player you cut = the dead money STAYS with
  the cutting team (no NBA-style set-off); Upcoming FAs now also lists every other team's cuts that summer ("Cut by X (dead
  money stays with them)", price = his tier that summer). (2) the cutting team can't sign him again until his old deal's
  last season is over: planSummer({ banned }) (rollPlans carries bannedNext: pid -> summer + left - 1 at the cut; cuts the
  same summer count too); a banned add gets a.banned, is left out of money / pool / roster / next, and warns "you cut him, so
  he can't come back until after X"; the page's add buttons (Upcoming FA "Add" + the add form) refuse it with an alert
  (banCheck). (3) in season (not simulated): re-adding a player you cut restores his old contract and cancels the dead money
  = a written rule in the planner text (expanded Nov 8 2026: a cut ends his contract, nobody inherits his old seasons; in-season pickup = free, re-sign at tier that summer; unsigned at season end = free agent for any other team; cut in his last season = cutting team may sign him the next summer). Checked Nov 8 2026: Booker (4-season deal) cut in summer 2028 -> $25 dead, re-add
  blocked through 2030-31 (allowed in summer 2031), loganzarvell's Upcoming FAs list him "Cut by bigdaddyburk".
  HOW IT WORKS (owner, Nov 8 2026: "a friendly graphic that explains every aspect"): 6th tab (?view=how), `assets/contracts-how.js`
  howItWorks(L) (own module, in the import map; .hw-* at the end of styles.css, plain HTML/CSS graphics so theme.js dark
  mode converts them; every number from the leaguecontracts.js constants + L.cap, so rule changes update it). Cards: big
  picture (Price / Length / Limits pillars), price ladder (tier bars + grown real-salary cutoffs for 2027-28, rookie $1),
  price lock example (real salary bars rising, league price locked $20 x 3), a player's life (2 rows of 8 NBA seasons:
  taxi -> $1 rookie deal through yr 4 -> deals at tier, gold edge = free agency after every 8th; service, loaner stars, any
  taxi rookie), years pool (50 squares filled with an example: 2 x 4, 4 x 3, 6 x 2, 12 x 1, 6 free; 4-season limit, taxi /
  pickups free), the league year (7 numbered steps incl. 6 re-signings, FAAB free agency, hard cap check), cuts (a $20
  player with 3 left -> $10 x 3; free <= $3; a cut ends his contract; no return until the old deal ends), trades + taxi
  (contract travels, must fit cap / pool / roster, taxi trades keep the rookie path, sent back down, drops reset), all the
  numbers. Checked Nov 8 2026: desktop, 402, 320 (no overflow), dark mode.
  FIXED CAP + FLOOR + FREE-AGENCY AUCTION (owner, Nov 8 2026: "increase salary cap to a clean $500 ... public bidding ...
  contract price only, once the price is won, the team then decides how long. If you're actively winning a bid it should
  count against your cap, if you're outbid, it comes back ... a section that shows every team's active salary cap"):
  leaguecontracts.js CAP 500 (fixed; buildLeague no longer uses average + 10%), FLOOR 300 (re-introduced: planSummer
  warning "Under the $300 floor ... the gap becomes dead money the season after"; rollPlans / chainFor pass L.floor),
  OPEN_SHARE 0.5 (opening bid >= half his tier price, openingBid()), BID_STEP $1, BID_HOURS 24 (soft close per player).
  New tab "Free agency auction" (?view=fa, after the planner; year chips = the planner's summers) = `assets/contracts-fa.js`
  (faView / faEvent / capBoard; helpers via faCtx in contracts-ui.js; .fa-* in styles.css; in the import map). PRACTICE MODE:
  "Bid as" any team, "Close" by hand (no server); gm-ct-auc { y: { summer: { bids: { pid: [{ o, p, t }] }, closed: { pid:
  { o, p, t } } } } } (synced via gm-ct-). Cards: CAP BOARD (every team: signed = that summer's plan money incl. dead money
  + players won, leading bids + count, room = 500 - signed - leading, roster incl. leading bids, pool free, 4-yr left,
  re-signed N / 6, "Under the $300 floor" note); FREE AGENTS = every team's chain that summer: expiring not re-signed
  (released / not re-signed / NBA yr N service FA) + its cuts (+ checkbox "Include every unsigned NBA player"), sorted by high
  bid then FP/G, 40 at a time, search (applies on Enter / blur); row = tier, opening bid, high bid + leader + "closes in ~Nh",
  bid input (min = high + $1 or the opening bid; refused over room; blocked: you lead / roster full / you cut him (ban) / not
  enough room), Close, bid history + "Undo last bid"; SIGNED IN FREE AGENCY = closed players with a 1-4 length select ->
  winner's plan add { id auc-{pid}, auction: true } (so cap / pool / roster everywhere include him), Reopen = undo. How it
  works: Limits pillar (fixed cap + floor), step 4 = the auction, step 6 floor check, new card "8. Free agency: the public
  auction" (example: A $15 and B $18 outbid, C $20 leads, 24 h -> C wins, picks 1-4), numbers card + floor + opening bid.
  Checked Nov 8 2026: Parma room $138 -> $113 leading Doncic at $25, logan $24 refused (min $26), $31 -> Parma room back,
  close -> logan's 2028 plan add, 3 seasons -> signed $34 / pool 44 free; 320 px no overflow (fa, how, plan). A REAL mode
  (managers bid from their own sign-in, Firestore like Props, clocks by timestamp, commish confirms results) is NOT built.
  SERVICE CLOCK, FINAL (owner, Nov 8 2026, REPLACES "SERVICE = NBA SEASONS" above: "everyone's FA eligibility start from the
  2023 startup draft ... if a player hits FA (not rostered by a team at the end of the season or not re-signed by a team)
  his 8 year clock resets and any team can bid on him"): leaguecontracts.js serviceMap(history, cur, skip) = league seasons IN
  A ROW he finished on any team's active roster or IR, walking season-end rosters from 2023 (season in progress = live):
  active / IR +1, taxi no change (clock off), on no roster at a season's end = 0. buildLeague({ service }) row svc / svcLeft
  (8 - svc) / svcEnd; planner svcNow = svc + 1 per season under contract (carried / re-signed rows carry svc), 8 = svcOut (free
  agency, no re-sign slot), re-sign lengths capped at 8 - svcNow; every free-agency signing (plan adds incl. auction wins) =
  svc 0; a player not re-signed is a free agent (any team, old one included, can bid). nbaYear / cycleDone stay exported but
  unused; the "NBA yr N now" tag and NBA rookie-year line are gone. Page: "League service: 4 seasons in a row on league
  rosters (2023-24 to 2026-27, since the startup) · 8 = free agency · can be signed through 2030-31 at most"; grid "FA · 8
  seasons"; planner / Upcoming FAs / auction "8 league seasons in a row: ..."; How it works "A player's life" = 3 taxi boxes
  (clock off) + 8 seasons (season 1 rookie $1, gold edge after 8) + clock bullets. Checked Nov 8 2026: Parma startup players
  4 (through 2030-31), Robinson 1 (FA at the end of 2025-26), Coulibaly 3 (2024-25 on), Nurkic 2; Booker 4-season deal ->
  summer 2031 service free agent. The summer 2031 wave is back (startup class), as the owner chose.
  TWO CONTRACTS, OPTION B (owner, Nov 8 2026; REPLACES the 8-season service clock above): a player may be on CONTRACTS_MAX 2
  contracts in a row; when the 2nd ends he goes to free agency (no re-sign; any team, old one included, can bid; the next
  signing is contract 1). Contracts = day-one deals, re-signings, free-agency signings (plan adds + auction wins), the $1
  rookie deal; taxi and in-season pickups are not contracts. OPTION B (retroactive): serviceMap still runs, and a player on
  league rosters (active / IR) every season since the 2023 startup (svc >= cur - 2023 + 1) has used one: his day-one deal =
  contract 2 of 2 (row.cn 2; rookie deals and everyone else cn 1; taxi 0). No length caps any more (lengthBlock / Suggest
  service checks removed). Planner: expiring cn >= 2 = svcOut ("2nd contract over: free agency", no re-sign slot); re-sign ->
  cn + 1; call-up -> cn 1; adds -> cn 1; carried keep cn. Rookies: rookie deal (call-up -> 4th NBA season) + 1 more = at most
  8 years from the draft, taxi included. Page: Initial contracts "Contract 2 of 2 on day one (on league rosters every season
  since the 2023 startup): free agency when it ends" / "Contract 1 of 2 on day one: one more contract after it" / taxi + free
  agent lines; planner rows "Contract N of 2" (dayOne wrapper) + "Contract 1 of 2 ends: a re-sign is his 2nd and last"; grid
  "FA · 2 contracts done"; Upcoming FAs / auction "2 contracts done". How it works "A player's life" = a drafted rookie row
  (taxi, C1 rookie x3, C2 x4, FA) + a startup veteran row (C2 day one x2, FA, C1 x3, C2 re-sign) + bullets; numbers card "2
  contracts in a row". Checked Nov 8 2026: Parma 19 of 26 startup holdovers = contract 2, 7 = contract 1 (Robinson,
  Coulibaly...); Booker 2-season day-one deal -> summer 2029 free agent; Robinson 1 + re-sign 2 -> summer 2030 free agent;
  320 px no overflow (How it works boxes fit).
  RE-SIGN PRICE OF A FREE-AGENCY SIGNING (owner, Nov 8 2026, "Higher of price or tier"): rows from plan adds (incl. auction
  wins) carry market: true (not rookie adds); planSummer expiring: tierNext = his plain tier (priceAt), next = tierNext,
  but when r.market and his current price is higher, next.price = his current price (kept: true, "keeps his free-agency price
  (re-signing never lowers it)" on the planner row). Tier-priced deals re-sign at the tier as before. Other teams always see
  the plain tier: Upcoming FAs use next = r.tierNext and the auction's tier = (r.tierNext ?? r.next).price. How it works: step
  3 + an auction bullet. Checked Nov 8 2026: Wembanyama won at $150 for 1 season in 2028 -> Parma's summer 2029 re-sign
  $150; loganzarvell's Upcoming FAs list him at his $30 tier.
  TRADE TREES (tab=tradetree; owner, Nov 2 2026; logic `assets/tradetree.js`, no DOM; renderTradeTree in app.js, .tt-* in
  styles.css). Owner's answers: a tree starts from a TRADE (both sides), goes ALL THE WAY down (levels 0-1 open, deeper
  folded <details>; nodes on the way to ?p= stay open), each node = locked points + how it ended, Test features ONLY (no
  links from Trade Court / Rivalry until it graduates; the 2K Transactions card has a "Trade tree" link, with back/backl).
  tradeTree(DATA, fo, tx, rosters): a branch stays with ONE team: what it got -> when it traded that away, what it got
  back there hangs under it -> ... Side total = every locked point that team got from the whole tree (who won over
  time); node "Branch" = itself + below. Player node = his Front Office stint from that trade (frontOffice stints now
  also export src / tx / ts / pick / endSrc / endTx / value / weeks / active, + pickUse); exits: traded (endTx), dropped,
  commish, held (checked against LIVE Sleeper rosters: "Gone from the roster today" if moved since the nightly), left. A
  re-add with no drop in between = the same stay (Ron Holland 2024: the commissioner add after the DUPLICATE pick).
  Pick node: its next trade away from that team (earliest later trade with that key + from), else drafted (pickUse,
  incl. the 2023 STARTUP: case 001 traded startup picks before the Dec 12 2023 draft) -> the drafted player's draft
  stint, else unused (still held). Draft ts = Sleeper start_time, slow drafts run days: a pick traded after it
  (2026 started Sep 7, case 072 Sep 10) shows "changed hands during it", dates clamped. Several assets leaving in the
  SAME later trade share its return: listed under the first (tree order), others say "the return is listed under X"
  (expanded map by tx|owner, so every trade expands once = no loops); a player back on a team he left earlier on the
  same branch gets "Back again". Page: finder card (accent-insensitive search over everyone ever in a trade or a pick
  that became him -> his trades; every case by season) + tree card (score per side, leader, per-side tree; Trade Court
  case links carry ret/retl = floating back button; "its own tree" re-roots). Params ?case= | ?tx=, ?p=, ?season=,
  ?back/backl. Tested Nov 2 2026 on league.json: all 78 trades (25 ms, max 68 nodes, depth 8, no unknown/missing
  leaves); case 063 (Jokic) by hand: Avdija 7 st / 291, Sarr 3 / 128, Morant 0, Jokic 10 / 536 for simeon, jimmycooks2's
  2026 2nd jimmy -> simeon -> bigtrey -> BenDover (case 066) -> Garland 111 -> case 076 return; 3-team 523 / 746 / 1282;
  loop: Morant back to bigtrey in case 007's tree; 320 / 402 / 1440 no overflow.
  LOCK REPORT CARD (tab=lockcard; owner, Nov 2 2026; logic `assets/lockcard.js`, no DOM; renderLockCard in app.js, .lc-*
  in styles.css). Owner's answers: grade PER LOCK DECISION; baseline = never lock (his last LINEUP game counts); show the
  hindsight ceiling (best lineup game); NO Assistant Coach comparison yet (past mornings' projections aren't saved; could
  come from coach-log.json later); 2026-27 ONLY (first season with lgs.json lineup records + Dev Dashboard picks; older
  seasons' matchup feed is broken). Data: DATA.playerWeeks (t 'R', finished weeks), locks.js weekBoxes per week (league
  scoring_settings from Sleeper, All-Star rows skipped, cached per visit in LC_BOX), data/lgs.json (bench dates removed
  from his lineup games; v 1 without 'k' = started, used for ties), Dev Dashboard picks (loadLawSrc / lawFor), data/
  official-weeks.json answers' games (fallback when Sleeper corrected a box score after the solve: LaVine 45 -> 44,
  Isaiah Stewart 26 -> 24 in week 1). judgeStart() per starter-week: counted game = pick (lock date / last lineup game /
  zero), else the lineup game whose FP = locked points (tie: one he started, else the later one; src 'tie'), else the
  solver's date; kind lock (later lineup games came after it) / ride (2+ lineup games, the last counted; a pick on his
  last game says "Locked his last game") / single / zero (benched before his last game: baseline = his last game played)
  / none / unknown (listed on the page, "pick them on the Dev Dashboard"). delta = locked points - last lineup game;
  left = best lineup game - locked. managerCards(): locks (paid / early / even), avg per lock, net vs last game (locks +
  zeros), left early, saved, rides left (best - counted on rides), Hindsight % = sum(counted - worst) / sum(best - worst)
  over 2+ game weeks, lock days Mon..Sun, best / worst lock. GRADE ON A CURVE (added after seeing the data: locks are made
  on big games, so every manager gained +7.5 to +19.5 per lock in weeks 1-2 and all graded A+ on a fixed scale): vsAvg =
  avg per lock - league average per lock in the same view (season or week); GRADE_STEPS A+ +6 ... B within 1 ... F below
  -11; MIN_LOCKS 3 (fewer = INC, ranked last); constants at the top of lockcard.js, owner may tune. Page: header (rules,
  Season / Week N chips ?week=), grades board (rank, grade, team, per lock + vs avg, stats line; tap = ?m=owner), League
  highlights (best / worst lock, favorite lock day), manager drill-down (default COMMISH: grade, per lock, net, rides left,
  best / worst lock, lock-timing bars, "locks game X of Y" average, decisions by week: locks, zeros, rides, one-game weeks
  folded; game chips = counted navy, best game gold outline, bench struck; player name = 2K card with back = this page).
  Checked Nov 2 2026 (weeks 1-2): 144 starts = 72 locks, 69 rides, 3 single, 0 zero, 0 unknown; sources 112 points match,
  27 picks, 3 ties, 2 solver; every lock delta recomputed from raw box scores; league avg +13.3 per lock (season); Parma
  B (+13.3, 10 locks), simeoncampbell7 A+ (+19.5, 4 locks), BenDoverPlz123 C (+7.5); layouts 320 / 402 / desktop, no
  overflow; 2K link + back pill work. CAVEAT: week 1 had no bench records (the watcher started Oct 29), so every week-1
  game counts as a lineup game.
  DEPTH CHART (tab=depth; owner, Oct 29 2026; renderDepth / dcAuto / dcChart in app.js, .dc-* in styles.css). Owner's
  answers: BOTH views with a switch (?view=fantasy|nba, gm-dc-view), a dropdown per view (?team= fantasy team, default
  COMMISH; ?nba= NBA team, gm-dc-nba, default ATL); rows show FP/G + min, NBA GS/GP (only when nba-starts is full),
  LOCKED POINTS this season (owner, Oct 29 2026; lockedTotals over DATA.playerWeeks = finished weeks: "Locked 39 · 1
  st" for any team; on a fantasy chart, if he also scored for another team, "Locked {this team} · {all} all teams",
  or "(other teams)"; grey "Locked 0" = none; checked: all 43 Parma rows = league.json after week 1),
  LGS (this team's on a fantasy chart, any team on an NBA chart; "—" until data/lgs.json exists), dynasty score +
  tierTag, injury pill + ESPN estimate; name = link to the 2K card (with ?back=/backl=Depth Chart: the card shows
  "← Back to Depth Chart", same scroll spot via sessionStorage dc-scroll). Columns PG / SG / SF / PF / C (Sleeper's main
  `position` is always one of these). FANTASY: "Auto-generate best depth chart" button = dcAuto by role: Sleeper
  starters, healthy bench by FP/G, no games yet (by dynasty), IR / Out (injBad), taxi last; an EMPTY column borrows
  the best non-taxi player whose fantasy_positions include it from a column with 2+ players (gold "from PF" tag).
  Owner's own order: drag (dragSort with new opts { vertical, fixed: '.dc-end' }: before/after by height, page
  scrolls near the screen edge, "Drop here" spots so an empty column takes drops; phones press and hold 0.35 s) or
  the ⋮ menu (Up / Down / Move to PG..C, positions he can play outlined). Saved per team gm-dc-chart-{owner} = { at,
  cols } via gmSave ('gm-dc-' in SYNCED); players who joined since go to the bottom of their auto column with a green
  "New" tag, gone players drop out; the button (confirm when a custom order exists) clears it back to automatic.
  "Can also play X" line under each column. HIDE TAXI (owner, Oct 29 2026): checkbox next to the button, fantasy view
  only (gm-dc-hidetaxi, synced): taxi rows aren't drawn, ranks/counts cover the rest; any change made while hidden
  puts each hidden taxi player back right after the player who was above him (domCols + DC.cols), so nothing is lost;
  ⋮ "Move to" lands a non-taxi player above that column's taxi group. AT A GLANCE (owner, Oct 29 2026: "positions down
  the y axis, players across the x axis"): glance() in renderDepth draws a table at the top of the chart card (both
  views; chart.lines = the shown order per position, so it follows drags, ⋮ moves and Hide taxi): rows PG..C (sticky
  navy labels), columns 1st, 2nd, ... ; chip .dc-chip = "D. Murray" + FP/G + "L {locked points}" + injury line; gold =
  1st, taxi muted, Out/IR red; tap = scroll to that player's row in that column + gold flash (.flash). The table
  scrolls sideways inside .dc-glance-wrap (page never does); checked 320 / 402 / 1440. DESIGNATIONS (owner, Oct 29
  2026; fantasy view only): DESIG = Starting 9 (blue, max DESIG_MAX 9: its button is disabled at 9/9), Rotation (yellow),
  Stream (green), Development (purple) (owner moved Stream ABOVE Development Nov 2 2026, everywhere: groups, buttons,
  coach key + bench), Hold (orange .dg-hold, owner added Oct 29 2026; placed before IR so
  IR stays last), IR (red, owner added) in that order (desktop from 1400px: 2 rows of 3 groups); per team gm-dc-desig-{owner} =
  { at, d: { pid: key }, order: { key: [pid] } } (gmSave, synced via 'gm-dc-'); set in a player's ⋮ menu (chart rows
  and the list below; tap the current one again = clear; setDesig). Tints (.dg-* classes set --dg-bg / --dg-c) on chart
  rows (+ a label chip .dc-dg by the name) and at-a-glance chips. "Designations" card (#dc-desig, drawDesig) UNDER
  everything: one group per designation (.dc-dgroup, phones stacked in DESIG order, 5 columns from 1400px with the
  compact row layout), each in its own saved order (players not ordered yet follow in chart order); its own dragSort
  (same() = same group, so drags never leave a group) saves only order[key] and never touches the chart; "Not
  designated" fold (DC.undes keeps it open) with ⋮ on each. Tested Oct 29 2026: 9 starters + 10th refused, groups,
  tints 16 rows + 16 chips, group drag + cross-group drag refused, chart order + saved chart unchanged, survives a
  reload; 320 / 402 / 1440. ROSTER LIMIT (owner, Oct 29 2026): ROSTER_LIMIT 23 (= Sleeper's 9 starting spots + 14
  bench; Sleeper also has 5 IR + 15 taxi slots outside it); limitLine() at the top of the fantasy chart card counts
  starters + bench + IR (owner chose to COUNT IR: they come back onto the roster), taxi not counted: "28 / 23 · 5 over
  the limit" (red .dc-limit.over), "At the limit", or "N spots open" (green), with the starters / bench / IR / taxi
  split. Checked Oct 29 2026: all 8 teams = Sleeper non-taxi counts (28, 27, 26, 22, 23, 25, 26, 25). CUT TAG + CUT
  LIST (owner, Oct 29 2026): a red "✂ Cut" tag ON TOP of any designation tint, toggled by the "✂ Cut" button in every
  ⋮ menu (desigBtns; toggleCut); stored as gm-dc-desig-{owner}.cut = [pid] in Cut List order (setDesig keeps it via
  ...D). Shown as .dc-cut chips by names (chart rows, designation rows) and a red outline + ✂ on at-a-glance chips.
  "✂ Cut List" card (#dc-cut, drawCut, under Designations): rows tinted by designation + its label, own dragSort (saves
  D.cut only; never touches the chart or groups), one-tap sorts lowest first by FP/G / Dynasty / Locked (CUT_SORTS,
  rewrites the order). Roster limit box adds "After your Cut List (N, M on taxi): X / 23 · still K over" (taxi cuts
  don't count). drow(p, i, k, g): k = tint, g = list ('cut' / designation / ''), menus keyed "g:pid" (DC.dmenu).
  LOCKED WEEKS (owner, Oct 29 2026): every locked-points number on the Depth Chart is followed by the weeks locked
  in parentheses ("Locked 39 (1)", "Locked 40 (2) · 76.5 (3) all teams", glance "L 39 (1)", designation / Cut List
  rows); no locked points = unchanged ("Locked 0"). Checked: every Parma row = playerWeeks count.
  AUTOMATIC DESIGNATIONS (owner, Oct 30 2026; autoDesigs in app.js): IR = in a Sleeper IR spot; Starting 9 = best
  healthy lineup (not IR / taxi / injBad) for DC_SLOTS PG SG G SF PF F C UTIL UTIL by FP/G (gm.js bestFit + fits,
  +0.001 so a no-games player can still fill a slot); the rest by league rank in FP/G (fpgRanks in breakdown.js:
  players with >= FPG_MIN_SHARE 40% of the most games played, ties share; 382 ranked Oct 30): Rotation = rank <=
  DESIG_ROT 125, Development = age <= DESIG_YOUNG 25 outside it, Hold = older and rank >= DESIG_HOLD 150 or unranked,
  Stream = the rest (owner's rules; "fringe young" read as young + outside the top 125). Used UNTIL THE OWNER CHANGES
  ONE (owner's choice): rawDesig = saved, desig() swaps in AUTO_D unless dcCustom(saved) (custom flag; older saves
  with any d count); the first change saves the whole set + custom: true. "Auto-generate best depth chart" now resets
  BOTH the chart order and the designations (custom: false, order cleared, Cut List kept) and re-renders; the auto
  chart's first band = the Starting 9 (dcAuto starts set) instead of Sleeper's current starters. Checked Oct 30 2026:
  all 8 teams get 9 starters; Parma's 43 players all match the rules; Starting 9 = top 9 healthy by FP/G.
  CUSTOM CATEGORIES + CURRENT / HEALTHY (owner, Nov 9 2026: "it'll eventually be used by every manager for their own
  needs"). (1) CATEGORIES PER LOGIN: gm-dc-cats = { at, cats: [{ id, name, short, color }] } (gmSave, synced via 'gm-dc-'
  = per Google account; nobody's choice reaches another manager); DESIG_DEFAULT (the old six) = what everyone sees first.
  dcCats() validates (max DESIG_LIMIT 8; Starting 9 always first, name "Starting 9" / short "S9" fixed, color free; IR
  always present: DESIG_FIXED start + ir can't be deleted because the Current chart needs IR). color = index into
  DC_COLORS (12) = .dgc-0..11 in styles.css (--dg-bg / --dg-c; .dg marks a tinted element; replaced the old fixed
  .dg-start... classes, so dark mode converts every choice). dcCatOf / dgClass helpers; a saved designation whose
  category was deleted counts as none; autoDesigs only assigns categories that still exist. "Customize categories"
  fold at the top of the Designations card (catEditor: name 20 chars + short 4 (edge strip), 12 color dots, ↑↓, Delete,
  + Add category (disabled at 8), Reset to the standard set; DC.catsOpen keeps it open; saveCats clears DESIG_CACHE).
  Assistant Coach strips, key line and bench order use the same list (dgCats in renderCoach). (2) TWO CHARTS on the
  fantasy view (.dc-modes switch, ?chart=current|healthy, last pick gm-dc-mode): CURRENT = gm-dc-chart-{owner} +
  gm-dc-desig-{owner} (unchanged keys; teamDesigs / the coach read it); HEALTHY = gm-dc-hchart-{owner} + gm-dc-hdesig-
  {owner}, same tools (order, designations, Cut List, auto button = resets that chart only), autoDesigs / dcAuto with {
  healthy: true } = no IR / injury bands, injured players can be in the auto Starting 9. (3) CURRENT IR RULE: dcAuto band
  5 = Sleeper IR at the very bottom (below taxi); fantasyChart also moves IR players to the end of each column, and the
  saved order is rewritten once per visit; a custom designation set runs dcIrSync(D, irPids, onTeam): IR-spot players ->
  'ir' (remembered in D.autoIr), an autoIr player off IR -> uncategorized (left where he is in the order); teamDesigs
  applies the same rule read-only from live rosters (reserve). Automatic sets just follow autoDesigs. (4) Every Current
  row shows "Healthy: PG2 · Rotation" (.dc-hl, healthySpot from the Healthy chart's saved order / auto). Tested Nov 9 2026
  (live data, preview): IR players to the bottom (Haliburton, Banchero, Nurkic), a custom set (Haliburton rot -> IR,
  Booker auto-IR off IR -> uncategorized, Murray kept), add / rename "Trade Bait" + short TB, recolor Starting 9, delete
  Hold (players uncategorized), limit 8, coach strip "TB" + key, Healthy move saved only to gm-dc-hchart (Current saves
  unchanged), Current rows "Healthy: PG1"; 320 / 402 + dark mode, no console errors. DESCRIPTIONS (owner, Nov 9 2026):
  each category has desc (DESIG_DESC_MAX 120; owner's defaults in DESIG_DEFAULT: Starting 9 "Players you lean on week in
  and week out", Rotation "...get starts when your starters aren't playing", Stream "...spot starts, not expecting much",
  Development "Rostering these players for their upside", Hold "...aren't playing well enough to be traded or started,
  could be dropped", IR "These players are injured, syncs automatically with Sleeper"); shown italic under each
  Designations group head (.dc-ddesc), edited in Customize categories (data-cat-desc input; Starting 9's is fixed like
  its name); saves without desc get the default by id. MyGM is commish-only today; per-login
  keys mean other managers' settings stay theirs once they get access.
  LINEUP TAGS (owner, Nov 9 2026; he first asked for G / F / UTIL / UTIL COLUMNS, then the same day: "remove the F, G, UTIL,
  UTIL from positions ... the #1 in each position gets the starting X tag ... eligible players (designated as starting 9
  ... but isn't #1) you can select G or UTIL"): the fantasy chart keeps PG / SG / SF / PF / C. dcAuto fits the Starting 9 to
  Sleeper's 9 lineup slots (DC_LINEUP, bestFit on FP/G): a PG..C slot player leads that column, G / F / UTIL ones sit under
  their main position and come back as auto.flex. dcLineupTags(cols, starts, byId, picks, autoFlex) -> tops (Starting 9
  player first in a column = that position) + flex (other Starting 9 players: G = PG/SG, F = SF/PF, UTIL = anyone; limits
  DC_FLEX 1 G, 1 F, 2 UTIL; invalid picks just don't show). Picks per team + chart: gm-dc-flex-{owner} / gm-dc-hflex-{owner}
  = { at, f: { pid: slot } } (synced via 'gm-dc-'); no save = auto.flex; "Auto-generate" clears it. UI: navy/gold .dc-slot
  tag by the name (chart rows + Designations / Cut List rows; slotTag reads DC.tags, set in fantasyChart after the IR move);
  "Lineup slot" G / F / UTIL buttons (.dc-flexset / .dc-flexbtn, flexBtns + setFlex, data-flex) in the ⋮ menu of Starting 9
  players who aren't #1 (can't-play or full = disabled with a reason; tap the picked one again = clear). ASSISTANT COACH:
  teamSlotTops(owner, d) = the same tags from that team's Current chart + flex picks (cached 5 min, keyed on chart / flex
  save times + starters); renderCoach slotC(side, pid) puts .dc-slot.mb-stag after the name inside .mb-name b, both teams
  (.mb-slot is the board's middle slot column, not this). Checked Nov 9 2026: Parma auto = PG LeBron, SG Booker, SF Porter
  Jr., PF Markkanen, C Sengun + Murray UTIL, Dosunmu G, Anunoby UTIL, Adebayo F; G one at a time, F disabled for guards, no
  buttons for a #1; coach shows the same 8-9 tags per side; 402 px no overflow.
  HIDE TAXI FIX (owner bug report, Nov 9 2026, "hide taxi doesn't work on Healthy"): the checkbox only hid chart rows and the
  "Not designated" fold; taxi players still filled the Designations groups (13 in Development) on both charts. Now txHidden()
  in renderDepth also hides them in every Designations group (count = shown players) and the Cut List; drags there save with
  keepHidden(keys, full, hidden) (module helper), which puts hidden taxi players back after the player above them.
  [REMOVED the same day, see ONE CHART] "HEALTHY" RENAMED "SEASON" + PULL (owner, Nov 9 2026): the second chart is labeled Season everywhere (switch, titles, help,
  "Season: PG2" reminder on Current rows); ?chart=season (old ?chart=healthy and a saved gm-dc-mode "healthy" still open it);
  storage keys unchanged (gm-dc-hchart- / -hdesig- / -hflex-), code still says healthy. Current has a "Pull healthy order from
  Season" button (.dc-pull): Current order = the Season chart's columns (seasonCols, built with the "Season: PG2" reminder)
  with IR / injBad / ESPN out-for-season players moved after the healthy ones in each column, so the next player moves up
  (Season PG1 Haliburton on IR -> Murray PG1); confirm when a custom Current order exists; designations, Cut List and lineup
  slot picks untouched. Checked: Parma Haliburton / Banchero / Nurkic skipped.
  ONE CHART (owner, Nov 9 2026: "Revert back to 1 Depth chart"): the Current / Season (Healthy) split, its switch (.dc-modes),
  the "Season: PG2" reminder (.dc-hl) and the Pull button are GONE; everything above about TWO CHARTS / Healthy / Season is
  history. renderDepth has const healthy = false (autoDesigs / dcAuto keep their healthy option, unused); keys gm-dc-chart-,
  gm-dc-desig-, gm-dc-flex- {owner}; ?chart= is ignored; old gm-dc-h* / gm-dc-mode saves are just left unused. The chart
  keeps the Current rules (Sleeper IR -> IR + bottom of the column, IR sync for custom sets) and is the one the Assistant Coach
  reads. Custom categories, descriptions, lineup tags (PG..C + G / F / UTIL picks) and the Hide taxi fix stay.
  FINICKY BUTTONS + POSITION RULE (owner, Nov 9 2026: "the choice G/F/UTIL buttons, they were finiky on the live site ...
  not able to add a PG only into the C depth chart spot"): (1) dragSort got opts.ignore (a selector of controls inside an
  item that never start a drag); the chart, Designations and Cut List pass DC_CTRL (.dc-move, .dc-flexset, .dc-dgset,
  .dc-menu, button, input): a slow phone tap (> 0.35 s) or a mouse wiggle on a button used to start a drag and swallow the
  tap. (2) A full slot is no longer a disabled button: tapping it takes the slot from the holder (UTIL: the one picked
  first); the button says "G (from Dosunmu)"; only a slot he can't play is disabled. setFlex saves exactly the shown valid
  picks (DC.tags.flex), so stale picks never block a slot. (3) dcCan(p, pos) = his Sleeper fantasy positions or his home
  column: ⋮ Move to lists only those ("Only plays C" when none), the mv handler refuses others, the chart drag's same()
  refuses a drop in any other column, and dcChart drops a saved spot he can't play (auto puts him home). Checked: 0.7 s
  touch tap on G works, G Dosunmu -> Murray in one tap, UTIL takeover, PG/SG Murray: Move to = SG only, drag onto C refused,
  drag onto SG works, an old save with him at C shows him at PG.
  "NEW" TAGS ON STARTERS (owner, Nov 9 2026): a save made while the G / F / UTIL columns were live kept the flex starters
  under G, F, U1, U2; with those columns gone they were placed by auto = bottom of the column + "New". dcChart now puts players
  from unknown saved keys into their home column right under its #1, and "New" (fresh) = a player not anywhere in the save.
  STARTER TAGS, FINAL (owner, Nov 9 2026: "just put PG1 or PG2 or POSX for all starters, take the picking out of it
  completely, show that tag on assistant coach"): REPLACES the LINEUP TAGS G / F / UTIL picks above (flexBtns, setFlex,
  DC_FLEX, dcLineupTags, .dc-flex* and gm-dc-flex- saves are gone; old saves ignored). dcStarterTags(cols, starts) = every
  Starting 9 player's spot in his column (PG1, PG2, C1 ...; IR at the bottom first); shown as the .dc-slot tag on chart rows
  + Designations / Cut List rows (DC.tags, set in fantasyChart) and on the Assistant Coach for both teams (teamSlotTops, cached
  on chart save time + starters). dcAuto still fits the Starting 9 to the 9 Sleeper slots so slot players lead their column.
  Checked: Parma PG1 LeBron, PG2 Murray, SG1 Booker, SG2 Dosunmu, SF1 Porter Jr., PF1 Markkanen, PF2 Anunoby, C1 Sengun, C2
  Adebayo; opponent PG3 Peterson etc. on the coach.
  ALL PLAYERS TAGGED (owner, Nov 9 2026: "In an inverse color of yellow and blue, include the tag on all other players"):
  dcStarterTags now tags EVERY player with his spot; Starting 9 = navy + gold .dc-slot, everyone else .dc-slot.alt (gold +
  navy); same on the Assistant Coach (slotC checks dgMe / dgOpp for start), bench + IR + taxi too. Checked: Parma 39 / 39
  tagged, tag = the row number everywhere, 9 navy; coach week 4: Harden PG3 / Fox PG4 (in Sleeper's lineup, not Starting 9)
  gold, Booker SG1 navy.
  ASSISTANT COACH EDGE STRIPS (owner, Oct 30 2026; first an outline, then the owner asked for "a thick colored area"
  on the outside): every player on the Lock-in coach board (starters, bench, IR; both sides) gets a strip on his OUTER
  edge (left for you, right for the opponent: dgBar() is the first child and .mb-r is row-reverse) in HIS team's
  designation color with the short label stacked letter by letter (DESIG_SHORT S9 / ROT / DEV / STR / HOLD / IR;
  .mb-dgbar writing-mode vertical-rl + text-orientation upright, 17px wide, 13px at <= 360px; .mb-p.mb-dg drops the
  outer padding so it sits flush). teamDesigs(owner) = saved custom set or autoDesigs from loadBreakdown + fpgRanks,
  cached 5 min in DESIG_CACHE; key line .mb-dgkey ("Edge strip = Depth Chart designation", S9 Starting 9 ...).
  Checked 320 / 402. The key line .mb-dgkey under the board was REMOVED (owner, Nov 9 2026). BENCH ORDER (owner, Nov 2 2026): the board's Bench section (both sides) is sorted by designation
  (DESIG order S9, ROT, STR, DEV, HOLD, IR, none last), then the player's place in that group's Designations-card drag order (gm-dc-desig-{owner}
  .order), then league FP/G rank (fpgRanks; unranked last) = benchSort() in renderCoach. IR section unchanged. Checked
  Nov 2 2026: Parma S9 Murray / Booker / Adebayo / VanVleet, ROT, DEV, STR, HOLD; a saved Rotation order (Pritchard
  before Risacher) wins over rank. TODAY CHIP FIX (owner, Oct 30 2026): at <= 430 px the green "Today vs X · time" chip (.mb-today)
  flows like text (inline-block, wraps between words, dot inline) and .mb-tags/.mb-today cap at the name column's
  width, so it no longer runs under the score box (was ~8 rows at 320 px, before the strips too). Checked 0 overlaps
  at 320 / 375 / 402 / 430 / 1440, both sides. NBA: ESPN's OFFICIAL depth chart, live, read-only: espnDepthChart(code,
  all) in breakdown.js = ESPN team roster site.api.espn.com/.../nba/teams/{ESPN_TEAM_ID}/roster (names, ids, season
  year; CORS open) + core API sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/{year}/teams/{id}/
  depthcharts (ranks by ESPN id; CORS open; site.api's own /depthcharts has names but NO CORS); ids missing from the
  roster feed (two-way) get their name from the core athlete page; matched by normName on that team, then the one
  player Sleeper lists on that team with the same last name (ESPN "RJ Nembhard Jr." = Sleeper "Ryan Nembhard"), then
  a unique name anywhere; cached 15 min. A player can sit in several columns (as ESPN lists him); "On the roster,
  not on ESPN's chart" = Sleeper players on that team ESPN doesn't list. Tested Oct 29 2026: all 30 teams, 997 chart
  spots, every one named + matched (2 = Sleeper players with no team: Lovering, Wesley); ORL = ESPN's order exactly;
  Parma auto chart (Haliburton Out ~2 wks -> PG7), ⋮ moves, mouse drag PG -> C, save + auto reset; layouts 320 / 402
  / 1440 (5 columns from 1400px with rank over photo, auto-fill 260px columns below, 1 column under 560px).
  REPORTS (tab=reports; owner, Oct 28 2026: "all reports show the title with the option to see the report as a
  dropdown"): REPORTS = [{ id, title, sub, run }] in app.js; renderReports draws one betaCard with a <details
  class="rp-item"> per report (closed); opening one calls run() FRESH each time (live Sleeper, so it's always up to
  date after any transaction, nothing saved). .rp-* in styles.css. TO ADD A REPORT: a REPORTS entry with
  added: 'YYYY-MM-DD' whose run() returns HTML. Grouped by the month of `added` (owner, Oct 28 2026; .rp-month
  "October 2026" + count, newest month and report first). PDF EXPORT (owner, Oct 28 2026, every report): "Save as
  PDF" button (.rp-pdf, enabled once the report loaded) -> printReport(): a print-only copy #rp-print (logo
  header, title, sub, "Read from Sleeper {time} CT", the report body) + html.rp-printing; @media print in
  styles.css shows only that copy; document.title = title + date (= the PDF file name); afterprint cleans up.
  Uses the browser's print screen (Save as PDF; iPhone: Print -> Share -> Save to Files), no library. Report 1: bigtrey5456's 2024 championship roster (reportFinalRoster(owner, season)): his roster in
  the season's final = that season's Sleeper league rosters (closed after the final; taxi listed) vs today's
  rosters (cache-busted); starters + locked points of the final week from DATA.playerWeeks; gone players show the
  current holder (or free agent) + how he left (last DATA.transactions drop by that owner after the final). Oct 28
  2026: 5 of 29 still there (Mobley, Gobert, Hart, Powell, Shannon), 3 of 9 final starters, 4 of 28 without taxi.
  Report 2 (same function, owner COMMISH): bigdaddyburk's 2024 title team, Oct 28 2026: 14 of 37, 7 of 9 final
  starters (Trae Young + Draymond Green gone), 12 of 28 without taxi.
  Report 3 reportCompareRuns(owner, seasonA, seasonB): one manager's PLAYOFF rosters side by side; roster =
  Sleeper matchup `players` of his last bracket (P) game that season (taxi incl.; taxi flag = that season's closed
  league roster), playoff locked points over his P games (playerWeeks), run summary (each game, players, starters,
  points), On both / A only (how he left) / B only (how he came: trade, waiver, FA, rookie draft pick between the
  two). bigtrey5456 2024 vs 2025 (Oct 28 2026): 5 of 29 carried over (Hart, Gobert, Powell, Oubre, Shannon), 2 of 13
  2025 playoff starters, holdovers 24% of his 2025 playoff points; 771 / 689 = the game scores. SIDE BY SIDE (owner,
  Oct 28 2026): .rp-vs 2-column grid (left = season A .rp-l, right = B .rp-r, navy divider): run headers, navy
  section bars (.rp-sec) "Carried over" (same player both sides) and "Playoff starters: gone vs new" (A-only and
  B-only starters paired by rank of playoff points, how he left / came under each), bench + taxi in a fold
  (.rp-more; printReport opens every <details> so PDFs include it). Run headers show the SEED (owner, Oct 28 2026;
  gold .rp-seed "No. 2 seed · first-round bye") + regular-season record: seed = table order by win %, then PF (same
  rule as the Awards banner; bigtrey 2024 No. 2 (bye, tied 14-7 with TRT3 on record), 2025 No. 5 (QF vs No. 4
  TRT3), matching the real brackets). Every traded-away player in Reports (reports 1 and 3) shows "Got back: ..."
  (owner, Oct 28 2026; tradeReturn(t, owner, pname): players added to him + picks sent to him, "2027 1st
  (simeoncampbell7's)" / "(his own)" from the pick's orig roster id; .rp-got small navy line). Players who ARRIVED
  by trade (report 3 right side) show "Gave up: ..." (tradeReturn(..., gave = true): his drops + picks he sent).
  Report 4 (owner, Nov 7 2026) "Real NBA contracts by team + what a salary cap would look like": `assets/report-contracts.js`
  reportContracts(h) (h = { DATA, esc, get, name, teamName, loadContracts }; .rc-* at the end of styles.css): data/
  contracts.json + live rosters + this season's playerWeeks. Per team: total / counted (active + IR, taxi out, no-deal
  players at NO_DEAL $1.3M) / active / IR / taxi bar with the cap line, top-3 share, expiring, next 2 seasons committed,
  first-NBA-deal count (readContract with nbaSeasons = min(3, Sleeper years_exp)), no-deal count, $ per locked point,
  "to get under" + 3 biggest deals (>= $10M, not taxi) with the fewest locked points, full player table (fold). Cap
  section: League average / avg + 10% (RECOMMENDED, TOLERANCE) / avg + 20%, rounded up to CAP_STEP $25M, + next season's
  commitments; floor = FLOOR_SHARE 70% of the cap; recommendations (league-scale cap, floor, taxi out / IR in, start next
  season, soft cap with FAAB / draft penalty first, fixed check dates, rulebook edge cases) + concerns (salary vs value /
  rookie deals, re-signings / extensions / NBA trades, IR salary, data gaps, Sleeper can't enforce, character / vote).
  Nov 7 2026: $4.84B on rosters = 83% of all NBA salary, average counted $571.5M, recommended cap $650M, floor $450M;
  over: jimmycooks2 +$179.6M (IR $176.9M), bigdaddyburk +$55.8M; under the floor: simeoncampbell7, BenDoverPlz123.
  Report 5 (owner, Nov 7 2026) "Our own salary system: $, $$ and $$$ contracts with a cap": `assets/report-salary.js`
  reportSalary(h) (h adds dynasty: () => gmDynasty(new URLSearchParams())). A PROPOSAL in plain words, rules = constants
  at the top: price = MAX_PRICE $50 x (dynasty score / 100) ^ CURVE 1.6, min $1; tiers $ (1-7) / $$ (8-24) / $$$ (25+)
  (.rs-tier chips); cap = average payroll (active + IR, TAXI EXEMPT per the owner) + 10% rounded up to $10, floor 75%;
  contracts 1-MAX_YEARS 4 seasons, flat price, +10% per year past the first; rookie scale ROOKIE_SCALE (1.01 $8 ... 1.08
  $4, round 2 $3/$2, round 3 $1), 3 seasons, clock starts when called up from taxi; waiver / FA adds = rest-of-season deal
  at his price (FAAB unchanged, need cap room); cuts = 50% of this season's price as dead money, later years wiped, free for
  $1 / pickups / first-season rookies; free agency = contracts tick down -> re-sign window (10% home discount) -> blind bids
  (price + years, highest price wins, tie longer deal then worse finish, max $50) -> rookie draft; trades carry contracts,
  both under the cap. "Today" view: drafted in the last 3 rookie drafts + not on taxi = rookie scale, else market price.
  Nov 7 2026: cap $160, floor $120; over: TRT3 $183, jimmycooks2 $176, tzola13 $164; under the floor: bigtrey5456 $116,
  BenDoverPlz123 $60; biggest: Wembanyama $50, Doncic $45, Jokic $36, Giannis $30, SGA $25.
  Report 6 (owner, Nov 7 2026: "I don't love having contract values tied to dynasty score ... base off the real NBA
  contract with tiers (supermax highest, rookie lowest)") "Salary system v2: prices from real NBA contracts":
  `assets/report-salary-nba.js` reportSalaryNba(h) (h = DATA, esc, get, name, teamName, loadContracts). REVISED the same
  day (owner: "$50 being the max (= supermax) ... a more rounded number for salary cap, 370 is wonky ... contract length
  independent of their NBA contract"): NBA_TIERS on real salary (cutoffs in real dollars for 2026-27, raise them with the
  NBA cap each summer): Supermax $55M+ $50, Max $45M+ $40, Near max $35M+ $30 ($$$), Big starter $25M+ $20, Starter $15M+
  $15, Mid-level $8M+ $10 ($$), Role $4M+ $5, Bench $2.5M+ $3, Minimum $2 ($), ROOKIE_TIER $1 = first ROOKIE_SEASONS 4 NBA
  seasons (Sleeper years_exp < 4, any pick, even with a later extension signed: Wembanyama), no NBA deal $1; taxi exempt;
  cap = avg + 10% rounded to the nearest CAP_ROUND $50 (explained as "room for N supermax deals"; keep it fixed a few
  seasons), floor 75% rounded to $50, hard cap. LEAGUE CONTRACTS 1-MAX_YEARS 4 seasons chosen by the team, independent of
  the NBA deal; price = tier of his real salary for the first season of the league deal, LOCKED for the whole deal; our
  rookie picks = LEAGUE_ROOKIE_YEARS 3 seasons at $1 (clock from call-up). Year: contracts tick down -> NBA draft / FA (sets
  prices, raise cutoffs) -> re-sign window (new tier, any length) -> free agency = one Sleeper waiver / FAAB period, winner
  picks the length -> rookie draft -> season-start cap + floor check; in season adds = rest-of-season deal at today's tier;
  cuts = CUT_SHARE 50% of his price for EVERY season left (free: <= $3, pickups, first-season rookies); trades carry price +
  years. Section 6 "lock-in bargains" = players whose real contract already puts them in a pricier tier next season
  (nbaTier for season + 1, exp + 1). Nov 7 2026: avg $402 -> cap $450 (= 9 supermax deals), floor $350; over: jimmycooks2
  $633, bigdaddyburk $531; under the floor: loganzarvell, simeoncampbell7, BenDoverPlz123; jumps: Wembanyama / Holmgren /
  Brandon Miller / Amen Thompson $1 -> $30, SGA $30 -> $50.
  Report 8 (owner, Nov 7 2026) "Salary system v2: a years pool for contract lengths": `assets/report-yearspool.js`
  reportYearsPool(h) (h = DATA, esc, get, name, teamName, COMMISH). Plugs into v2 (prices / cap / dead money unchanged):
  POOL 50 contract-years out at once per team (active + IR, taxi exempt), any length 1-MAX_YEARS 4 that fits,
  FOUR_YEAR_PER_SUMMER 2 new 4-season deals a summer; pool refills as contracts tick down; rest-of-season adds use 1 year;
  a cut player's years stay used until next summer (plus v2 dead money); trades need pool room on the receiving side; our
  rookie picks use 3 years once called up. Table per team: under contract, rookie deals (years left), minimum years used
  (rookie years + 1 per other player), spare years; example plan for COMMISH; comparison of 6 methods (free choice,
  4-season cap only, years pool (recommended, .rc-rec row), tokens, length price premium, mirror NBA). Nov 7 2026: ~26
  players per team outside taxi, spare years 18 (tzola13) to 24 (Parma).
  Report 7 (owner, Nov 7 2026) "Token contracts: lengths only, no salaries": `assets/report-tokens.js` reportTokens(h)
  (h adds COMMISH + dynasty, dynasty ONLY for the example of who'd get the long deals). Rules = constants at the top:
  LAUNCH day one 2 x 4-yr, 3 x 3-yr, 5 x 2-yr, rest 1-yr; SUMMER tokens 1 x 4, 1 x 3, 2 x 2, 3 x 1 (7 signings, 14
  contract-years), use or lose, optionally tradeable; MAX_YEARS 4; taxi exempt; rookie picks free ROOKIE_YEARS 3 deal
  (clock from call-up); in-season adds = free rest-of-season deals; drops anytime, the token is just lost; trades carry
  contracts; no in-season extensions. Offseason: contracts tick down -> token day -> re-sign window (commish releases the
  rest on the deadline) -> free agency = one long Sleeper waiver / FAAB period (1-yr deal or attach a token) -> rookie
  draft -> leftover tokens vanish. Nov 7 2026: ~26 players per team outside taxi, 111 expiring after year one, 56+ to
  free agency (7 tokens each for re-signing).
  Report 9 (owner, Nov 9 2026) "What if we used Yahoo's standard scoring?": `assets/report-yahoo.js` reportYahoo(h) (h = DATA,
  esc, get, name, teamName). YAHOO = pts 1, reb 1.2, ast 1.5, stl 3, blk 3, to -1, no bonuses; ours = the live league
  scoring_settings (pts/reb/ast 1, stl/blk 2, to -1, dd 1, td 2, 40/50-pt, 15-ast, 20-reb bonuses 2, tech/flagrant -2).
  Every game of last season (weeks 1-26) + this season so far from /stats/nba/{s}/{w} (no All-Star rows, MIN_GAME 10+ min),
  scored both ways with breakdown.js fantasy(); weeks cached per visit (~4 s). Sections: scoring table; comparable scores =
  same percentile of games (20/30/40/50/60/70); team-week estimate (ratio of games scoring 25-55); positions (last season,
  top POOL 200 by our FP/G with MIN_GP 20+, Sleeper main position: FP/G both ways, avg rank move, top 50 / 100 counts);
  points mix by stat; biggest movers; our rosters' top-9 FP/G both ways; "if we switched" notes. Nov 9 2026: 25,360 games,
  avg 21.0 -> 24.7 (+17.6%); our 40 (top 8%) = Yahoo 46, 30 -> 35, 50 -> 57, 60 -> 67; PG +3.5 rank places, C / SG +0.7,
  PF -2.2, SF -3.6; climbers Draymond Green, Davion Mitchell, Suggs, Dyson Daniels; sliders Keldon Johnson, Hunter, LaVine,
  Norman Powell; team ranks only loganzarvell / tzola13 swap 4-5.
  ESPN ADDED (owner, Nov 9 2026, same report, title "What if we used Yahoo's or ESPN's standard scoring?"): ESPN = pts 1,
  3PM 1, FGM 2, FGA -1, FTM 1, FTA -1, reb 1, ast 2, stl 4, blk 4, to -2, no bonuses; every section shows ours / Yahoo / ESPN.
  RECORDS RE-SCORED: candidates = each season's best CAND_PLAYER 40 locked player games (DATA.playerWeeks) + CAND_TEAM 15 team
  scores (DATA.games R + P, both sides); their weeks' box scores loaded; each locked game matched to the box-score game whose
  score under THAT season's league scoring (each season's scoring_settings from Sleeper; 2023 = half a point per point) =
  his locked points (closest + * if Sleeper corrected it since); team = sum of its starters' re-scored games (* if the sum !=
  the official score). Top REC_N 10 lists per system in folds (ours open). Nov 9 2026: ours 40 = Yahoo 46 / ESPN 50; ESPN +21%
  avg; ESPN PG +4.9 / SG +4.6 / PF -6.5 rank places; player record ours Wembanyama 104 (Yahoo 112.8, ESPN 119), ESPN No. 1 =
  Doncic 2023-24 (65 ours at half points, 119 ESPN); team record ours 471 (8496, 2025-26 wk 4), ESPN No. 1 = 7792 466 -> 588.
  renderReports must stay async (renderCommish
  calls .catch() on every tab's result; a plain function crashed the office page).
  2K BREAKDOWN (tab=breakdown; owner's NBA 2K roster screenshot, Oct 25 2026; logic `assets/breakdown.js`, no
  DOM; renderBreakdown + BK state/BK_VIEWS in app.js, .bk-* in styles.css). Team picker (default COMMISH) +
  season chips (?season=, every league season; ?p=pid = picked player, kept with history.replaceState). Dark
  navy card like the 2K screen, GOLD where 2K uses lime: NBA team logo (ESPN CDN, teamLogo) + name, headshot
  (playerPhoto), ring = FP/G (the 2K "OVR" spot; fills toward that season's best NBA FP/G, players with a
  quarter of the most games), #number + positions (fantasy_positions), first/LAST name, HT / WT / AGE, shield
  badge = total FP, title = fantasy slot (Starter · X slot / Bench / Injured reserve / Taxi squad), college ·
  Nth NBA season (years_exp + 1) · birth date, per-game line, contractLine(), injury (status · body part
  (notes)). Below: View tabs Averages / Totals / Shooting (FGM-A, FG%, 3P, FT, eFG%, TS%), sortable columns
  (tap = sort, again = flip; gold column), tap a row = that player's card (phones scroll up to it). Cards under
  it: Season by season (per game, league seasons only) and Game log (10 newest + Show all; DNPs listed; best
  game). OWNER: basic NBA stats + fantasy points, plus (owner, Oct 25 2026) a DYNASTY SCORE badge: gold shield
  (.bk-dyn) before the Total FP shield + tierTag after the slot title; gmDynasty(params) = same scores and
  injury setting (gm-dyn-full) as the Dynasty tab, a failure just hides the badge; a player listed Out (outCut)
  also shows "Dynasty N at full health" (Banchero Oct 25: 32 discounted, 64 full). No grades / other models.
  LISTS (owner, Oct 25 2026): chips Team / Waiver wire / League above the card (?list=fa|league; team picker
  only on Team). Waiver wire = active players with an NBA team and a G/F/C position on no roster TODAY (~247);
  League = every rostered player (~280) + a "Fantasy team" column (BK_OWN, only: 'league') and the card names
  his team + manager. "Include waiver wire" checkbox on the League list (owner, Oct 26 2026; "Show" bar, gm-bk-lgfa
  via gmSave, synced): loadBreakdown { withFa } adds every Waiver wire player (same filter); ticking it rebuilds the
  page (search, sort, picked player kept); subtitle "N on a fantasy roster + M free agents" (Oct 26: 287 + 239). NBA TEAM list (owner, Oct 26 2026, "evaluate how teams are operating"; ?list=nba&nba=ORL,
  last pick saved in gm-bk-nba, default ATL): every active player Sleeper lists on that NBA team (G/F/C), rostered
  here or not; NBA team picker (.bk-nba, 30 teams A-Z by name, NBA_TEAM_CODES in breakdown.js) in place of the
  fantasy team picker; card title = team name, sub "N players on the roster (Sleeper) · M on fantasy rosters
  here"; Fantasy team column shows "Free agent" for unrostered (BK_OWN only: ['league', 'nba']); Career = every
  league season (like League); locked = any team. List buttons (.bk-lists) wrap at 320px. Lists after Team get a name search (accent-insensitive) and 50 rows at a time (Show 50 more). Every
  list: NBA team column + "Dyn" column (BK_DYN, dynasty score today, sortable, gold text). Team list only: a
  "Show" row Full team / Rostered (everyone but taxi: starters, bench, IR) / Taxi with counts (BK_GROUPS,
  BK.group, kept while switching teams; owner, Oct 25 2026). POSITION row (owner, Oct 25 2026), all 3 lists:
  All / Guards / Forwards / Centers with counts (#bk-posbar, posBar(); main group from Sleeper `position`
  = p.mainPos via the shared posGroups/POS_GROUP) + "Include secondary positions" checkbox (players whose
  fantasy_positions reach that group; marked "2nd" by the name, secMark). Saved with gmSave: gm-bk-pos
  ('all'|'G'|'F'|'C'), gm-bk-sec (default on); 'gm-bk-' is in SYNCED. Check: Centers on Parma 11 with, 10
  without (John Collins PF/C).
  LEAGUE GAMES STARTED (LGS; owner, Oct 28 2026, going forward only, no backfill): times a fantasy team had a player
  in one of the starting slots when his NBA game TIPPED (one per player per NBA game, any slot; a locked player stays
  in the lineup, so his later games that week count by the same rule). Sleeper keeps no lineup history and managers
  CAN move / sub players during their own games (owner corrected this), so scripts/lgs.mjs WATCHES: started by
  .github/workflows/lgs.yml (NEW file, the owner creates it on GitHub: Add file -> Create new file, name
  .github/workflows/lgs.yml, paste; crons 16:30 / 21:30 / 02:15 UTC + Run workflow button; concurrency group lgs,
  queued, never cancelled; job <= 355 min, script budget LGS_MINUTES 340). Each run: Sleeper state (regular season
  only), game day = Chicago date of now - 5 h, ESPN scoreboard for that day (tip times + state pre/in/post, ESPN codes
  mapped, non-NBA teams dropped), exits if the first tip is > 5.5 h away. Loop every 60 s: matchups/{week} snapshot
  for games tipping within 4 min (every minute until ESPN says live), the first tick a game is live, and every 10 min
  while live; per game per rostered player on its teams: pre (last pre-tip look), inn (first live look), owner, res
  (taxi / IR from ROSTERS: the matchups feed lacks taxi/reserve), late (no pre look and the run didn't see it go live
  within 3 min). Final (ESPN post): v = pre === inn ? inn : 'u'; no pre -> inn ('l' flag). NOTE: matchups
  players_points includes BENCH players, so it can't show a mid-game sub-in; the verdict relies on the pre/live looks.
  data/lgs.json { version 1, at, since, seasons: { s: { games: { 'YYYY-MM-DD|AWY@HOM': { d, w, tip, a, h } }, p: { pid:
  { key: [v, owner, flags 'l'/'r'] } }, open: { key: { pid: rec } } } } }; open games survive a hand-off to the next
  run. Saves = git commit of data/lgs.json + push with pull --rebase -X theirs retries, after each final game and every
  20 min (GITHUB_TOKEN pushes don't trigger update.yml, so the site isn't redeployed: breakdown.js loadLgs reads
  raw.githubusercontent.com first, then data/lgs.json). UI: lgsCounts(lgs, season|'career', owner|null) -> { n, seen
  (taxi/IR left out unless he started), u }; "LGS" column (BK_LGS, Averages after Locked, Totals after Starts) and card
  Season by season (owner, Oct 28 2026): "LGS" column after Starts (Averages + Totals, not Shooting) via lgsIn() in
  years(): NBA rows = his v === 1 games that season (any team), League rows = that owner's within the stretch's
  dates, Career = all; a season not in lgs.json (before 2026-27) shows "—".
  line "League Games Started 3 of 4 games (1 unsure)" (.bk-lgs; label spelled out, owner Oct 28 2026; Team list = that team's only, like Locked). Tested Oct 28 2026 in the
  browser with the script (node imports stubbed) on the live OKC@DAL + LAL@LAC games: 44 rostered players, 13
  starters, 9 bench, 22 taxi/IR; page with sample data. NOT run in Actions yet; first real night Oct 29 2026. TO
  CHECK after the first nights: lgs.yml runs + pushes, no 'u' flood, handoffs, the 2 AM update starts on time.
  GITHUB SCHEDULES RUN HOURS LATE (found Oct 28 2026: the "2 AM" update.yml cron started 6:00-8:40 AM CT every day
  for two weeks; a cron at 07:00 UTC started 12:00-13:40 UTC). FIX = the watcher CHAINS itself with workflow_dispatch
  (starts in ~1 minute; GITHUB_TOKEN can start workflow_dispatch runs, lgs.yml has actions: write): lgs.yml crons
  13/14/15/16 UTC (morning tries; extra ones queue and exit fast); the run watches the whole game day (sleeps 5 min
  between looks when nothing tips within 20 min), and at its LGS_MINUTES budget saves + dispatches lgs.yml (the
  replacement reads data/lgs.json, open games kept). After the last game it waits until 2:00 AM CT (twoAm(day):
  07:00 UTC daylight / 08:00 standard) and dispatches update.yml (ensureNightly: skipped if an update.yml run already
  started after that 2 AM, checked via the GitHub API), then writes data/nightly.json { day, at, sunday }. Every run
  first catches up the last due night (dueDay). Sunday game days also dispatch update.yml at 8 PM and 11 PM CT
  (sundaySnaps, db.sunday) for weekfix's snapshots. update.yml's gate now curls raw data/nightly.json and SKIPS a
  late 2 AM cron when day = Chicago(now - 12 h), and a late Sunday cron when sunday = Chicago(now - 6 h). Days with
  no games / out of season: the morning run only does the catch-up, so the update then runs when that run starts.
  The live update.yml on GitHub was still the pre-Oct-27 version on Oct 28 (no Sunday crons, v4 actions): the owner
  pastes the whole local file (done Oct 29: GitHub = local).
  FIRST NIGHT (Oct 29 2026, checked Oct 30): the 13:00 UTC morning cron started at 18:55 UTC (~6 h late); 3 games
  (CLE@ATL, SAC@NOP, MEM@POR), 57 player-games: 30 LGS, 6 bench, 20 taxi/IR, 1 'u' (Peyton Watson, moved at tip);
  budget handoff at 00:35 UTC = new run 2 s later; saves every 20 min; catch-up saw the Oct 28 update had run. The
  other morning tries show as "cancelled" in Actions (replaced while queued) = normal.
  WEEKEND OVERNIGHT HANDOFF (owner, Oct 30 2026; chose weekend-only over around-the-clock: GitHub's terms discourage
  Actions as an always-on server, and a 24/7 chain is ~14 idle hours a day): after starting the 2 AM update, a
  Friday- or Saturday-night watcher dispatches lgs.yml if the new day (ctDate(twoAm(day))) is Sat / Sun (isWeekend);
  a run starting between 2 and 5 AM CT whose night is done (nightly.json day >= gameDay) watches TODAY (the weekend
  day) and waits for its early tips, or exits on a weekday (so no idle runs). ~20 idle hours a week. Weekdays rely on
  the morning crons (6 h late still beats a 6 PM tip). Checked in the browser: Thu/Sun nights stop, Fri/Sat hand off,
  DST end Nov 1 (2 AM = 08:00 UTC) right.
  WEEK 1 FILL-IN (owner, Oct 31 2026): lgs.mjs fillIns() (FILL_INS [[2026, 1]], once: db.filled["2026-1"]) at the start
  of the next watcher run: lgsFromLocks() over data/official-weeks.json week 1 answers = each starter's locked game
  (the game whose fp = his locked points; a tie = the LATER game) ONLY (owner changed his mind Oct 31: no later games) -> [1, owner, 'b'],
  game keys/tips from the ESPN scoreboard per date, team from Sleeper box rows; earlier games get no record; never
  overwrites a watched game; since moves to 2026-10-20. Checked in the browser Oct 31 2026: all 72 starters matched,
  72 LGS (one per starter); ties Derik Queen 27 (Thu/Fri -> Fri), Austin Reaves 37 (Thu/Sun -> Sun).
  LGS RULE CHANGE (owner, Oct 31 2026): a locked player's games AFTER his lock that week are NOT LGS. lgs.mjs
  markAfterLock() (every run, idempotent) flags those records 'k' once official-weeks.json has the settled week (lock
  date = lockDates(): the game whose fp = locked points, tie = later); lgsCounts, lgsIn and lgsFinished skip 'k' (not a
  start, not a game seen). Live week: counted until it settles. Tested with a made-up week 2 (Harden: 10-31 flagged).
  WEEKS LOCKED + LOCK PER START (owner, Oct 31 2026): column BK_STARTS renamed "Wks Lk" (weeks his score counted) and
  shown left of LGS in Averages + Totals; BK_LKPCT "Lk%" right of LGS = weeks locked / LGS, both over FINISHED weeks of
  the seasons lgs.json covers (lkTracked + lgsFinished/doneWeek = max playerWeeks week), "—" until a finished week has
  LGS; bio line "League Games Started N of M · Locked K weeks · P% lock per start"; Season by season: Wks Lk + Lk%
  (lgsIn returns { n, d }). TAGS (same day): "In this view" (default) / "Show all" per group under the Tags row
  (gm-bk-tagscope { auto, mine }, synced via gm-bk-; view = tags someone in bk.players has); "Clear my tags from the N
  players in this view" (data-cleartags, confirm; a quiet underlined link in the fine print under the table, #bk-clear
  filled by drawTable; owner moved it there from the Tags row Oct 31 2026) removes custom tags from rowsNow() players
  only (list + filters), auto tags stay.
  NBA GAMES STARTED (GS; owner, Oct 28 2026; Sleeper's box rows have no gs): ESPN game summaries
  site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=ID (boxscore.players[].statistics[].athletes[]
  .starter; ~0.5 MB a game; scoreboard?dates= gives the day's event ids). updateNbaStarts() in breakdown.js, run by
  update.mjs (try/catch, budget 400 games a night) -> data/nba-starts.json { version, at, seasons: { s: { full,
  through, dates: [days read], starts: { pid: [YYYYMMDD] }, miss } } }: the season in progress first (every finished
  day < today), then past seasons newest first until complete (~10 nights for 2023-2025). A day is read only when all
  its NBA games are final (playoffs / All-Star skipped); ESPN names matched to Sleeper ids through Sleeper's own box
  rows that date + team (normName). Pages show a season's GS only when `full` (else "—", never partial): list column
  GS right after GP (BK_GS, Averages + Totals), totals via startDates() (Career = every season full), Team career +
  Season by season (both modes) + Career rows via gameLog g.gs (1/0; undefined = today's game, read tonight; null =
  season not collected) summed in totalOf (line.gs null if any game null), Game log "GS" column (✓, .bk-gs) after
  Opp, Compare "Games started" row. Tested Oct 28 2026: 2026 so far 8 days / 56 games / 560 starts, 0 unmatched; vs
  Basketball-Reference NBA_2027_per_game GS: 83 of 83 comparable players identical (teams playing that night skipped).
  USAGE RATE (owner, Oct 27 2026; Sleeper has none): computed = Basketball-Reference's formula 100 x (FGA + .44 FTA
  + TOV) x (team min / 5) / (min x (team FGA + .44 team FTA + team TOV)) over his games. The season tables now also
  store his TEAM's totals in the games he played (STAT_KEYS tm_fga / tm_fta / tm_to / tm_min, summed per game in
  addRows; STATS_VERSION 3 = nightly rebuild) -> line.usg in withPercents (lineFromTable / sumLines; game-log
  lines have no team totals = null, so Team career shows "—"). Checked 2024-25 vs BRef: SGA 35.0 / 34.8, Giannis
  35.3 / 35.2, Jokic 29.7 / 29.6, Banchero 34.0 / 33.6, Gobert 13.1 / 13.0, Brunson 29.7 / 29.5 (BRef also counts team
  turnovers and leaves out the Cup final). UI: "USG%" column (BK_USG, Averages after Min + Shooting after TS%),
  Compare "Usage" row, card line "Role <b>Co-Star / Lead Scorer</b> (28.1% usage[, N games when < 5])" (.bk-role)
  from the owner's table USG_ROLES / usgRole in app.js: < 20 Role Player / Connector, < 24 Average Starter, < 30
  Co-Star / Lead Scorer, < 35 Primary Creator / Superstar, else Ultra-High Usage (rounded to 0.1 first).
  BACK LINKS + VIEW ARROWS (owner, Oct 30 2026): generic ?back=<hash>&backl=<name> on the 2K page = a "← Back to
  {backl}" pill (.bk-back; replaces the from=inj one when present), kept in link() while browsing. Card arrows under
  the NBA team line (viewArrows, .bk-goto/.bk-gotoa): "View on NBA team (ORL) →" (list=nba, hidden on that team's list
  or with no NBA team) and "View in League →" (list=league, hidden on League; a free agent adds ?fa=1 = include the
  waiver wire for that visit; unticking the checkbox drops fa from the hash); both carry back = this list + player and
  backl = "Team / Waiver Wire / League / NBA team view" (VIEW_NAME), so chains work (Depth Chart -> Team -> League ->
  back -> back). Tested Oct 30 2026 at 402 px.
  RANK COLUMN (owner, Oct 30 2026: "rankings locked to the left of player names on all views"): every 2K list table
  (Team / Waiver wire / League / NBA team, Averages / Totals / Shooting) starts each name cell with .bk-rk = place in
  the current sort + filters (1..N over all rows, not just the 50 shown); it sits in the sticky .bk-nm cell, so it
  stays put when the stats scroll sideways. Header "# Name". Season by season / Game log have no rank.
  TRANSACTIONS CARD (owner, Oct 31 2026): last card on the 2K page (#bk-tx, txs() in renderBreakdown -> playerMoves(p,
  pname) next to tradeReturn): every DATA.transactions entry with him in adds or drops + his league draft pick
  (leagueDraftOf + that draft ts), newest first. Labels Trade / 3-team trade / Waiver claim (+ FAAB when t.bid) / Free
  agent / Dropped / Commissioner / Drafted (.bk-tx-*); team names = that season's name + (manager); trades: "X got
  him from Y", "Y got back: ..." (tradeReturn), links Trade Court case + Full trade (Rivalry); adds/drops name the
  player dropped to make room / added. Summary line: trades, pickups, drops, teams, "Now on X" / free agent. Checked
  Oct 31 2026: Banchero = startup 2.08 + Trade Court cases 003 and 014; Schroder 9 pickups + 9 drops (most moved).
  GAME LOG COLORS (owner, Nov 2 2026): navy row + lock icon by FP (.bk-lockrow, .bk-lockic) = the game his fantasy
  week counted: for every FINISHED week in DATA.playerWeeks (log season, any team), the Dev Dashboard pick when there is
  one (lawFor via loadLawSrc: lock -> that date, last -> his last lineup game, zero -> none), else the game whose FP =
  his locked points (tie: one he started per lgs.json, then the later one). Yellow (.bk-lgsrow) = an LGS game (v 1, no
  'k') that isn't the lock; games after the lock in the same week are never yellow (dropped in the page too, before
  lgs.mjs marks them). Key line .bk-logkey under the table. Checked Nov 2 2026: Sengun Oct 23 42 + Oct 26 55, VanVleet
  Oct 30 29 (owner's lock), Curry Oct 28 62 (Oct 30 start after it = plain), Lillard Oct 31 32 + Oct 29 yellow.
  GAME LOG WEEKS (owner, Nov 2 2026): rows grouped by fantasy week (gameLog g.week), newest first: weekRows() adds a
  VERTICAL "WK N" cell on the far left of each week's first row (rowspan = its rows shown; owner asked for it on the
  side instead of a header row), navy with gold text, tooltip = the week's dates; table .bk-wklog: week column sticky
  left 0 (24px), date column sticky left 24px. Works with Show all / last 10.
  FLOATING BACK BUTTON (owner, Oct 31 2026): the Transactions card's Trade Court / Full trade links carry
  ?ret=<2K hash>&retl="Back to {Team / Waiver Wire / League / NBA team} view" (playerMoves ret arg); render() calls
  backFloat(params) = a fixed navy pill at the bottom (#back-float, .back-float) on ANY page with ret, removed on the
  next render; leaving the commish keeps it unlocked when ret points back into it; the 2K page saves scrollY in
  sessionStorage bk-scroll on those taps and txs() restores it. Tested Oct 31 2026: Rivalry trade + Trade Court case.
  CARD TOP (owner, Oct 26 2026): .bk-top = .bk-id (headshot, FP/G ring right under it) beside .bk-head (#number +
  positions, first/LAST name, HT/WT/AGE, league rank, Sleeper %); the rest (.bk-info) below. One column up to
  1199px; from 1200px the top sits left (max 440px) and .bk-info right. Long last names shrink (h3.bk-l1 10-12
  letters, .bk-l2 13+); at <= 360px the number/position boxes move into a row above the name. Checked
  Antetokounmpo at 320 / 402 / desktop.
  CUSTOM TAGS (owner, Oct 25 2026: his own words, not a fixed list): localStorage gm-tags = { pid: [tag] } via
  gmSave (SYNCED in sync.js, MERGE 'object' = per player on first connect). Card: chips with × + "+ Tag" ->
  input (24 chars; a tag typed in another case reuses the existing spelling) + his other tags to tap
  (tagRow / addTag / setTags). Table: "Tags" column (BK_TAGCOL, first column, only once any tag exists;
  cell = chips, opts.html; sort = tagged first, grouped by their first tag A-Z). "Tags" filter row (#bk-tagbar,
  tagBar(): All + each tag with its count in the current list; BK.tag), works in all 3 lists. Same tag = same
  color (tagHue -> .th-0..5). A tag disappears when no player has it.
  TAG COLORS (owner, Oct 26 2026): 10 choices TAG_COLORS (Gold, Blue, Green, Red, Purple, Orange, Teal, Pink,
  Silver, Lime = .th-0..9); a picked color is saved PER TAG in gm-tag-colors { tag: index } (gmSave; SYNCED + MERGE
  'object' in sync.js) and used everywhere (tagHue = saved ?? old letter hash 0-5, so old tags keep their color).
  "+ Tag" box: color dots under the input (BK.newColor, tap again = automatic; typed text kept in BK.tagDraft while
  picking); his tag chips become buttons: tap one = recolor mode (BK.recolor, "Color for X (every player)" + Done),
  a dot sets that tag's color at once. Typing an existing tag with a color picked also recolors it.
  DELETE A TAG (owner, Oct 28 2026): deleteTag(tag) in app.js asks (confirm "Delete the tag X from all N players who
  have it?"), then removes it from every player in gm-tags, its gm-tag-colors entry and its gm-tag-order place, and
  clears the filter / recolor state. Buttons (.bk-tagdel, red outline): "Delete tag" in the card's recolor mode (open
  "+ Tag", tap one of his tags) and "Delete the tag X" under the filter row while that custom tag is the filter.
  DRAG TO SORT TAGS (owner, Oct 28 2026, every device): dragSort(box, sel, keyOf, done, same) in app.js = pointer
  events on a container bound once (mouse: press + move 6px; touch: press and hold 350 ms, then a non-passive
  document touchmove blocks scrolling only while a chip is held; setPointerCapture on the box; the click ending a drag
  is swallowed for 500 ms; long-press menu blocked; .dragging / .drag-on styles; chips get user-select / touch-callout
  none). Card: his own tags ([data-dtag] on tagChip(x) and the open-box chips; auto chips fixed first) -> setTags(pid,
  new order). Filter row: [data-tagf] chips, auto with auto / his own with his own (same() by .bk-autof) ->
  gm-tag-order / gm-autotag-order (gmSave, both in SYNCED); allTags() and autoOrder() sort by those (unsaved: A-Z /
  AUTO_TAGS order), so the Tags column grouping follows. Hint line .bk-draghint under the row. The Tags filter row
  WRAPS at every width now (.bk-tagfilter flex-wrap, no desktop scroll bar). Tested with mouse + touch pointer events.
  AUTO TAGS (owner, Oct 26 2026: "facts", set by the site, NOT editable; AUTO_TAGS in breakdown.js, autoTagsOf(p)
  in app.js -> [[tag, why]], why = tooltip): Injured (Sleeper injury_status or an ESPN injury entry), Trade talk
  (a TRADE_TALK news item in the last TRADE_TALK_DAYS 30: nightly data/trade-talk.json from updateTradeTalk in
  update.mjs = every rostered + active NBA player's /players/nba/{pid}/news, 8 at a time, ~526 players ~6 s,
  newest trade item of the last 60 days; a card whose news loaded (BK_NEWS) overrides it live and redraws the
  chips/bar/table), "Recently traded" = TWO separate tags (owner: "make a clear distinction"), both within
  TRADED_DAYS 14: League trade (blue .au-traded; traded between fantasy teams here: recentTrades(DATA) over
  DATA.transactions adds) and NBA trade (purple .au-nba; espnTrades(all) in breakdown.js: ESPN's transactions
  feed ?limit=100 (~1 month, CORS open, cached 15 min) has one plain sentence per team and no player ids, so an
  entry mentioning "trade" tags the players Sleeper lists on THAT team now whose normName appears in it = the
  players it got; tooltip quotes ESPN. Tested on past trades (limit=500 stub): Jul 19 ATL -> Dort, Feb 1-3 ->
  Hunter (SAC), Huerter (DET); players since moved again aren't matched, and a trade Sleeper hasn't moved yet
  shows once Sleeper updates his team. No NBA trades in the last 14 days on Oct 26),
  #1 / #2 / #3 option (teamOptions(DATA): each NBA team's top 3 by FP/G this season, league scoring, players
  Sleeper lists on that team now with >= half the team's most games; Oct 26: ORL Banchero 37 / Wagner 32.7 /
  Carter 28.7, DEN Jokic / Murray / Gordon). BK.auto loaded by autoTagData() in renderBreakdown. Solid chips
  with an SVG bolt (AUTO_ICON, .bk-auto .au-inj red / au-talk gold / au-traded blue / au-opt light) first in
  the card's tag row (no ×), in the Tags column (now always shown; auto first in sort) and the Compare "Tags"
  row; a custom tag can't take an auto tag's name. Tags filter row: auto tags with a count in this list (or
  picked) then custom tags; "Auto" / "Mine" switches (.bk-tagsw, gm-bk-tagshow { auto, mine }, synced via
  'gm-bk-') hide either group to save space (hiding a group drops its filter). Checked Oct 26 League list:
  Injured 50, Trade talk 3 (Sabonis, Clayton, Porzingis), #1 30 / #2 29 / #3 28, League trade 0 (last trade
  Oct 12; with Oct 20 as "today" League trade tags Ball / Mobley / Cunningham); 320 px no overflow.
  SECOND BATCH (owner, Oct 26 2026; AUTO_TAGS order = filter row order; thresholds are constants at the top of
  the auto-tag block in breakdown.js, owner may tune): League pickup (recentPickups: waiver / free_agent adds here
  within PICKUP_DAYS 7, tooltip team + FAAB), Trending add (trendingAdds: Sleeper /v1/players/nba/trending/add
  48 h, top TRENDING_TOP 25, ranked by count: Sleeper's list is NOT in count order), 4-game week / 2-game week
  (weekSlate: /schedule/nba/regular rows with week = Sleeper state week, regular season only; 4+ and <= 2, chip
  shows the real count "5-game week" via autoChip's 3rd value `label`; tooltip lists days + opponents), Hot /
  Cold / Minutes up (recentForm: last FORM.games 3 games from per-game box scores of this + 2 earlier weeks vs
  his games before them (season table minus those); needs FORM.minGp 5 games; Hot/Cold = 20% AND 5 FP/G,
  Minutes up = 20% AND 5 min; FORM.floor 15 (Hot: recent FP/G, Cold: earlier FP/G, Minutes: recent min) keeps
  deep bench out; on Oct 26 nobody has 5 games yet, with 3/2 test settings: 78 hot, 69 cold, 50 minutes up
  league-wide before the floor), Rookie (years_exp 0), and from the page's dynasty values via autoDynasty(v):
  Last taxi season (on taxi now and taxiLeft = 0), Contract year (readContract flag contract-year OR rookie-end)
  and Extension next summer (rookie-ext), Dynasty riser / faller (score now vs the newest dynasty-history night
  >= 7 days back, like fillWeekArrows; +-DYN_MOVE 5; follows gm-dyn-full), Top 100 prospect (prospectRanking;
  chip "Top 100 prospect #12"). Colors .au-pick/-trend/-week/-light/-hot/-cold/-up/-down. Checked Oct 26 on
  Parma: 4-game week 10, Rookie 10, Top 100 10, Last taxi season 1 (Ja'Kobe Walter), Contract year 4,
  Extension 2, riser 4 / faller 4 (Banchero -29 after his Out listing), pickups 5 = Sleeper's transactions.
  DRAFT LINES on the card (owner, Oct 25 2026; draftLines in renderBreakdown, .bk-draft): "NBA draft" = 2022 ·
  Round 1, No. 1 by the Orlando Magic / Undrafted (nothing when the player isn't in the file) from STATIC
  assets/nba-draft.json { source, built, undrafted: [pid], players: { pid: [year, round, overall, BRef team] } }
  (loadNbaDraft / nbaDraftText in breakdown.js; BRef codes incl. old names, CHA = Bobcats through 2014).
  Built Oct 25 2026 from Basketball-Reference /draft/NBA_{2003..2026}.html (no </tbody>; round 2 after the
  in-table thead row; forfeits handled: 2003/2004 29 first-rounders, 2022/2023 58 picks) matched to Sleeper ids
  for players on an NBA team or a league roster (normName rules; draft year within 2026 - years_exp + 1 .. - 9;
  closest year wins; alias ronald holland -> ron holland): 420 drafted, 107 undrafted (all checked by eye:
  VanVleet, Caruso, Reaves, Naz Reid, Dort...). REBUILD AFTER EACH JUNE DRAFT from a home PC:
  scripts/build-nba-draft.ps1 -LastYear {year} (one page per 4 s; prints the undrafted list, add an alias for
  any drafted player in it), then upload assets/nba-draft.json. The script reproduced the Oct 25 file exactly.
  "League draft" = DATA.drafts (leagueDraftOf: 2023 startup / rookie draft · round.pick-in-round (No. N
  overall) by that season's team name (manager)), else "Not drafted in the league (joined a roster later)".
  Verified: Jokic startup 1.01 bigdaddyburk (Better Call Gasol), Flagg 2025 1.01, Holland 2024 2.03 (No. 11).
  CAREER period + LOCKED POINTS (owner, Oct 25 2026): season chip "Career" (?season=career) on Team and League
  (not Waiver wire; falls back to this season there). League career = every league season's table added up
  (sumLines, each season's own scoring). Team career = ONLY games from weeks he was on that team: frontOffice
  (DATA).stints -> ownerAtWeek (latest stint started <= week and not ended before it, same rule as Front Office's
  locked points; week key season*100 + week, box-score week = fantasy week), per-player game logs of the seasons
  he spent time there (~1-3 requests a player). Game log card shows this season in Career. Locked points =
  lockedTotals(DATA, { season, owner }) from DATA.playerWeeks (every game type, = Player Index; finished weeks
  only): Team = that team's only, League / Waiver wire = any team; badge (.bk-lock navy shield after Total FP:
  points, "N st" starts, tooltip per start) + "Locked" column (Averages, Totals) + "Starts" (Totals); BK.locked.
  Badge numbers >= 1,000 drop the decimal (bkBadgeNum). Verified: Parma career locked = Player Index for every
  player (Adebayo 1,031, Banchero 1,523.5, Sengun 2,149, Harden 2,189); Banchero 141 of 201 games since 2023
  with Parma (stints tzola -> logan 2023 wk 8 -> Parma wk 20, checked from raw logs); Jokic league career 218
  GP = logs, 3,078.5 locked / 54 starts = Player Index.
  MORE CARD INFO (owner, Oct 25 2026): ROSTER % = Sleeper's research feed /players/nba/research/regular/
  {season}/{week}?league_type={league settings.type = 2} ({ pid: { owned, started } } = % of Sleeper DYNASTY
  leagues, what the Sleeper app shows in our league; WITHOUT league_type the feed is REDRAFT leagues (owner caught
  it Oct 26 2026: Wendell Carter Jr. 48.4% / 25.1% vs app 86% / 47% = dynasty 85.6 / 46.9); week = state week in
  season, else 1; rosterShares() in breakdown.js) -> "Sleeper Rostered 85.6% · Started 46.9% of dynasty leagues" line under HT/WT.
  LEAGUE RANK (owner, Oct 26 2026): first built from Sleeper's rank_std / pos_rank_std (Sleeper standard
  scoring; Ayo Dosunmu 13 SG / 54 OVR = his app), then the owner asked for OUR scoring: leagueRanks(DATA, season)
  in breakdown.js = every NBA player with FP > 0 in that season's stat table, ranked by TOTAL fantasy points
  under that season's league scoring (same basis as Sleeper's: totals, main `position`), ties share; cached 2
  min. Checked by hand from raw box scores: Dosunmu 2026 69 FP = 91 OVR / 17 SG (2025-26: 96 / 19). Shown as
  "League rank 17 SG · 91 OVR (2026-27)" above the roster % line, "OVR" + "Pos Rk" columns (BK_RANK /
  BK_PRANK, Averages + Totals, best first) and OVR / Pos Rk per season in Season by season (pos label = today's
  main position; Career = this season's rank). The roster % line
  (.bk-share; one decimal, bkShare) + "Ros%" column (BK_ROS, Averages + Totals). NICKNAMES = each Sleeper
  roster's metadata p_nick_{pid} (the nickname that manager gave him; teams keep them after he leaves; 293 on
  Oct 25) under the last name (.bk-nick, gold italic). RULE (owner, Oct 26 2026): a ROSTERED player shows ONLY
  his current team's nickname (none = nothing; old teams' nicknames hidden, e.g. Butler "Himmy Buttplug" from
  bigtrey5456 only); a FREE AGENT shows every past nickname with the manager who gave it (.bk-nick-past: "Anferno"
  by bigdaddyburk · "Ernee" by bigtrey5456 · "Anfony Simeon" by BenDoverPlz123; 36 free agents have some). NOTES: textarea under the bio (.bk-note), saved 0.6 s after
  typing to gm-notes { pid: text } (gmSave; SYNCED + MERGE 'object'), ✎ by the name in the table (tooltip =
  note). SEASON BY SEASON adds Locked + Starts (any team, = Player Index; Banchero 2025-26 720, 2024-25 711) and
  on Team "For team" (that team's; Banchero 2023-24 92.5 of 371).
  SEASON BY SEASON SWITCHES (owner, Oct 26 2026; years() in renderBreakdown, .bk-yrtabs/.bk-yrs/.bk-yr-* in
  styles.css): NBA / League (gm-bk-yrmode) over Averages / Totals / Shooting (gm-bk-yrview; columns mirror the list
  views; both synced via 'gm-bk-'). NBA = one row per season (NBA team, ranks, Locked/Starts any team, For team on
  the Team list). League = per season, his played games in date order grouped into stretches by ownerAtWeek over
  frontOffice(DATA).stints (BK_STINTS, cached; week key season*100 + game week, same rule as Team career): one
  row per stretch, NEWEST FIRST within a season like the seasons (owner: reads bottom-up in date order), with date range + fantasy team (that season's name) + manager, a mid-season trade = two rows,
  nobody had him = muted "Not on a roster" row; Locked/Starts = that season's playerWeeks for that owner, each
  start given to the owner's stretch holding that week (else the nearest), so a start in the trade week still
  counts and rows add up to Career. Last row Career: NBA = every season since the league started ("N seasons");
  League = games while on a league team. Game logs per player cached for the visit (BK_YR_GAMES; seasonLines no
  longer used by app.js). Verified Oct 26: Banchero 2023-24 tzola 22 GP / logan 38 GP 278.5 locked / Parma 21 GP
  92.5 (= 81 GP, 371), career 201 GP 1,851 locked = sum of rows; Robert Williams III 2025-26 = 5 stretches incl.
  3 "Not on a roster"; 320 px no overflow.
  AWARDS ROW (owner, Oct 25 2026; awardLine, .bk-aw chips, tooltips name the season + fantasy team):
  playerAwards(DATA, frontOffice(DATA)) in breakdown.js = the Record Book's Awards rules (completed seasons
  with a champion): Player of the Year, League MVP, Rookie of the Year, Championship MVP, Steal of the Draft
  (indiv, gold outline), All-Star / All-Fantasy / All-Rookie (team, blue outline); cached per visit in
  BK_AWARDS. RINGS (owner's rule: on the winning team's roster in championship week, NOT on taxi; IR counts):
  championshipRings(DATA) = each finished season's Sleeper league rosters (closed after the final; the final
  week's matchup `players` = exactly that roster, taxi included) -> champion's players minus taxi; gold
  "{season} Champion" chip with the trophy icon, listed first. Repeats share one chip (owner, Oct 25 2026):
  "3 x League MVP (2023-24, 2024-25, 2025-26)", seasons oldest first, tooltip one line per win; groups by
  kind, then newest win. Season chips (.bk-seasons) wrap at 320px. Verified: Jokic = Record Book (MVP 23/24/25,
  POY 24, All-Fantasy 23/24, All-Star 25); rings 2023 TRT3 20 (no taxi), 2024 bigdaddyburk 37 - 9 taxi = 28,
  2025 tzola13 45 - 19 = 26; Banchero 2024-25 Champion + Championship MVP.
  COMPARE (owner, Oct 26 2026: "drop/add decisions", up to 4, across lists, keep all the info): gm-bk-cmp = [pid]
  (gmSave; synced via 'gm-bk-'; BK_CMP_MAX 4, toggleCmp / cmpList / cmpBtn). Add with the small + (.bk-cmpbtn)
  at the left of every table name cell (the table click handler ignores [data-cmp], so it doesn't open the card)
  or "+ Compare" (.bk-herocmp) on the card's team line. Tray (#bk-tray, .bk-tray, sticky at the bottom, chips with
  ×, Compare/Hide + Clear; a 5th pick shows "remove one first"). Compare card (#bk-cmp, top of the page, betaCard,
  BK.cmpOpen): loadBreakdown { list: 'pick', pids } (same builder as the lists; Career = League-style) -> one
  column per player (photo, name, NBA team · pos, Card (only when he's in the current list) / Remove) and rows
  cmpRows(): Bio (NBA team, fantasy team + manager or Free agent, slot, positions, age, NBA season, ht/wt,
  injury, contract, NBA draft, league draft, awards incl. rings "3 x League MVP", tags, note), Value (dynasty,
  league rank, position rank, Sleeper rostered/started %), Production for the page's season (GP, MIN, FP/G,
  total FP, locked + starts any team), Per game (pts, reb, ast, stl, blk, TO, 3PM, +/-), Shooting (FG%, 3P%, FT%,
  eFG%, TS%). Gold cell (.best) = best of the group per row ('lo' rows: age, ranks, TO; ties all gold). Labels
  column sticky; phones ~2.5 players visible + swipe. Click listener on .bk-page (new each render). Tested Oct 26
  2026: Banchero (Team) + Brook Lopez (Waiver wire, card button) + Jokic + Murray (League search), 5th refused,
  every row filled, golds right; layouts 402 + desktop.
  INJURY REPORT (owner, Oct 26 2026: "subscribe to teams' injury reports", separators by team). Built as the 2K
  breakdown's "Injuries" list, then MOVED (owner, same day: "pop it up to the 2K breakdown level, name it Injury
  Report") to ITS OWN Test features tab: TEST_FEATURES { id: 'injuries', label: 'Injury Report' } ->
  #/commish?tab=injuries -> renderInjuryReport(body, params) (?team= = "you", default COMMISH) ->
  renderInjuries(body, params, me); the old ?tab=breakdown&list=inj forwards there. NAMES link to the 2K breakdown
  NBA TEAM view of the player's NBA team with him selected (owner: "by team I meant NBA team"; cardLink:
  ?tab=breakdown&from=inj&list=nba&nba=TEAM&p=PID) -- rows and the "Your players" strip; the report saves window.scrollY in sessionStorage
  inj-scroll on that tap and restores it when it renders again. The 2K page with ?from=inj shows "← Back to Injury
  Report" (.bk-back) on top and keeps from=inj in its own links (link()). .inj-* in styles.css. Every active
  player with a Sleeper injury_status and an NBA team (Oct 26: 86 = 3 IR, 65 Out, 5 GTD, 13 DTD; Sleeper gives
  injury_body_part, injury_notes, news_updated (no start date)), built with loadBreakdown { list: 'pick' } (this
  season's stats, owner/slot) + dynasty. Card "Injury report": league totals line, My subscriptions / Whole league
  switch (gm-bk-injall), "Subscriptions" fold with chips for the 8 fantasy teams + 30 NBA teams (injured count
  in red; gm-bk-injsub = { f: [owner], n: [NBA codes] }, default { f: [you], n: [] }; synced via 'gm-bk-').
  List card: one section per subscribed fantasy team, then NBA teams A-Z (Whole league = every NBA team with an
  injury); navy separator (.inj-head: logo, name, "N injured" / "All healthy") sticky at the top while scrolling
  its section (phones top: 54px under the sticky .topbar). Rows: photo, name, positions · NBA team · fantasy team
  (slot) or Free agent, body part · note · "news Oct 26", status pill (IR/Out/Sus red, GTD/DTD gold), FP/G + Dyn;
  sorted IR, Out, Doubtful, GTD, DTD, then dynasty; tap = his card via the NBA team list (?list=nba&nba=&p=).
  Tested Oct 26 2026: Parma 12 injured, ORL + HOU subscribe, Whole league 27 teams / 86 rows; layouts 402 +
  desktop. RETURN ESTIMATES (owner, Oct 26 2026: "week/day/month estimate ... also Out for season"; Sleeper has
  none): espnInjuries(all) in breakdown.js reads ESPN's public site.api.espn.com/apis/site/v2/sports/basketball/
  nba/injuries (CORS open, browser only, cached 15 min, failure = no estimates): per injury details.returnDate,
  fantasyStatus OFS = out for the season, date (hurt on), type/side/detail, shortComment (news note); matched to
  Sleeper by normName + NBA team (team displayName -> NBA_TEAMS code; Oct 26: 81 of 82, the miss = Otega Oweh,
  no Sleeper team). returnEstimate(e) -> "Out for season" | "Est. return Nov 20 (~4 weeks)" (< 14 days "~N days",
  < 60 "~N weeks", else "~N months"; <= 1 day "any day now"); tone colors est-days green, weeks gold, months/
  season red. Injuries view: ESPN-only players join the report (status from ESPN: Day-To-Day = DTD), row adds
  "hurt Oct 19", the estimate chip (.inj-est) and the 2-line news note (.inj-note); sort = out for season, status,
  then longest expected absence; summary counts "N out for the season" + a source line. 2K card: estimate chip
  (.bk-est) after the injury tag (BK.espn, loaded in renderBreakdown's Promise.all); Compare "Injury" row adds it.
  INJURY REPORT TOGGLE on the 2K card (owner, Oct 26 2026): injured players (Sleeper status or ESPN entry) get a
  red "Injury" pill button (MED_ICON + status, .bk-newsbtn.bk-injbtn, data-panel="inj") FIRST in the News / Trade
  talk row (owner moved it there, same style, kept red; the injury tags stay in .bk-injline above); tap = show/hide
  .bk-newsrep.bk-injrep (injReport(p, e) returns { btn, panel }, built by newsBlock): ESPN's report paragraph (shortComment, same as the Injury
  Report tab; "No report from ESPN yet" otherwise), facts line (Sleeper status · hurt date · estimate · ESPN
  side/type/detail), source line. Closed by default; BK.injOpen keeps it open across players (no redraw on toggle).
  NEWS + TRADE TALK buttons on the 2K card (owner, Oct 26 2026; no free live rumor source exists: HoopsHype blocks
  bots (never work around it), RotoWire/Spotrac paid/blocked; ESPN news is headline-level): Sleeper's per-player
  news /players/nba/{pid}/news (FantasyPros / RotoWire blurbs, only Sleeper's latest ~5 per player; fields
  published, source, metadata { title, description, analysis, url }) via playerNews(pid) in breakdown.js. Each item
  goes to EXACTLY ONE list (owner: "moved, not copied"): TRADE_TALK regex match (trade request / requests trade,
  wants out, trade talks/discussions/market/rumors/candidate/target/…, on the trade block, shopping, gauging the
  market, suitors, interested in acquiring (not "those interested in acquiring" = fantasy advice), expressed
  interest, could be traded, open to trading, exploring a trade, UPCOMING deadline only ("ahead of/before the
  deadline"; "acquired at the trade deadline" = old trade), buyout, asked to be traded) -> trade, else news.
  Card (newsBlock, bottom of the bio): two round buttons with counts, News (newspaper) and Trade talk (swap arrows,
  gold when > 0) -> .bk-newsrep panels (title, date · source, description, analysis, "Read the full story" link);
  loaded when the card opens (BK_NEWS cache; draw() fetches + replaces only .bk-newsline), toggles kept in
  BK.newsOpen / BK.tradeOpen. Every panel has data-for="inj|news|trade" and the button opens [data-for=kind]
  (a .bk-newsrep lookup opened the injury panel from News, owner caught it Oct 26 2026). Checked Oct 26 2026 on all 284 rostered players (1,418 items): 6 trade talk (Sharpe
  "trade candidate", Porzingis "could be traded" + "exploring trade routes", Camara "trade discussions", Clayton
  "trade suitor", Sabonis "trade rumors"), 0 items in both lists; Jaren Jackson "acquired at the trade deadline"
  and Giddey fantasy "interested in acquiring" correctly stay in News.
  Checked: Veesaar out for season (ACL), Gueye Nov 20 ~4 wks, Banchero Nov 22 ~4 wks on the card.
  YOUR PLAYERS (owner, Oct 26 2026: "see if one of my players benefits from a teammate's injury"): every NBA team
  section (subscribed or Whole league) starts with a "Your players on this team" strip (.inj-mine; your roster =
  loadBreakdown { list: 'team', owner: me }, me = ?team or COMMISH): name (link to his card), positions, slot,
  FP/G + minutes; injured ones in red ("on the report below"); healthy ones get "Opening: X (pos) out ~N weeks"
  (.inj-open) = injured teammates sharing a position group (posGroups, main + secondary) who are Out / IR /
  Sus / out for season or have a weeks/months estimate (day-to-day ignored), longest absence first, top 3,
  INCLUDING your own injured players. Your injured players in the list get a gold "Yours" tag (.inj-yours).
  Checked: ORL = Banchero (IR), da Silva "Opening: Banchero ~4 wks, Penda ~3 wks, Nelson ~3 wks", Penda (taxi).
  RECENT CHANGES (owner, Nov 2 2026: "recently added names and updates to current injuries"): card between the Injury
  Report card and the list (recentCard / recentHtml / evRow in renderInjuries). No source keeps injury history, so
  update.mjs -> updateInjuryLog() in breakdown.js saves data/injury-log.json { version INJ_LOG_VERSION, at, since, last:
  { pid: state }, events: [{ at, pid, k new|upd|off, ch: [[field, from, to]], st }] } (INJ_LOG_DAYS 30 kept; first run
  = snapshot only; a failed ESPN read keeps last night's ESPN fields via injuryNow, so a blip logs nothing). state =
  injuryState(): nm, t, s (Sleeper status), b, n (Sleeper body part / note), e / r / o / c / d (ESPN status, est.
  return, out for season, news note, date), nu; events on INJ_FIELDS s e o r b n c. The page adds LIVE events =
  injuryDiff(log.last, injuryNow(today's feeds)) = "Since the last check"; players who came off the report are loaded
  too (offPids) for their stats / owner. Rows: New (red) / Update (gold) / Back (green) tag, change lines (status a -> b,
  ruled out for the season, est. return a -> b "(2 weeks later / 5 days sooner)", injury / note changes, "New ESPN
  report"), then today's body part, estimate chip and ESPN note; pill = today's status or Healthy; FP/G + Dyn; tap =
  his 2K card. Grouped under "Since the last check" + each nightly check's day; chips 24 hours / 3 / 7 / 30 days
  (gm-bk-injdays, default 3) and All / New / Updates / Back with counts (gm-bk-injkind); 25 shown + "Show all";
  follows the mode (Whole league = everyone, else subscribed fantasy + NBA teams). Chip taps redraw only this card.
  Tested Nov 2 2026 with a made-up older snapshot (fetch stub): 3 new, 3 updates, 2 back, older day group; 402 px.
  MY SCHEDULE mode (owner, Oct 26 2026): third tab after My subscriptions / Whole league; mode saved in
  gm-bk-injmode ('subs' | 'all' | 'sched'; old gm-bk-injall still read as the default). Matchups = DATA.schedule
  (saved nightly from Sleeper; regular weeks) for you (?team or COMMISH) from Sleeper's state week on, skipping
  weeks whose last game date has passed; week dates = min/max game date per week from /schedule/nba/regular/
  {season}. weekCall(p, week): ESPN out for season or estimated return after the week's last game = "Out all
  week"; return inside the week = "May miss part of the week" (note "Est. back Nov 4 (week runs Nov 2–Nov 8)");
  no ESPN estimate: Out/IR = out and DTD/GTD = maybe, ONLY for the current and next week. TAXI players are left
  out on both sides (can't start). Section per week: sticky separator "Week 3 · Nov 2–Nov 8 · vs team (manager)",
  "N out · N maybe" / "Full strength", the opponent's players in the two groups (same rows as the report), and a
  "Your side:" line with your own players projected to miss (out / part). Checked Oct 26: week 2 vs bigtrey5456
  Butler out (Jan 2), Marshall + Hayes maybe (back Oct 28); week 3 vs loganzarvell Furphy + Duren out, Claxton
  maybe; schedule = DATA.schedule. Column defs:
  [key, label, sort value, cell, { only / not: list, cls }], filtered by bkCols().
  DATA: table stats = SEASON STAT TABLES (breakdown.js): every player's season added up from Sleeper's per-game
  box scores /stats/nba/{season}/{week} (STAT_KEYS incl. plus_minus + bonus fields, summed per game so bonuses
  are right). Nightly update.mjs -> updateSeasonStats -> data/season-stats.json { version (STATS_VERSION),
  at, seasons: { s: { keys, weeks, through, complete, players: { pid: [values] } } } } (~50 KB a season;
  finished seasons built once and kept, ~8 s each; the season in progress sums its FINISHED weeks = Sleeper
  state week - 1). The page (seasonTable) adds the weeks after the saved ones live (the current week, 1
  request), cached 2 min; with no saved file it builds every week itself (~6 s a season). Verified Oct 25
  2026: table = game logs exactly (Sengun / Banchero 2025-26 GP, pts, FP, +/-; Wembanyama 2026 3 GP 60 pts
  122 FP +33). The player card's Season by season + Game log use the per-player game log
  /stats/nba/player/{pid}?season_type=regular&season=Y&grouping=week ({ week: [games] }, ~70-90 KB a
  season, opponent + is_away_team, DNP rows = empty stats; totalOf). Sleeper's SEASON-TOTAL feeds
  (/v1/stats/nba/regular/Y, /stats/nba/Y, /stats/nba/player/{pid} without grouping) are NOT used: a day
  behind (Oct 25 2026: Sengun 2 GP vs 3 played), plus_minus always 0, bogus bonus_* flags (Banchero 2025-26
  2,568 FP vs 2,560 from his games, never scored 40). Minutes = min or sp / 60. FP = each season's own league
  scoring (2023 = 0.5/pt). Bio from /v1/players/nba (height in inches, weight, college, number, years_exp,
  birth_date, injury_*). No GS column (box rows have no gs). Verified Oct 25 2026: Sengun 2026 3 GP 23.0 pts
  37.0 FP/G (34+42+35), Banchero 49 + 25 FP, TS% 77.0; layouts 320 / 402 / 1300.
## Not built yet (sidebar shows "Soon")
Nothing at the moment. (Cheat Sheet was dropped by the owner.) The owner
shares screenshots of a football reference site (fantasyhoff.com) for each feature and
wants it adapted for basketball.
