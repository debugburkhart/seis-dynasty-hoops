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
- Always end a change with the exact list of files to upload.- The repo is public: check runs/files with `curl` against api.github.com,
  raw.githubusercontent.com and the live site (github.io is blocked in the Browser pane).

## Architecture (all plain ES modules, no build step)
- League logo (owner chose the "Hex Ball", Oct 2026): assets/logo.svg (sidebar, top bar,
  favicon), assets/icon-180.png (iPhone home screen) and icon-512.png, all drawn from the same
  shapes; downloadable copies in brand/ (SVG, 512/1024 PNG, 1024 avatar on navy). PNGs are
  drawn with PowerShell System.Drawing (no Node locally), matching the SVG geometry.
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
  asked; that only drops the fade); phones get ‹ › arrows + dots, no auto-advance (bindHomeSlides). Slides
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
  starter counts ONE game per week (locked by the manager, else his last game), verified
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
  The commish tab bar has two groups: My GM (Briefing = default tab, Lock-in coach) and League
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
  now sum to the official scores).
  NEEDS AN AUTOMATIC FIX before more weeks end: official weekly scores from fpts deltas per
  last_scored_leg, mid-week snapshots of players_points (correct while the week is live) as the per-player
  source, a solver for the rest, and a check that flags anything ambiguous.
  SLEEPER'S OLD WEEKS ARE BROKEN (found Oct 21 2026): /v1/league/{id}/matchups/{week} for 2024 and 2025
  now drops many locks (players_points / starters_points = latest game or 0; e.g. 2025 wk 21 Parma
  327 live vs 422 real; season totals 53,147 vs 59,653). Backtests MUST take real scores from
  league.json games (ap/bp) and locked points from playerWeeks (bt useFrozen). Box scores and weekly
  projections are fine. The Oct 20 backtest numbers (managers 167, Balanced 185, Play to win 176,
  "opponents +22/week", "managers lock worse") used the broken feed and are WRONG.
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
- `assets/corrections.js`: manual fixes (team scores, player locked points, draft picks,
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
- `data/` is written only by the Action (league.json, frozen/, snapshots/, week-guard.json, taxi-log.json, coach-log.json, props.json, season-stats.json,
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
  gm-tracker-seen-*, gm-inj-*, wager-saved, gm-tags, gm-bk-*, gm-notes. NOT synced: gm-tips-{date} (cache), sessionStorage cm-open,
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

## Test features (commish office, owner Oct 25 2026)
- Third tab group in the commish office ("My GM", "League office", "Test features"): where brand-new
  features are born and tested, early access for the owner only (the office is passcode-gated).
- RULE: every Test features tab AND every card inside it carries the "Beta" tag (.gm-beta) until the
  owner says the feature goes live. `assets/test-features.js`: TEST_FEATURES [{ id, label, since }]
  (tab id = #/commish?tab=id; testTabs() adds the tag to the tab label), BETA (the tag), betaCard(title,
  body, { sub, cls, id }) = a card with the tag in its title: draw EVERY card of a test feature with it.
  To add one: an entry in TEST_FEATURES + its renderer in renderCommish's `show` map (app.js).
- GRADUATING (only when the owner says so): move the feature out of Test features to its real place
  (a public page in NAV/READY, or a My GM / League office tab), remove its TEST_FEATURES entry, swap
  betaCard for plain cards (no Beta tags), and note the date + new place here.
- Current test features:
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
  his team + manager. NBA TEAM list (owner, Oct 26 2026, "evaluate how teams are operating"; ?list=nba&nba=ORL,
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
  CUSTOM TAGS (owner, Oct 25 2026: his own words, not a fixed list): localStorage gm-tags = { pid: [tag] } via
  gmSave (SYNCED in sync.js, MERGE 'object' = per player on first connect). Card: chips with × + "+ Tag" ->
  input (24 chars; a tag typed in another case reuses the existing spelling) + his other tags to tap
  (tagRow / addTag / setTags). Table: "Tags" column (BK_TAGCOL, first column, only once any tag exists;
  cell = chips, opts.html; sort = tagged first, grouped by their first tag A-Z). "Tags" filter row (#bk-tagbar,
  tagBar(): All + each tag with its count in the current list; BK.tag), works in all 3 lists. Same tag = same
  color (tagHue -> .th-0..5). A tag disappears when no player has it.
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
  Oct 25): current team's under the last name (.bk-nick, gold italic, e.g. "Banch"), others counted "+N" with
  "also called ... by manager" in the tooltip. NOTES: textarea under the bio (.bk-note), saved 0.6 s after
  typing to gm-notes { pid: text } (gmSave; SYNCED + MERGE 'object'), ✎ by the name in the table (tooltip =
  note). SEASON BY SEASON adds Locked + Starts (any team, = Player Index; Banchero 2025-26 720, 2024-25 711) and
  on Team "For team" (that team's; Banchero 2023-24 92.5 of 371).
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
  2025 tzola13 45 - 19 = 26; Banchero 2024-25 Champion + Championship MVP. Column defs:
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
