[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 3001
)

$ErrorActionPreference = 'Stop'
Remove-Item Env:LOWBAND_EGRESS_ISOLATION -ErrorAction SilentlyContinue

$existingListeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
if ($existingListeners.Count -gt 0) {
    $owners = ($existingListeners | Select-Object -ExpandProperty OwningProcess -Unique) -join ', '
    throw "Le port $Port est déjà utilisé par le(s) processus $owners. Arrête ce backend ou choisis un autre port."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$node = (Get-Command node.exe -ErrorAction Stop).Source

# Verify the active Windows Firewall rule is still bound to this exact Playwright Chromium
# and still blocks the complete non-public address list before opening the API gate.
$policy = Import-PowerShellDataFile (Join-Path $PSScriptRoot 'chromium-egress-policy.psd1')
$disabledProfiles = @(Get-NetFirewallProfile | Where-Object { -not $_.Enabled })
if ($disabledProfiles.Count -gt 0) {
    throw 'Le pare-feu Windows doit être actif pour tous les profils avant de démarrer le moteur.'
}

$enginePath = Join-Path $repoRoot 'engine'
Push-Location $enginePath
try {
    $chromiumPath = (& $node -e "const { chromium } = require('./node_modules/playwright'); process.stdout.write(chromium.executablePath())").Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($chromiumPath) -or -not (Test-Path -LiteralPath $chromiumPath)) {
        throw 'Chromium Playwright est introuvable. Depuis engine, lance npx.cmd playwright install chromium puis réessaie.'
    }
} finally {
    Pop-Location
}

$rule = Get-NetFirewallRule -Name $policy.RuleName -ErrorAction SilentlyContinue
if (-not $rule -or $rule.Enabled -ne 'True' -or $rule.Direction -ne 'Outbound' -or $rule.Action -ne 'Block' -or $rule.Profile -ne 'Any') {
    throw 'La règle EGRESS Chromium est absente, désactivée ou ne bloque pas le trafic sortant sur tous les profils. Réinstalle-la depuis PowerShell administrateur.'
}

$applicationFilter = Get-NetFirewallApplicationFilter -AssociatedNetFirewallRule $rule
$addressFilter = Get-NetFirewallAddressFilter -AssociatedNetFirewallRule $rule
$portFilter = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $rule
if ([IO.Path]::GetFullPath($applicationFilter.Program) -ne [IO.Path]::GetFullPath($chromiumPath)) {
    throw 'La règle EGRESS cible une autre version ou un autre chemin Chromium. Réinstalle-la après la mise à jour de Playwright.'
}
if ($portFilter.Protocol -ne 'Any' -or $portFilter.RemotePort -ne 'Any') {
    throw 'La règle EGRESS ne couvre pas tous les protocoles et ports distants.'
}
$actualRemoteAddresses = @($addressFilter.RemoteAddress | ForEach-Object { [string]$_ })
$missingRanges = @($policy.RemoteAddresses | Where-Object { $_ -notin $actualRemoteAddresses })
$unexpectedRanges = @($actualRemoteAddresses | Where-Object { $_ -notin $policy.RemoteAddresses })
if ($missingRanges.Count -gt 0 -or $unexpectedRanges.Count -gt 0) {
    throw 'Les plages de la règle EGRESS ne correspondent plus à la politique LowBand Africa. Réinstalle-la.'
}

& $node (Join-Path $PSScriptRoot 'verify-chromium-egress.mjs')
if ($LASTEXITCODE -ne 0) {
    throw 'La vérification egress a échoué; le backend ne sera pas démarré avec Chromium déverrouillé.'
}

$env:LOWBAND_EGRESS_ISOLATION = 'verified'
$previousPort = $env:PORT
$env:PORT = [string]$Port
Push-Location (Join-Path $repoRoot 'backend')
try {
    & npm.cmd run dev
    exit $LASTEXITCODE
} finally {
    Pop-Location
    Remove-Item Env:LOWBAND_EGRESS_ISOLATION -ErrorAction SilentlyContinue
    if ($null -eq $previousPort) { Remove-Item Env:PORT -ErrorAction SilentlyContinue }
    else { $env:PORT = $previousPort }
}
