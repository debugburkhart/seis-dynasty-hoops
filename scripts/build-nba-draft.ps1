# Rebuilds assets/nba-draft.json (the real NBA draft on the 2K breakdown player card) from
# Basketball-Reference's draft pages, matched to Sleeper player ids. Run from a home PC in Windows
# PowerShell after each June draft:  powershell -File scripts\build-nba-draft.ps1 -LastYear 2027
# Reads one page every 4 s (BRef allows 20 a minute), as a labeled bot. Then upload assets/nba-draft.json.
param([int]$FirstYear = 2003, [int]$LastYear = (Get-Date).Year, [string]$LeagueId = '1398888652733472768')

$work = Join-Path $env:TEMP 'nba-draft-build'
New-Item -ItemType Directory -Force $work | Out-Null
$ua = 'SeisDynastyHoops/1.0 (league history site; contact via github.com/debugburkhart)'
# Sleeper name -> Basketball-Reference name, after Norm (add one when a drafted player shows as undrafted).
$alias = @{ 'ronald holland' = 'ron holland' }

function Norm([string]$s) {
  $d = $s.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object Text.StringBuilder
  foreach ($c in $d.ToCharArray()) { if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne 'NonSpacingMark') { [void]$sb.Append($c) } }
  $x = $sb.ToString().ToLower() -replace ("[.,'``\-" + [char]0x2019 + ']'), ''
  $x = $x -replace '\b(jr|sr|ii|iii|iv)\b', ''
  return ($x -replace '\s+', ' ').Trim()
}

# 1. Draft pages -> picks (round 2 starts after the table's divider row; no </tbody> on the page).
$picks = New-Object System.Collections.ArrayList
foreach ($y in $FirstYear..$LastYear) {
  $file = Join-Path $work "b$y.html"
  if (-not ((Test-Path $file) -and (Get-Item $file).Length -gt 50000)) {
    $code = curl.exe -s -m 40 -o $file -w '%{http_code}' -A $ua "https://www.basketball-reference.com/draft/NBA_$y.html"
    Start-Sleep -Seconds 4
    if ($code -ne '200') { Write-Warning "${y} draft page: HTTP $code"; continue }
  }
  $h = [IO.File]::ReadAllText($file)
  $s = $h.IndexOf('<tbody>'); $e = $h.IndexOf('</table>', $s)
  if ($s -lt 0 -or $e -lt 0) { Write-Warning "${y}: no draft table"; continue }
  $round = 1; $n = 0
  foreach ($chunk in ($h.Substring($s, $e - $s) -split '<tr')) {
    if ($chunk -match 'class="thead"') { if ($n -gt 0) { $round = 2 }; continue }
    if ($chunk -notmatch 'data-stat="pick_overall" csk="(\d+)"') { continue }
    $pick = [int]$matches[1]
    $team = if ($chunk -match 'data-stat="team_id"[^>]*><a[^>]*>([A-Z]{3})</a>') { $matches[1] } else { '' }
    if ($chunk -notmatch 'data-stat="player"[^>]*>(?:<a href=''/players/./[a-z0-9]+\.html''>)?([^<]+)') { continue }
    $n++
    [void]$picks.Add(@{ y = $y; r = $round; p = $pick; t = $team; n = [System.Net.WebUtility]::HtmlDecode($matches[1]) })
  }
  "${y}: $n picks"
}

# 2. Match to Sleeper players on an NBA team or on a league roster today (draft year near 2026 - years_exp).
Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = [int]::MaxValue
$players = $ser.DeserializeObject((curl.exe -s https://api.sleeper.com/v1/players/nba | Out-String))
$rostered = @{}
foreach ($r in $ser.DeserializeObject((curl.exe -s "https://api.sleeper.com/v1/league/$LeagueId/rosters" | Out-String))) { foreach ($p in $r['players']) { $rostered[$p] = $true } }
$byName = @{}
foreach ($k in $picks) { $n = Norm $k.n; if (-not $byName.ContainsKey($n)) { $byName[$n] = New-Object System.Collections.ArrayList }; [void]$byName[$n].Add($k) }
$found = [ordered]@{}
$undrafted = New-Object System.Collections.ArrayList
$season = if ((Get-Date).Month -ge 8) { (Get-Date).Year } else { (Get-Date).Year - 1 }
foreach ($sid in $players.Keys) {
  $p = $players[$sid]
  if ($sid -notmatch '^\d+$' -or -not ($rostered.ContainsKey($sid) -or ($p['team'] -and $p['active']))) { continue }
  $n = Norm "$($p['first_name']) $($p['last_name'])"
  if ($alias.ContainsKey($n)) { $n = $alias[$n] }
  $expected = $season - $(if ($p['years_exp'] -ne $null) { [int]$p['years_exp'] } else { 0 })
  $cands = @($byName[$n] | Where-Object { $_ -and $_.y -le $expected + 1 -and $_.y -ge $expected - 9 })
  if (-not $cands.Count) { [void]$undrafted.Add($sid); Write-Host "undrafted: $($p['first_name']) $($p['last_name']) ($($p['team']), $($p['college']))"; continue }
  $b = $cands | Sort-Object { [math]::Abs($_.y - $expected) } | Select-Object -First 1
  $found[$sid] = @($b.y, $b.r, $b.p, $b.t)
}

# 3. Save: { source, built, undrafted: [pid], players: { pid: [year, round, pick, team] } }.
$out = [ordered]@{ source = "Basketball-Reference NBA draft pages $FirstYear-$LastYear"; built = (Get-Date -Format 'yyyy-MM-dd'); undrafted = @($undrafted | Sort-Object { [int]$_ }); players = $found }
$path = Join-Path (Split-Path $PSScriptRoot) 'assets\nba-draft.json'
[IO.File]::WriteAllText($path, $ser.Serialize($out), (New-Object System.Text.UTF8Encoding $false))
"Saved $path : $($found.Count) drafted, $($undrafted.Count) undrafted. Check the undrafted list for name mismatches."
