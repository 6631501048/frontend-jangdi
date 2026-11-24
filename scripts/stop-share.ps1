$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$statePath = Join-Path $projectRoot '.password-recovery\share\session.json'
if (!(Test-Path -LiteralPath $statePath)) { Write-Output 'No share session found.'; exit 0 }
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
# Only stop processes recorded by this session, with matching names and creation times.
foreach ($record in @($state.processes | Select-Object -Skip 1) + @($state.processes | Select-Object -First 1)) {
  $process = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
  if ($process -and $process.ProcessName -eq $record.name -and [Math]::Abs(([DateTimeOffset]$process.StartTime).ToUnixTimeMilliseconds() - $record.startedAt) -lt 10000) {
    Stop-Process -Id $record.pid -ErrorAction SilentlyContinue
  }
}
$state.status = 'stopped'
$state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $statePath -Encoding UTF8
Write-Output 'Temporary link stopped. Your usual development servers were left running.'
