# Prepares runtimes/ so the packaged app works on PCs with nothing installed.
#   runtimes/python  <- official Python embeddable zip
#   runtimes/mingw   <- w64devkit (GCC), trimmed to just the C/C++ compiler (~230 MB)
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

# --- Python -------------------------------------------------------------
$py = Join-Path $rt "python"
if (Test-Path (Join-Path $py "python.exe")) {
  Write-Host "Python already present - skipping"
} else {
  $url = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-embed-amd64.zip"
  $zip = Join-Path $env:TEMP "codelab-python-embed.zip"
  Write-Host "Downloading $url"
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
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
  $sfx = Join-Path $work "w64devkit.7z.exe"
  $url = "https://github.com/skeeto/w64devkit/releases/download/v$W64Version/w64devkit-x64-$W64Version.7z.exe"
  Write-Host "Downloading $url (about 65 MB)"
  Invoke-WebRequest -Uri $url -OutFile $sfx -UseBasicParsing
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

Write-Host "`nNow run:  npm test   (checks all languages)   then   npm run dist"
