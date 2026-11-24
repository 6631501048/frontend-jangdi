$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$shareDirectory = Join-Path $projectRoot '.password-recovery\share'
$statePath = Join-Path $shareDirectory 'session.json'
if (Test-Path -LiteralPath $statePath) {
  $existing = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
  if ($existing.status -in @('ready','starting','degraded')) {
    $alive = Get-Process -Id $existing.processes[0].pid -ErrorAction SilentlyContinue
    if ($alive -and [Math]::Abs(([DateTimeOffset]$alive.StartTime).ToUnixTimeMilliseconds() - $existing.processes[0].startedAt) -lt 10000) {
      Write-Output "Share session already running: $($existing.url)"
      if ($existing.status -eq 'degraded') { Write-Output 'The public link is unavailable. Run scripts/stop-share.ps1, then start again.' }
      exit 0
    }
  }
}
New-Item -ItemType Directory -Force -Path $shareDirectory | Out-Null
$nodeExecutable = (Get-Command node).Source
$runner = Join-Path $PSScriptRoot 'share-session.cjs'
Start-Process -FilePath $nodeExecutable -ArgumentList @('"' + $runner + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $shareDirectory 'runner.log') -RedirectStandardError (Join-Path $shareDirectory 'runner-error.log') | Out-Null
Write-Output 'Preparing the temporary link. Progress: .password-recovery/share/session.json'
