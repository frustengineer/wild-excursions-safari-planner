# Daily scraper run — invoked by the "TadobaSafariScraper" Windows
# Scheduled Task (see scraper/README.md for how it was registered).
# Re-sweeps the full current window each day (not just the new tail day)
# so near-term availability also stays fresh, not just the far edge.
# DATABASE_URL comes from scraper/.env (gitignored) via scrape.py's own
# load_dotenv() call — nothing secret lives in this script.
#
# Deliberately does NOT use PowerShell's own `*>`/`2>&1` redirection on
# the python.exe call: in Windows PowerShell 5.1, that wraps every
# stderr line from a native executable in a terminating ErrorRecord,
# which (combined with $ErrorActionPreference) aborts this wrapper the
# instant Python writes anything to stderr — even a harmless warning —
# before the log file is ever flushed. cmd.exe's own redirection avoids
# that entirely and gives a plain, complete text log.

Set-Location $PSScriptRoot

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir ("scrape-{0}.log" -f (Get-Date -Format "yyyy-MM-dd_HHmmss"))

$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$tadobaScript = Join-Path $PSScriptRoot "scrape.py"
$penchScript = Join-Path $PSScriptRoot "scrape_mp.py"

cmd /c "`"$python`" `"$tadobaScript`" --horizon-days 120 > `"$logFile`" 2>&1"
$tadobaExit = $LASTEXITCODE
cmd /c "`"$python`" `"$penchScript`" --horizon-days 119 >> `"$logFile`" 2>&1"
$penchExit = $LASTEXITCODE

# Keep only the last 14 days of logs.
Get-ChildItem $logDir -Filter "scrape-*.log" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } |
    Remove-Item -Force

if ($tadobaExit -ne 0 -or $penchExit -ne 0) {
    exit 1
}
