# Architecture

How CodeLab works today. For how to *use* it, see the [user guide](USER-GUIDE.md); for how to
*change* it, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Overview

CodeLab is a single Electron app. There is no server and no network access. Everything
runs on the PC.

```
┌─────────────────────────── Electron app ────────────────────────────┐
│                                                                     │
│  Window (renderer)            preload.js              main.js       │
│  index.html / style.css  ───►  codelab.run()   ───►  IPC handlers   │
│  renderer.js                   codelab.save()        run-code       │
│  highlight.js                  codelab.open()        save-file      │
│  (sandboxed, no Node)          (the only bridge)     open-file      │
│                                                          │          │
│                                                     runner.js       │
└──────────────────────────────────────────────────────────┼──────────┘
                                                           │ spawn (no shell)
                          ┌────────────────┬───────────────┼──────────────┐
                          ▼                ▼               ▼              ▼
                       python.exe     Electron as Node    gcc.exe        g++.exe
                       (bundled)      (JavaScript)        (bundled)      (bundled)
```

| Part | File(s) | Responsibility |
|---|---|---|
| Window | `index.html`, `style.css`, `renderer.js` | Tabs, editor, Input box, Output panel; remembers code per language |
| Highlighter | `highlight.js` | Turns source text into escaped HTML with `tok-*` classes |
| Bridge | `preload.js` | Exposes exactly three functions to the window |
| Main process | `main.js` | Creates the window; handles run, save and open requests |
| Runner | `runner.js` | Runs a program safely and returns its output |

## What happens when you press Run

1. `renderer.js` sends `{ lang, code, stdin }` through `window.codelab.run(...)`.
2. `preload.js` forwards it to the main process on the `run-code` channel.
3. `main.js` validates it (types only; the language is checked in the runner) and calls `runner.run(...)`.
4. `runner.js`:
   1. Creates a fresh temp folder (`codelab-XXXXXX` under the system temp directory).
   2. Writes `main.py`, `main.js`, `main.c` or `main.cpp`.
   3. **C and C++:** compiles with `gcc` or `g++` (20 s limit). On failure it returns the
      compiler's messages with `phase: "compile"`.
   4. Starts the program **through `limiter.exe`** with `spawn` and an argument array (no shell),
      passing only an allowlist of environment variables. It writes the Input box text to stdin and
      collects stdout and stderr.
   5. `limiter.exe` starts the program suspended, puts it in a Windows Job Object (256 MB memory,
      16 processes, kill-all on close, no crash dialogs, no clipboard), then lets it run.
   6. The runner stops it after **5 seconds**, or if combined output passes **64 KB**, using
      `taskkill /T` so the whole process tree goes.
   7. Deletes the temp folder shortly afterwards (a short delay, because Windows may still hold the `.exe`).

   Programs over 256 KB or input over 64 KB are refused before anything starts.
5. The result `{ stdout, stderr, exitCode, timedOut, phase, ms }` returns to the window, which shows
   stdout normally and stderr in red.

## Where the language tools come from

`runner.js` looks in `runtimes/` first and falls back to the PC's `PATH`.

| Language | Tool used | Notes |
|---|---|---|
| Python | `runtimes/python/python.exe` | Official embeddable build; runs with `-u` (unbuffered) and UTF-8 output. No `pip`, `tkinter` or `turtle` |
| JavaScript | The Electron executable itself, with `ELECTRON_RUN_AS_NODE=1` | Adds nothing to the download |
| C | `runtimes/mingw/bin/gcc.exe` | Compiled with `-lm`; output is `main.exe` in the temp folder |
| C++ | `runtimes/mingw/bin/g++.exe` | Output is `main.exe` in the temp folder |
| (all) | `runtimes/limiter.exe` | Built from `scripts/limiter.c` by `fetch-runtimes.ps1`. If it's missing (a bare dev setup), programs run without the Job Object limits and `scripts/smoke.js` fails |

When the bundled MinGW is present, its `bin` folder is put first on `PATH` for the child process
so `gcc` can find its helper programs and DLLs.

`runtimes/` is **not in git**. `scripts/fetch-runtimes.ps1` downloads Python and w64devkit, rejects
any download whose SHA-256 doesn't match the pinned value, trims w64devkit to just the C/C++ compiler
(about 233 MB instead of about 717 MB), and builds `limiter.exe`. The installer ships the folder as
`extraResources`.

## Security model

Goal: a classroom of beginners can run programs without hanging or crashing the PC. It is
**not** a defence against someone deliberately hostile.

