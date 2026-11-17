# CodeLab: notes for Claude Code (and other AI helpers)

CodeLab is an offline Windows desktop app (Electron + plain HTML/CSS/JS) that runs
Python, JavaScript, C and C++ for classroom use. No framework, no bundler, no backend.
It bundles its own Python and GCC. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how
it fits together and [PROGRESS.md](PROGRESS.md) for current status.

## Commands
```
npm install
powershell -ExecutionPolicy Bypass -File scripts\fetch-runtimes.ps1   # once: downloads Python + GCC into runtimes/
npm test           # highlighter tests + a program in all 4 languages (needs runtimes/)
npm start          # run the app
npm run dist       # build the installer into dist\
npm run make-icon  # regenerate build/icon.png
```
Always finish a change with `npm test`. For UI changes also run the app.

## Gotchas (each one cost time once)
- **`ELECTRON_RUN_AS_NODE` is set inside VS Code terminals**, so `electron .` behaves like plain
  Node (`app` is undefined). Use `npm start`, which goes through `scripts/start.js` and clears it.
  To run any other script inside Electron, use `node scripts/start.js path/to/script.js`.
- A GUI Electron process on Windows **doesn't write to a pipe**. When scripting it, write results
  to a file and read the file.
- **The colored editor is two stacked layers**: a transparent `<textarea id="code">` over a
  `<pre class="highlight">`. They must have *identical* font, size, line height, padding and
  tab size, or the caret drifts from the visible text. Any CSS touching one needs the same for the
  other. A numeric check misses this, so take a screenshot and compare the line numbers to the code.
- **CSP forbids inline script and inline styles.** Style through classes (`tok-*`), not `style="..."`.
  `highlight.js` output goes into `innerHTML`, so it must keep escaping `&`, `<` and `>` first.
- Tests use the **bundled** tools in `runtimes/`. To prove the bundle is self-sufficient, run
  `scripts/smoke.js` with PATH reduced to `C:\Windows\System32;C:\Windows;<node dir>`.
- In Bash, heredocs and `echo` can swallow backslashes (`\n` becomes a real newline), which silently
  breaks test programs. Write files that contain `\n` or Windows paths with the Write tool.
- Windows only (`.ps1`, `.exe`, `windows.h`, paths). Don't add Linux/macOS code paths unasked.

## Security rules (do not weaken without the maintainer's say-so)
- `runner.js`: no shell (`spawn` with an argument array), 5 s run limit, 20 s compile limit, 64 KB
  output cap, `killTree` (taskkill /T) on timeout, environment allowlist, size limits on code/input,
  fresh temp dir per run, deleted afterwards. Programs run **through `runtimes/limiter.exe`**.
- `scripts/limiter.c`: Job Object with 256 MB memory, 16 processes, kill-on-close, no crash dialogs,
  UI restrictions. It's rebuilt by `fetch-runtimes.ps1`; rebuild by hand after editing it.
- `main.js`: `contextIsolation`, no `nodeIntegration`, `sandbox` (plus `app.enableSandbox()`), no
  webview, DevTools off when packaged; navigation/new windows blocked; permissions denied; every IPC
  handler checks `fromApp(e)` and validates input. Open/Save use native dialogs.
- `preload.js` exposes only `run`, `save`, `open`. Don't widen it casually.
- `fetch-runtimes.ps1` pins SHA-256 hashes. A new runtime version needs a verified new hash.
- Student code is **not sandboxed** (file and network access remain). Never describe CodeLab as
  sandboxed or secure against malicious code. Docs say to use a standard Windows account.

## Testing safety features without hurting the PC
- The memory-bomb checks in `scripts/smoke.js` fill memory up to the 256 MB cap. They skip below
  1.5 GB free RAM. **Check free memory before running them**: on a PC near its commit limit, filling
  memory has crashed other apps, including the coding agent's own session.
- Checks that start processes or compile can time out on a starved PC. Re-run when memory is back
  before treating a failure as a real bug.

## Repository etiquette
- **Pushing publishes to a public repo.** Ask before every push. Never force-push.
  **Never push a `v*` tag without explicit approval.** It triggers the release workflow and publishes an installer.
- Commit identity is set per-repo to the GitHub **noreply** address. Never use or print a real email
  address, and never put personal data in commits, docs or examples.
- Never commit `runtimes/`, `node_modules/`, `dist/`, or `codexx_codelab_day1.html` (private
  course material, git-ignored).
- Keep it light: no new dependency unless it clearly earns its weight. The installer is about 160 MB.
- Match the existing style: small files, plain JS, comments that say *why*.

## When behavior changes, update
`README.md` (features), `docs/USER-GUIDE.md` (anything a student sees), `CHANGELOG.md` (under
Unreleased), `PROGRESS.md` (status), and `docs/ARCHITECTURE.md` (if structure changes).
Releases: see [docs/RELEASING.md](docs/RELEASING.md).
