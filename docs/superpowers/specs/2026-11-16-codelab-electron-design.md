# CodeLab — Offline Coding Playground (Electron) — Design

> **Historical document.** This is the original design from 2026-11-16, kept for context.
> Some details have changed since (the installer is now a per-user NSIS installer instead of
> a portable `.exe`, the C/C++ compiler is a trimmed w64devkit, and syntax highlighting,
> Open/Save and releases were added). For how things work **now**, read
> [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Goal
One lightweight Windows desktop app where Class 6–8 students write and run
Python, JavaScript, C and C++ offline, on every school desktop.

## Architecture
- **Renderer** (`index.html`, `style.css`, `renderer.js`): language selector,
  textarea editor with line numbers + Tab, stdin box, Run (Ctrl+Enter),
  output panel (stderr red), starter template per language.
- **Preload** (`preload.js`): exposes only `codelab.run({lang, code, stdin})`.
  `contextIsolation: true`, `nodeIntegration: false`.
- **Main** (`main.js`): window + IPC handler calling the runner.
- **Runner** (`runner.js`, plain Node, testable without Electron):
  writes code to a per-run temp dir, compiles (C/C++) then runs with
  `spawn` (args array, no shell). 5 s timeout per step, 64 KB output cap,
  temp dir removed afterwards. Returns `{stdout, stderr, exitCode, timedOut, phase}`.

## Runtime resolution (bundled first, then PATH)
| Lang | Bundled path (`runtimes/`) | Fallback |
|---|---|---|
| JS | Electron's own binary with `ELECTRON_RUN_AS_NODE=1` | `node` |
| Python | `runtimes/python/python.exe` (embeddable zip) | `python` |
| C / C++ | `runtimes/mingw/bin/gcc.exe` / `g++.exe` | `gcc` / `g++` |

## Distribution
electron-builder **portable** `.exe`; `runtimes/` shipped as `extraResources`.
`scripts/fetch-runtimes.ps1` downloads Python embeddable + portable MinGW.

## Testing
`scripts/smoke.js` runs hello + stdin-echo programs in all 4 languages and
checks a timeout case. Must pass before distribution.

## Non-goals
Real sandboxing, multi-file projects, REPL, syntax highlighting, accounts.
