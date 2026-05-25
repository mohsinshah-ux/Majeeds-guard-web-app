# Watches the project folder and pushes to GitHub after changes (debounced).
# Usage: npm run github:watch
# Requires: git remote configured, gh auth login done once.

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$debounceSeconds = 45
$lastPush = [datetime]::MinValue

function Sync-Git {
    $now = Get-Date
    if (($now - $lastPush).TotalSeconds -lt $debounceSeconds) { return }
    $script:lastPush = $now
    git add -A 2>$null
    $status = git status --porcelain
    if (-not $status) { return }
    $msg = "chore: auto-sync $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    git commit -m $msg 2>$null
    if ($LASTEXITCODE -eq 0) {
        git push 2>&1 | Out-Host
        Write-Host "[github:watch] Pushed at $msg"
    }
}

Write-Host "Watching $root for changes (debounce ${debounceSeconds}s). Ctrl+C to stop."
$watcher = New-Object System.IO.FileSystemWatcher $root
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
$watcher.Filter = "*.*"

$onChange = {
    Start-Sleep -Seconds 5
    Sync-Git
}

Register-ObjectEvent $watcher Changed -Action $onChange | Out-Null
Register-ObjectEvent $watcher Created -Action $onChange | Out-Null
Register-ObjectEvent $watcher Deleted -Action $onChange | Out-Null
Register-ObjectEvent $watcher Renamed -Action $onChange | Out-Null

while ($true) { Start-Sleep -Seconds 60 }
