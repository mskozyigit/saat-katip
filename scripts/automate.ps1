# ============================================================================
# Saat Katip -> Otomasyon Motoru Wrapper
# ============================================================================
# Bu dosya sadece ../otomasyon/pipeline.ps1 motorunu cagirir.
# Tum pipeline mantigi otomasyon/pipeline.ps1 icindedir.
# ============================================================================

param(
    [string]$Goal,
    [switch]$SkipWait,
    [switch]$ContinueOnError,
    [switch]$DryRun,
    [switch]$Auto
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$otomasyonDir = Resolve-Path "$scriptDir\..\..\otomasyon"
$enginePath = Join-Path $otomasyonDir "pipeline.ps1"

if (-not (Test-Path $enginePath)) {
    Write-Host "HATA: Otomasyon motoru bulunamadi!" -ForegroundColor Red
    Write-Host "  Beklenen: $enginePath" -ForegroundColor Red
    exit 1
}

$projectRoot = Resolve-Path "$scriptDir\.."

$pwshArgs = @("-ExecutionPolicy", "Bypass", "-File", $enginePath, "-ProjectPath", $projectRoot)
if ($Goal)            { $pwshArgs += @("-Goal", $Goal) }
if ($SkipWait)        { $pwshArgs += "-SkipWait" }
if ($ContinueOnError) { $pwshArgs += "-ContinueOnError" }
if ($DryRun)          { $pwshArgs += "-DryRun" }
if ($Auto)            { $pwshArgs += "-Auto" }

& pwsh @pwshArgs
exit $LASTEXITCODE
