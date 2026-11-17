# Progress

_Last updated: 2026-11-17_

## Status
**Version 1.0.0 is built and published to GitHub as source. No release has been tagged yet,
so there is no downloadable installer on the Releases page.** The app works on the
developer PC. It hasn't yet been tried on a second PC.

## Done
- [x] Electron app with Python, JavaScript, C and C++ tabs, editor, Input box, Output panel
- [x] Runner with 5 s run limit, 20 s compile limit, 64 KB output cap, temp-folder cleanup
- [x] Bundled runtimes: Python 3.12 embeddable, trimmed w64devkit (GCC 16), Node via Electron
- [x] Syntax highlighting (own small colorizer, 10 tests), line numbers, auto-indent, zoom
- [x] Open / Save with native dialogs (tested with stubbed dialogs)
- [x] App icon
- [x] Per-user installer, `CodeLab-Setup-1.0.0.exe`, 125 MB (about 491 MB installed)
- [x] Smoke test: 12 programs across all 4 languages, passing with only the bundled tools
- [x] Open source: MIT license, third-party notices, contributing guide, code of conduct,
      security policy, issue forms and PR template
- [x] GitHub Actions: CI on every push and PR; release workflow on `v*` tags
- [x] Docs: README, user guide, architecture, releasing guide

## Not verified yet
- [ ] **Installer run on a second PC**, ideally one with no Python or GCC installed
- [ ] **CI workflow** has not run on GitHub yet. First run happens on a push or PR
- [ ] **Release workflow** has never run. It first runs when the first `v*` tag is pushed
- [ ] Silent install (`CodeLab-Setup-X.exe /S`) from the teacher section of the user guide
- [ ] Behavior on antivirus-managed school PCs (freshly compiled `.exe` files may be flagged)
- [ ] Behavior on Windows 10 specifically (developed and tested on Windows 11)

## Next up
1. Try the installer on a school PC, then tag `v1.0.0` (see [docs/RELEASING.md](docs/RELEASING.md)).
2. GitHub settings: workflow permissions to *Read and write*; enable private vulnerability
   reporting; add repository topics; enable Issues.
3. Fix whatever the first CI and release runs reveal.

## Ideas backlog
Not committed to. Open an issue if you want one.
- Light theme and a larger-text accessibility option
- More languages (Java, Lua)
- Interactive input (let a running program wait for typing) instead of the pre-filled Input box
- Multiple files per program
- Auto-update inside the app (needs a larger design; each update is about 125 MB)
- Code signing to remove the SmartScreen warning (needs a paid certificate)
- Translations of the interface
- Smaller installer (the GCC toolchain is about 230 MB of the install)

## Decisions and why
| Decision | Why |
|---|---|
| Electron with no separate backend | The 2-hour build goal and offline use. Electron's main process can launch the tools itself, so FastAPI wasn't needed |
| Bundle Python and GCC inside the app | Works on any PC with nothing installed, which is the main requirement for school desktops |
| w64devkit, trimmed to the C/C++ compiler | Newer GCC (16 instead of 6.3) and smaller on disk than the old MinGW (233 MB vs 351 MB) |
| Per-user NSIS installer, not a portable `.exe` | A portable `.exe` unpacks about 640 MB to a temp folder on every launch, which is slow |
| Own highlighter, no editor library | Keeps the app light. A few regex rules cover what beginners write |
| Input box rather than interactive input | Much simpler and safer. Programs run to completion with the input given up front |
| Not sandboxed | A real sandbox (VMs, containers) is too heavy for school PCs. Mitigated by limits and standard Windows accounts |
| MIT license | Simple and permissive, so schools and others can adopt it freely |
| Commits use the GitHub noreply address | Keeps personal email out of the public history |
| Day 1 course page stays out of the repo | It is private teaching material, not part of the app |
