# Progress

_Last updated: 2026-11-17_

## Status
**Version 1.0.0 is built with the security hardening, on the `security-hardening` branch.** All
automated tests pass on the developer PC. No release has been tagged yet, so there is no download
on the Releases page. It hasn't been tried on a second PC.

## Done
- [x] Electron app with Python, JavaScript, C and C++ tabs, editor, Input box, Output panel
- [x] Bundled runtimes: Python 3.12 embeddable, trimmed w64devkit (GCC 16), Node via Electron
- [x] Syntax highlighting (own small colorizer, 10 tests), line numbers, auto-indent, zoom
- [x] Open / Save with native dialogs (tested with stubbed dialogs)
- [x] App icon; per-user installer `CodeLab-Setup-1.0.0.exe`, about 160 MB (about 570 MB installed)
- [x] Open source: MIT license, third-party notices, contributing guide, code of conduct, security
      policy, issue forms, PR template, CODEOWNERS, Dependabot
- [x] GitHub Actions: CI on every push and PR (read-only token); release workflow on `v*` tags,
      with installer SHA-256 in the release notes
- [x] Docs: README, user guide, architecture, releasing guide, CLAUDE.md, changelog

### Security hardening (2026-11-17)
- [x] `limiter.exe`: every program runs in a Windows Job Object (256 MB memory, 16 processes,
      kill-all on exit, no crash dialogs, no clipboard)
- [x] Runner: process-tree kill at the time limit, environment allowlist, size limits on code/input
- [x] Window: navigation/redirects/new windows blocked, IPC only from CodeLab's own page, permissions
      denied, all renderers sandboxed, DevTools off when packaged, stricter CSP
- [x] Electron 33 → 45, electron-builder 25 → 26 (`npm audit` findings)
- [x] Downloads verified against pinned SHA-256 checksums

## Verified on the developer PC (2026-11-17)
- `npm test`: 10 highlighter tests, 12 language checks, 13 safety checks: all pass, none skipped
- Window protections attacked under Electron 45 (navigation, `window.open`, permissions, `eval`,
  `fetch`, a rogue page using the bridge, Node access): all blocked; all 4 languages still run
- Packaged app (`dist/win-unpacked`): bundled tools, limiter and JavaScript via `CodeLab.exe` work;
  the app starts
- `fetch-runtimes.ps1`: verified Python download and limiter build; a wrong checksum is rejected

## Not verified yet
- [ ] **The installer on a second PC**, ideally one with no Python or GCC installed
- [ ] Save and Open with the **real** file dialogs (only tested with stubs)
- [ ] The full w64devkit download path of `fetch-runtimes.ps1` (same checksum code; CI will run it)
- [ ] **CI and release workflows on GitHub**: CI runs on the next push; release on the first `v*` tag
- [ ] Silent install (`CodeLab-Setup-X.exe /S`)
- [ ] Antivirus-managed school PCs; Windows 10 specifically (tested on Windows 11)

## Next up
1. Install the new build over the old one and try each language, Save and Open.
2. Push the `security-hardening` branch and merge it into `main` once CI passes.
3. GitHub settings from the maintainer checklist in [SECURITY.md](SECURITY.md).
4. Try the installer on a school PC, then tag `v1.0.0` (see [docs/RELEASING.md](docs/RELEASING.md)).

## Ideas backlog
Not committed to. Open an issue if you want one.
- Low-integrity mode in `limiter.exe`, so programs can't change files outside their temp folder
- Light theme and a larger-text accessibility option
- More languages (Java, Lua)
- Interactive input instead of the pre-filled Input box
- Multiple files per program
- Auto-update inside the app (needs a larger design; each update is about 160 MB)
- Code signing to remove the SmartScreen warning (needs a paid certificate)
- Translations of the interface
- Smaller installer (the GCC toolchain is about 230 MB of the install)

## Decisions and why
| Decision | Why |
|---|---|
| Electron with no separate backend | The 2-hour build goal and offline use. Electron's main process can launch the tools itself |
| Bundle Python and GCC inside the app | Works on any PC with nothing installed, the main requirement for school desktops |
| w64devkit, trimmed to the C/C++ compiler | Newer GCC (16 instead of 6.3) and smaller than the old MinGW (233 MB vs 351 MB) |
| Per-user NSIS installer, not a portable `.exe` | A portable `.exe` unpacks the whole app to a temp folder on every launch, which is slow |
| Own highlighter, no editor library | Keeps the app light. A few regex rules cover what beginners write |
| Input box rather than interactive input | Simpler and safer. Programs run to completion with the input given up front |
| Job Object limits, not a full sandbox | Stops the realistic classroom problems (freezes, fork bombs, orphans) at almost no size cost. A VM-based sandbox is too heavy for school PCs |
| 256 MB memory cap per program | Far above what beginner programs need, small enough not to starve a 4 GB PC |
| Electron upgraded to 45 despite a bigger installer | Electron is the browser engine that ships to students. Staying on an old version means known vulnerabilities |
| MIT license | Simple and permissive, so schools and others can adopt it freely |
| Commits use the GitHub noreply address | Keeps personal email out of the public history |
| Day 1 course page stays out of the repo | It is private teaching material, not part of the app |