| Protection | Where | Protects against |
|---|---|---|
| 5 s run limit, 20 s compile limit, 64 KB output cap, `taskkill /T` | `runner.js` | Endless loops, output floods, helpers outliving the limit |
| Job Object: 256 MB memory, 16 processes, kill-all on close, no crash dialogs, no clipboard/system settings | `scripts/limiter.c` | Memory bombs freezing the PC, fork bombs, orphaned processes |
| Environment allowlist | `runner.js` | Programs reading secrets from the teacher's environment |
| Size limits on code (256 KB) and input (64 KB) | `runner.js`, `main.js` | Huge payloads |
| `spawn` with an argument array, never a shell | `runner.js` | Command injection |
| Fresh temp folder per run, deleted afterwards | `runner.js` | Programs interfering with each other |
| `contextIsolation`, no `nodeIntegration`, `sandbox` (all renderers), no `webview`, no DevTools when packaged | `main.js` | The page getting direct access to Node or the file system |
| Navigation, redirects and new windows blocked | `main.js` | A dropped file or link replacing CodeLab's page |
| IPC accepted only from CodeLab's own `index.html` | `main.js` (`fromApp`) | Any other page using the bridge |
| All permission requests denied | `main.js` | Camera, microphone, notifications, devices |
| Content-Security-Policy: `'self'` only, no `eval`, no network, no objects or frames | `index.html` | Injected scripts or remote content |
| Preload exposes only `run`, `save`, `open`; handlers validate input | `preload.js`, `main.js` | Misuse of the bridge |
| Open/Save use native dialogs; the page never supplies a path | `main.js` | Reading or writing arbitrary paths |
| Pinned SHA-256 for downloaded runtimes; installer checksum in release notes | `fetch-runtimes.ps1`, `release.yml` | Tampered downloads |

**Not protected:** file and network access by the student's program. It runs with the signed-in
user's permissions and can touch that user's files. The advice is to use standard
(non-administrator) Windows accounts. See [SECURITY.md](../SECURITY.md).

## The editor

The editor is a plain `<textarea>` laid over a colored `<pre>`:

```
 .code-wrap (position: relative)
 ├── <pre id="highlight">   colored text, visible, ignores mouse
 └── <textarea id="code">   transparent text, receives typing, shows the caret
```

- On every edit, `renderer.js` re-renders the colors with `highlight(code, lang)` and rebuilds the line numbers.
- Scrolling the textarea copies its scroll position to the `<pre>` and the line-number gutter.
- **The two layers must have identical font, size, line height, padding and tab size.** If they differ, the caret drifts away from the visible text.
- The highlighter is a short list of regex rules per language (comments, strings, numbers, keywords, …).
  Earlier rules win. It escapes `&`, `<` and `>` before adding its own `<span class="tok-…">`
  wrappers. It runs in Node too, which is how `scripts/test-highlight.js` tests it without Electron.
- Tab inserts spaces, and Enter keeps the indent (adding more after `:` or `{`).

Saved state lives in the page's `localStorage` (`codelab.lang`, `codelab.code.<lang>`, `codelab.font`),
inside `%APPDATA%\codelab` for the Windows user.

## Packaging and releases

- `npm run dist` runs electron-builder and produces a **per-user NSIS installer**
  (`CodeLab-Setup-<version>.exe`, about 160 MB, about 570 MB installed). It needs no admin rights and
  adds a desktop shortcut and a Start menu entry.
- Only the files listed under `build.files` in `package.json` go into the app. If you add a source
  file the app needs, add it there too.
- Pushing a tag like `v1.1.0` triggers `.github/workflows/release.yml`, which runs the tests,
  builds the installer, and publishes it. See [RELEASING.md](RELEASING.md).
- `.github/workflows/ci.yml` runs the tests on every push and pull request.

## Testing

| Command | What it covers |
|---|---|
| `node scripts/test-highlight.js` | The highlighter: no characters lost, tokens, escaping, edge cases |
| `node scripts/smoke.js` | Real programs through `runner.js` in all four languages: input, errors, compile errors, timeout, output flood, `math.h`, `windows.h`, the C++ STL, C++17. Plus safety checks: memory bombs in Python, JavaScript and C, the process cap, fork bombs, orphaned children, environment leaks, oversized input, paths with spaces. Memory-bomb checks skip on a PC with under 1.5 GB free (never in CI) |

Both run with `npm test`. The UI itself has no automated tests; changes to it are checked by
running the app (and, for the editor, by comparing a screenshot's line numbers with the code).

## Why it is built this way

- **Electron, no backend:** the main process can launch the tools directly, which keeps one process, one installer and no ports.
- **Bundled tools:** the app works on a PC with nothing installed, which is the main requirement for school desktops.
- **Plain HTML/CSS/JS, own highlighter:** no framework or editor library keeps the app small and easy for teachers and students to read.
- **Input box, not interactive input:** the program runs to completion with its input given up front, which is simple and avoids half-running processes.

## Known limits and ideas
See [PROGRESS.md](../PROGRESS.md) for what's unverified and the ideas backlog.
