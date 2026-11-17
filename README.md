# CodeLab

An offline coding playground for running Python, JavaScript, C and C++ on
Windows, all in one app. Built with Electron, HTML, CSS and JavaScript.

## Features
- Python, JavaScript, C and C++ in one window; Run with the button or **Ctrl+Enter**
- Syntax colors, line numbers, auto-indent, Tab key, **Ctrl +/−** to zoom
- Input box for programs that read from the keyboard (`input()`, `scanf`, `cin`)
- **Open** (Ctrl+O) and **Save** (Ctrl+S) program files; the last code in each language is remembered
- Works fully offline. No Docker, no internet, nothing to install separately

## Requirements on the school PCs
64-bit **Windows 10 or 11**. Nothing else: Python, JavaScript and the C/C++ compiler are
bundled inside the app. About 500 MB of disk space.

## Run in development
```
npm install
npm start        # opens the app (uses Python/GCC installed on this PC)
npm test         # smoke test: all 4 languages, errors, timeout
```

## Build for school desktops
1. `powershell -ExecutionPolicy Bypass -File scripts\fetch-runtimes.ps1`
   downloads portable Python and GCC (w64devkit, trimmed) into `runtimes/`.
2. `npm test`: must show **All passed** (it now uses the bundled runtimes).
3. `npm run dist` builds `dist\CodeLab-Setup-1.0.0.exe`, a per-user installer (no admin rights needed).
4. Copy the installer to each desktop (USB stick or network share) and run it once. It adds a
   desktop shortcut, and the app then starts instantly. No internet needed.

Alternative: `npm run dist:portable` builds a single no-install `.exe`, but it unpacks
~640 MB to a temp folder on every launch, so it starts slowly.

## How it works
| File | Job |
|---|---|
| `index.html`, `style.css`, `renderer.js` | The screen: language tabs, editor, input box, output |
| `highlight.js` | Small syntax colorizer (tested by `scripts/test-highlight.js`) |
| `preload.js` | The only bridge from the screen to the computer: `codelab.run/save/open()` |
| `main.js` | Opens the window, receives run, save and open requests |
| `runner.js` | Saves code to a temp folder, compiles C/C++, runs it with a 5 s limit |

JavaScript runs on the Node.js engine built into Electron, so it needs no extra download.

## Contributing and license
Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).
CodeLab is released under the [MIT License](LICENSE). The installer bundles Python, Electron
and GCC, which have their own licenses: see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Safety notes
Each run is limited to 5 seconds and 64 KB of output. Student programs run with the
same permissions as the logged-in user. This is not a sandbox, so use a restricted
student Windows account on lab PCs.
