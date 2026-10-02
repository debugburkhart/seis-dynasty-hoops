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
- `assets/app.js`: all pages (hash routes: rivalry, records, power, standings), sidebar.
- `assets/build-data.js`: pulls everything from Sleeper (`api.sleeper.com`, cache-busted),
  applies `corrections.js`, loads frozen seasons. Output = `data/league.json`.
- `assets/records.js`: Record Book (6 categories, filters, record-change history).
- `assets/frontoffice.js`: trades/waivers/drafts valued by locked points ("stints").
- `assets/standings.js`: Legacy score + standings table + final finishes.
- `assets/power.js`: Power Rankings. `assets/freeze.js`: frozen seasons + week guard.
- `assets/hype.js`: Matchup Hype (hype score, Main event, labels, moments). Uses only games
  before the week. The page (app.js) fetches Sleeper state + live scores in the browser and
  reveals a week only once it's under way (week 1: the Monday of tip-off week).
- `assets/corrections.js`: manual fixes (team scores, player locked points, draft picks).
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
  Without `data/league.json` locally, the site builds live from Sleeper (slow, ~20s).
- Verify numbers against the data before reporting; the owner checks things in the app.

## Not built yet (sidebar shows "Soon")
Home, Transactions, Weekly Props, Trade Court, Awards, Timeline,
Draft History, Cheat Sheet, Draft Grades. The owner shares screenshots of a football
reference site (fantasyhoff.com) for each feature and wants it adapted for basketball.
