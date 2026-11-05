param(
  [string]$CommitSha = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Config = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "app.config.json") | ConvertFrom-Json
$Version = [string]$Config.version

if ($Version -notmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') {
  throw "A stable SemVer version is required for a public release: $Version"
}
if ([string]$Config.repository.owner -ne "ttomohisa" -or [string]$Config.repository.name -ne "htmlapps-max-text-print") {
  throw "Repository mismatch in app.config.json."
}

$ActualCommit = (& git -C $Root rev-parse HEAD | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $ActualCommit -notmatch '^[0-9a-f]{40}$') { throw "Could not determine the source commit." }
if (-not $CommitSha) { $CommitSha = $ActualCommit }
if ($CommitSha -ne $ActualCommit) { throw "Release commit does not match the checked-out source." }

$Changelog = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "CHANGELOG.md")
$Pattern = '(?ms)^##\s+' + [regex]::Escape($Version) + '\s*-\s*[^\r\n]*\r?\n(?<notes>.*?)(?=^##\s+\d+\.\d+\.\d+|\z)'
$Match = [regex]::Match($Changelog, $Pattern)
if (-not $Match.Success -or -not $Match.Groups["notes"].Value.Trim()) {
  throw "CHANGELOG.md needs a nonempty section for version $Version."
}

function Get-Sha256([string]$Path) {
  $InputStream = [System.IO.File]::OpenRead($Path)
  $Sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return (($Sha.ComputeHash($InputStream) | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally {
    $Sha.Dispose()
    $InputStream.Dispose()
  }
}

$Prefix = "htmlapps-max-text-print-v$Version"
$Readable = "$Prefix.html"
$SelfExtract = "$Prefix.self-extract.html"
$Archive = "$Prefix.zip"
$ReleaseRoot = Join-Path $Root "release"
$BundleRoot = Join-Path $ReleaseRoot "_bundle"

if (Test-Path $ReleaseRoot) { Remove-Item -Recurse -Force $ReleaseRoot }
New-Item -ItemType Directory -Force -Path $BundleRoot | Out-Null

$Files = @(
  @("dist/index.html", $Readable),
  @("dist/index.self-extract.html", $SelfExtract),
  @("dist/dependency-manifest.json", "dependency-manifest.json"),
  @("dist/self-extract-manifest.json", "self-extract-manifest.json"),
  @("dist/build-size-report.json", "build-size-report.json"),
  @("README.md", "README.md"),
  @("README.ja.md", "README.ja.md"),
  @("APP_SPEC.md", "APP_SPEC.md"),
  @("CHANGELOG.md", "CHANGELOG.md"),
  @("LICENSE", "LICENSE"),
  @("THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md")
)

foreach ($Pair in $Files) {
  $Source = Join-Path $Root $Pair[0]
  if (-not (Test-Path $Source -PathType Leaf)) { throw "Release input is missing: $($Pair[0])" }
  if ((Get-Item $Source).Length -eq 0) { throw "Release input is empty: $($Pair[0])" }
  Copy-Item -LiteralPath $Source -Destination (Join-Path $BundleRoot $Pair[1])
}

Copy-Item (Join-Path $BundleRoot $Readable) (Join-Path $ReleaseRoot $Readable)
Copy-Item (Join-Path $BundleRoot $SelfExtract) (Join-Path $ReleaseRoot $SelfExtract)

$Provenance = @(
  "Repository: ttomohisa/htmlapps-max-text-print"
  "Version: $Version"
  "Commit: $CommitSha"
  "Source: https://github.com/ttomohisa/htmlapps-max-text-print/tree/$CommitSha"
  "Build: scripts/check-repository.ps1"
) -join [Environment]::NewLine
[System.IO.File]::WriteAllText((Join-Path $BundleRoot "RELEASE_PROVENANCE.txt"), $Provenance + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))

Add-Type -AssemblyName System.IO.Compression.FileSystem
$ZipPath = Join-Path $ReleaseRoot $Archive
[System.IO.Compression.ZipFile]::CreateFromDirectory($BundleRoot, $ZipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$HashLines = @()
foreach ($Name in @($Readable, $SelfExtract, $Archive)) {
  $HashLines += "$(Get-Sha256 (Join-Path $ReleaseRoot $Name))  $Name"
}
[System.IO.File]::WriteAllLines((Join-Path $ReleaseRoot "SHA256SUMS.txt"), [string[]]$HashLines, (New-Object System.Text.UTF8Encoding($false)))

$ReleaseNotes = @(
  "## Max Text Print v$Version"
  ""
  $Match.Groups["notes"].Value.Trim()
  ""
  "### Downloads"
  ""
  "- $Readable — readable standalone HTML."
  "- $SelfExtract — smaller self-extracting standalone HTML."
  "- $Archive — both HTML variants, manifests, bilingual docs, license and provenance."
  "- SHA256SUMS.txt — SHA-256 checksums for the three downloads."
  ""
  "### Verification"
  ""
  "Release source commit: $CommitSha."
  "This release is published only after repository checks and Chromium/PDF regressions pass on the exact main-branch commit."
  "Android and iOS native print dialogs have not been verified by this CI."
) -join [Environment]::NewLine
[System.IO.File]::WriteAllText((Join-Path $ReleaseRoot "RELEASE_NOTES.md"), $ReleaseNotes + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))

# Independently verify the package's contents and the top-level HTML checksums.
$Zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
  $Expected = @($Files | ForEach-Object { $_[1] }) + @("RELEASE_PROVENANCE.txt")
  $Actual = @($Zip.Entries | ForEach-Object { $_.FullName })
  if ($Expected.Count -ne $Actual.Count) { throw "Release ZIP entry count mismatch." }
  foreach ($Name in $Expected) {
    if ($Actual -cnotcontains $Name) { throw "Missing ZIP entry: $Name" }
  }
  foreach ($Name in @($Readable, $SelfExtract)) {
    $Entry = $Zip.GetEntry($Name)
    $Stream = $Entry.Open()
    $Sha = [System.Security.Cryptography.SHA256]::Create()
    try {
      $InsideHash = (($Sha.ComputeHash($Stream) | ForEach-Object { $_.ToString("x2") }) -join "")
    } finally {
      $Sha.Dispose()
      $Stream.Dispose()
    }
    if ($InsideHash -ne (Get-Sha256 (Join-Path $ReleaseRoot $Name))) {
      throw "The ZIP copy differs from the standalone download: $Name"
    }
  }
} finally {
  $Zip.Dispose()
}

Remove-Item -Recurse -Force $BundleRoot
Write-Host "[OK] v$Version release package verified for commit $CommitSha"
Write-Host "    $Readable"
Write-Host "    $SelfExtract"
Write-Host "    $Archive"
Write-Host "    SHA256SUMS.txt"
