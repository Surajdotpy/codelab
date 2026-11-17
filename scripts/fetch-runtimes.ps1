# Prepares runtimes/ so the packaged app works on PCs with nothing installed.
#   runtimes/python       <- official Python embeddable zip
#   runtimes/mingw        <- w64devkit (GCC), trimmed to just the C/C++ compiler (~230 MB)
#   runtimes/limiter.exe  <- built here from scripts/limiter.c (memory / process caps for student programs)
# Run once on the teacher PC (needs internet):
#   powershell -ExecutionPolicy Bypass -File scripts\fetch-runtimes.ps1
param(
  [string]$PythonVersion = "3.12.8",
  [string]$W64Version = "2.11.0"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$rt = Join-Path $root "runtimes"
New-Item -ItemType Directory -Force $rt | Out-Null

# SHA-256 of every file we download. A download that doesn't match is rejected, so a tampered
# or corrupted file never ends up inside the installer. Pinned on 2026-11-17 from the official URLs.
# Changing a version? Download it, check it against the publisher (python.org signatures, the
# w64devkit release page), then add its hash here.
$KnownHashes = @{
  "python-3.12.8-embed-amd64.zip" = "8D3F33BE9EB810F23C102F08475AF2854E50484B8E4E06275E937BE61CE3D2FB"
  "w64devkit-x64-2.11.0.7z.exe"   = "54C2BB9962E8A30C8270E34C5EFC3D5FEE579F53087FA7D435B95FBBA2AF7B2B"
}

function Get-Verified([string]$Url, [string]$OutFile) {
  $name = Split-Path $Url -Leaf
  if (-not $KnownHashes.ContainsKey($name)) {
    throw "No known SHA-256 for $name. Verify the file yourself and add its hash to `$KnownHashes in this script."
  }
  Write-Host "Downloading $Url"
  Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
  $actual = (Get-FileHash $OutFile -Algorithm SHA256).Hash
  if ($actual -ne $KnownHashes[$name]) {
    Remove-Item $OutFile -Force
    throw "Checksum mismatch for $name (got $actual). The download was rejected."
  }
  Write-Host "  checksum OK"
}

# --- Python -------------------------------------------------------------
$py = Join-Path $rt "python"
if (Test-Path (Join-Path $py "python.exe")) {
  Write-Host "Python already present - skipping"
} else {
  $url = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-embed-amd64.zip"
  $zip = Join-Path $env:TEMP "codelab-python-embed.zip"
  Get-Verified $url $zip
  Expand-Archive -Path $zip -DestinationPath $py -Force
  Remove-Item $zip
  Write-Host "Python ready: $py"
}

# --- GCC / G++ (w64devkit, trimmed) -------------------------------------
$mingw = Join-Path $rt "mingw"
if (Test-Path (Join-Path $mingw "bin\g++.exe")) {
  Write-Host "MinGW already present - skipping"
} else {
  $work = Join-Path $env:TEMP "codelab-w64devkit"
  Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force $work | Out-Null
  $url = "https://github.com/skeeto/w64devkit/releases/download/v$W64Version/w64devkit-x64-$W64Version.7z.exe"
  $sfx = Join-Path $work (Split-Path $url -Leaf)
  Get-Verified $url $sfx
  Write-Host "Extracting..."
  & $sfx "-o$work\x" -y | Out-Null
  $src = Join-Path $work "x\w64devkit"
  if (-not (Test-Path "$src\bin\gcc.exe")) { throw "w64devkit extract failed: $src\bin\gcc.exe not found" }

  # Find the GCC version folder (e.g. 16.2.0) instead of hard-coding it.
  $gccLibexec = Get-ChildItem "$src\libexec\gcc\x86_64-w64-mingw32" -Directory | Select-Object -First 1
  $ver = $gccLibexec.Name

  Write-Host "Trimming to the C/C++ compiler only..."
  New-Item -ItemType Directory -Force "$mingw\bin", "$mingw\libexec\gcc\x86_64-w64-mingw32\$ver" | Out-Null
  foreach ($f in 'gcc.exe', 'g++.exe', 'as.exe', 'ld.exe') { Copy-Item "$src\bin\$f" "$mingw\bin\" }
  Get-ChildItem "$src\bin" -Filter *.dll | Copy-Item -Destination "$mingw\bin\"
  foreach ($f in 'cc1.exe', 'cc1plus.exe', 'collect2.exe', 'lto-wrapper.exe') {
    Copy-Item (Join-Path $gccLibexec.FullName $f) "$mingw\libexec\gcc\x86_64-w64-mingw32\$ver\"
  }
  Copy-Item "$src\include" "$mingw\include" -Recurse
  Copy-Item "$src\lib" "$mingw\lib" -Recurse

  $g = "$mingw\lib\gcc\x86_64-w64-mingw32\$ver"
  Remove-Item "$g\32", "$g\libgfortran.a", "$g\finclude", "$g\libquadmath.a" -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item "$mingw\lib\ccache", "$mingw\lib\pkgconfig" -Recurse -Force -ErrorAction SilentlyContinue
  # Keep only the C runtime and common Windows import libraries students might use.
  $keep = 'mingw32','mingwex','moldname','ucrt','msvcrt','mingwthrd','kernel32','user32','gdi32','advapi32','shell32','ws2_32','comdlg32','comctl32','ole32','oleaut32','winmm','winspool','uuid','pthread','winpthread','m','msvcr120','msvcr100','imm32','version','shlwapi','crypt32','wsock32','mswsock','iphlpapi','psapi','setupapi','bcrypt','ntdll','ucrtbase','gcc','gcc_s','stdc++'
  Get-ChildItem "$mingw\lib" -Filter *.a | Where-Object { $keep -notcontains ($_.BaseName -replace '^lib', '') } | Remove-Item -Force
  Get-ChildItem "$mingw\lib" -Filter *.la | Remove-Item -Force

  Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "GCC $ver ready: $mingw"
}

# --- limiter.exe (always rebuilt, so it matches scripts/limiter.c) --------
Write-Host "Building limiter.exe..."
$env:PATH = "$mingw\bin;$env:PATH"
& "$mingw\bin\gcc.exe" -O2 -s -municode -Wall -o (Join-Path $rt "limiter.exe") (Join-Path $PSScriptRoot "limiter.c")
if ($LASTEXITCODE -ne 0) { throw "Building limiter.exe failed" }
Write-Host "limiter.exe ready"

Write-Host "`nNow run:  npm test   (checks all languages and the safety limits)   then   npm run dist"
