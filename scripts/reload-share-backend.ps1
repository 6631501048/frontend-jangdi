param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$projectRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$statePath=Join-Path $projectRoot '.password-recovery\share\session.json'
$state=Get-Content -LiteralPath $statePath -Raw|ConvertFrom-Json
if($state.controlPort -ne 5181 -or $state.controlToken -notmatch '^[a-f0-9]{64}$'){throw 'This older share session must be restarted once before backend reload is available.'}
$record=$state.processes[0]
$supervisor=Get-Process -Id $record.pid -ErrorAction SilentlyContinue
if(!$supervisor -or $supervisor.ProcessName -ne $record.name -or [Math]::Abs(([DateTimeOffset]$supervisor.StartTime).ToUnixTimeMilliseconds()-$record.startedAt) -ge 10000){throw 'Share session is not running.'}
if(!$CheckOnly){
 $result=Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:5181/reload-backend' -Headers @{Authorization="Bearer $($state.controlToken)"} -TimeoutSec 70
 if($result.status -ne 'ok'){throw 'Backend did not confirm reload.'}
}
Write-Output "Test backend ready; tunnel URL unchanged: $($state.url)"
