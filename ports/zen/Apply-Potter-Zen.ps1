<#
.SYNOPSIS
    Apply the Potter theme to Zen Browser (https://zen-browser.app).

.DESCRIPTION
    Zen is a Firefox fork, so it honours Firefox's legacy userChrome.css. This
    script copies the generated Potter flavor stylesheet into your Zen profile's
    `chrome/` folder, wires it up through `chrome/userChrome.css`, and enables
    `toolkit.legacyUserProfileCustomizations.stylesheets` via `user.js`.

    It finds the default profile from `%APPDATA%\zen\profiles.ini`, or you can
    point it at a specific profile with -ProfilePath. Existing userChrome.css /
    user.js files are backed up (.potter.bak) before being touched.

    Zen Mods (chrome/zen-themes.css) are left untouched — Potter rides alongside
    them via userChrome.css.

.PARAMETER Flavor
    parchment (light), quill (dark, default), or ink (deepest dark).

.PARAMETER ProfilePath
    Full path to a Zen profile folder. Defaults to the locked/default profile.

.PARAMETER AllProfiles
    Apply to every profile listed in profiles.ini.

.EXAMPLE
    .\Apply-Potter-Zen.ps1 -Flavor quill
#>
[CmdletBinding()]
param(
    [ValidateSet('parchment', 'quill', 'ink')]
    [string]$Flavor = 'quill',
    [string]$ProfilePath,
    [switch]$AllProfiles
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $here "potter-$Flavor.css"

if (-not (Test-Path $source)) {
    throw "Stylesheet not found: $source. Run ``npm run generate`` at the repo root first."
}

$script:InstallDefaultPath = $null

function Get-ZenProfiles {
    $ini = Join-Path $env:APPDATA 'zen\profiles.ini'
    if (-not (Test-Path $ini)) { throw "No Zen profiles.ini at $ini. Is Zen installed?" }
    $root = Split-Path -Parent $ini
    $tables = @()   # collect mutable hashtables; convert to objects after parsing
    $cur = $null
    $section = $null
    foreach ($line in Get-Content $ini) {
        if ($line -match '^\[(.+)\]') {
            $section = $matches[1]
            if ($section -like 'Profile*') { $cur = [ordered]@{ Section = $section }; $tables += $cur }
            else { $cur = $null }
            continue
        }
        if ($line -match '^\s*([^=\s]+)\s*=\s*(.+?)\s*$') {
            # Capture immediately — later -match/-like would clobber $matches.
            $key = $matches[1]; $val = $matches[2]
            # The [InstallXXXX] section's Default= names the actually-launched profile.
            if ($section -like 'Install*' -and $key -eq 'Default') {
                $script:InstallDefaultPath = $val
            }
            if ($null -ne $cur) { $cur[$key] = $val }
        }
    }
    $profiles = foreach ($t in $tables) {
        $rel = if ($t['IsRelative'] -eq '0') { $false } else { $true }
        $t['FullPath'] = if ($rel) { Join-Path $root $t['Path'] } else { $t['Path'] }
        $t['IsInstallDefault'] = ($t['Path'] -eq $script:InstallDefaultPath)
        [pscustomobject]$t
    }
    return $profiles
}

function Apply-ToProfile([string]$profileDir) {
    if (-not (Test-Path $profileDir)) { Write-Warning "Profile not found, skipping: $profileDir"; return }
    Write-Host "==> Profile: $profileDir" -ForegroundColor Cyan

    $chrome = Join-Path $profileDir 'chrome'
    if (-not (Test-Path $chrome)) { New-Item -ItemType Directory -Path $chrome | Out-Null }

    # Copy the flavor stylesheet into chrome/
    $dest = Join-Path $chrome "potter-$Flavor.css"
    Copy-Item $source $dest -Force
    Write-Host "    copied potter-$Flavor.css"

    # userChrome.css: add our @import (preserving anything already there)
    $userChrome = Join-Path $chrome 'userChrome.css'
    $importLine = "@import `"potter-$Flavor.css`";"
    $marker = '/* Potter theme (managed by Apply-Potter-Zen.ps1) */'
    if (Test-Path $userChrome) {
        $content = Get-Content $userChrome -Raw
        if ($content -notmatch [regex]::Escape($marker)) {
            Copy-Item $userChrome "$userChrome.potter.bak" -Force
            Write-Host "    backed up existing userChrome.css -> userChrome.css.potter.bak"
        }
        # strip any prior Potter import block, then prepend the current one
        $content = [regex]::Replace($content, [regex]::Escape($marker) + '.*?@import "potter-\w+\.css";\r?\n', '', 'Singleline')
        $new = "$marker`r`n$importLine`r`n`r`n" + $content.TrimStart()
    }
    else {
        $new = "$marker`r`n$importLine`r`n"
    }
    Set-Content -Path $userChrome -Value $new -Encoding UTF8
    Write-Host "    wrote userChrome.css (@import potter-$Flavor.css)"

    # user.js: enable legacy chrome stylesheets
    $userJs = Join-Path $profileDir 'user.js'
    $pref = 'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);'
    $existing = if (Test-Path $userJs) { Get-Content $userJs -Raw } else { '' }
    if ($existing -notmatch 'legacyUserProfileCustomizations\.stylesheets') {
        if ($existing) { Copy-Item $userJs "$userJs.potter.bak" -Force }
        Add-Content -Path $userJs -Value $pref -Encoding UTF8
        Write-Host "    enabled legacyUserProfileCustomizations.stylesheets in user.js"
    }
    else {
        Write-Host "    legacy stylesheets pref already present"
    }
}

if ($ProfilePath) {
    Apply-ToProfile $ProfilePath
}
else {
    $profiles = Get-ZenProfiles
    if ($AllProfiles) {
        foreach ($p in $profiles) { Apply-ToProfile $p.FullPath }
    }
    else {
        # Prefer the install-locked default (the profile Zen actually launches),
        # then the legacy Default=1, then the first profile.
        $target = ($profiles | Where-Object { $_.IsInstallDefault } | Select-Object -First 1)
        if (-not $target) { $target = ($profiles | Where-Object { $_.Default -eq '1' } | Select-Object -First 1) }
        if (-not $target) { $target = $profiles | Select-Object -First 1 }
        if (-not $target) { throw "No profiles found in profiles.ini." }
        Apply-ToProfile $target.FullPath
    }
}

Write-Host ""
Write-Host "Potter '$Flavor' applied. Fully restart Zen Browser to see it." -ForegroundColor Green
Write-Host "If nothing changes, confirm 'toolkit.legacyUserProfileCustomizations.stylesheets' is true in about:config." -ForegroundColor Yellow
