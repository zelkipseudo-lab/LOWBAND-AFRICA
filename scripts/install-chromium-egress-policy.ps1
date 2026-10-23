[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$policy = Import-PowerShellDataFile (Join-Path $PSScriptRoot 'chromium-egress-policy.psd1')
$ruleGroup = $policy.RuleGroup
$ruleName = $policy.RuleName

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Ouvrez PowerShell comme administrateur, puis relancez ce script.'
}
$disabledProfiles = @(Get-NetFirewallProfile | Where-Object { -not $_.Enabled })
if ($disabledProfiles.Count -gt 0) {
    $names = ($disabledProfiles | ForEach-Object Name) -join ', '
    throw "Le pare-feu Windows est désactivé pour le(s) profil(s) : $names. Active-le avant de continuer."
}

$remoteAddresses = $policy.RemoteAddresses

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$enginePath = Join-Path $repoRoot 'engine'
$node = (Get-Command node.exe -ErrorAction Stop).Source
Push-Location $enginePath
try {
    $chromiumPath = (& $node -e "const { chromium } = require('./node_modules/playwright'); process.stdout.write(chromium.executablePath())").Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($chromiumPath) -or -not (Test-Path -LiteralPath $chromiumPath)) {
        throw 'Chromium Playwright est introuvable. Depuis engine, lance npx.cmd playwright install chromium puis réessaie.'
    }
} finally {
    Pop-Location
}

Get-NetFirewallRule -Group $ruleGroup -ErrorAction SilentlyContinue | Remove-NetFirewallRule
try {
    New-NetFirewallRule `
        -Name $ruleName `
        -DisplayName 'LowBand Africa - bloquer les plages IP non publiques pour Chromium' `
        -Group $ruleGroup `
        -Direction Outbound `
        -Action Block `
        -Program $chromiumPath `
        -Protocol Any `
        -RemoteAddress $remoteAddresses `
        -Profile Any `
        -Enabled True `
        -ErrorAction Stop | Out-Null
} catch {
    throw "Impossible de créer la règle Windows Firewall LowBand Africa : $($_.Exception.Message)"
}

$rule = Get-NetFirewallRule -Name $ruleName -ErrorAction Stop
$applicationFilter = Get-NetFirewallApplicationFilter -AssociatedNetFirewallRule $rule
$addressFilter = Get-NetFirewallAddressFilter -AssociatedNetFirewallRule $rule
if ($rule.Enabled -ne 'True' -or $rule.Direction -ne 'Outbound' -or $rule.Action -ne 'Block' -or
    $applicationFilter.Program -ne $chromiumPath -or $addressFilter.RemoteAddress.Count -lt 20) {
    throw 'La règle Windows Firewall créée ne correspond pas à la politique attendue.'
}

Write-Host 'Règle installée pour le Chromium Playwright :' $chromiumPath
Write-Host ''
Write-Host 'La règle est installée. Ouvre ensuite un PowerShell normal et lance le démarrage vérifié :'
Write-Host 'cd D:\LowBand_Africa\backend'
Write-Host '..\scripts\start-backend-with-verified-egress.ps1'
Write-Host ''
Write-Host 'Le demarrage teste Chromium sans privileges administrateur avant d activer le verrou pour ce processus.'
