[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Ouvrez PowerShell comme administrateur, puis relancez ce script.'
}

$policy = Import-PowerShellDataFile (Join-Path $PSScriptRoot 'chromium-egress-policy.psd1')
Get-NetFirewallRule -Group $policy.RuleGroup -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule
Write-Host 'Regles reseau LowBand Africa supprimees. Lanalyse du backend restera verrouillee.'
