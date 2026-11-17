# CodeLab

**An offline coding playground for classrooms.** Write and run **Python, JavaScript, C and
C++** in one lightweight Windows app. No internet, no Docker, nothing else to install.

<p align="center"><img src="build/icon.png" alt="CodeLab icon" width="96"></p>

## Download

Get the installer from the **[latest release](https://github.com/Surajdotpy/codelab/releases/latest)**,
run it, and open **CodeLab** from the desktop shortcut.

- Needs 64-bit **Windows 10 or 11** and about 500 MB of disk space.
- Installs for your own account, so no administrator is needed.
- Windows may warn that the app is unsigned. Click **More info**, then **Run anyway**.

## Features
- Python, JavaScript, C and C++ in one window; Run with the button or **Ctrl+Enter**
- Syntax colors, line numbers, auto-indent, Tab key, **Ctrl +/−** to zoom
- Input box for programs that read from the keyboard (`input()`, `scanf`, `cin`)
- **Open** (Ctrl+O) and **Save** (Ctrl+S) program files; your last code in each language is remembered
- Each program is stopped after 5 seconds and limited to 64 KB of output
- Works fully offline. Python, the C/C++ compiler and Node.js are bundled inside the app

## Documentation

| Read this | If you are… |
|---|---|
| [User guide](docs/USER-GUIDE.md) | a student or teacher: installing, running programs, giving input, troubleshooting, setting up many PCs |
| [Contributing](CONTRIBUTING.md) | a developer who wants to fix a bug, add a feature, or add a language |
| [Releasing](docs/RELEASING.md) | a maintainer publishing a new version (it's automatic) |
| [Security policy](SECURITY.md) | reporting a vulnerability, or wondering how safe student code is |
| [Third-party notices](THIRD-PARTY-NOTICES.md) | checking the licenses of the bundled Python, Electron and GCC |
| [Code of conduct](CODE_OF_CONDUCT.md) | taking part in the project |

## Run from source

You need Windows 10 or 11, [Node.js](https://nodejs.org) 20 or newer, and git.

```
git clone https://github.com/Surajdotpy/codelab.git
cd codelab
npm install
powershell -ExecutionPolicy Bypass -File scripts\fetch-runtimes.ps1   # downloads Python + GCC, once
npm start        # opens the app
npm test         # runs the highlighter tests and a program in every language
npm run dist     # builds the installer into dist\
```

## How it works

| File | Job |
|---|---|
| `index.html`, `style.css`, `renderer.js` | The screen: language tabs, editor, input box, output |
| `highlight.js` | Small syntax colorizer (tested by `scripts/test-highlight.js`) |
| `preload.js` | The only bridge from the screen to the computer: `codelab.run/save/open()` |
| `main.js` | Opens the window, receives run, save and open requests |
| `runner.js` | Saves code to a temp folder, compiles C/C++, runs it with a 5 s limit |

The app is built with Electron. JavaScript runs on the Node.js engine inside Electron, Python
is the official embeddable build, and C/C++ use GCC from [w64devkit](https://github.com/skeeto/w64devkit).
`scripts/fetch-runtimes.ps1` downloads and trims them.

## Safety

Each run is limited to 5 seconds and 64 KB of output. Student programs run with the same
permissions as the signed-in Windows user. **This is not a sandbox**, so use a standard
(non-administrator) Windows account on lab PCs. Details are in [SECURITY.md](SECURITY.md).

## License

CodeLab is released under the [MIT License](LICENSE). The installer bundles Python, Electron
and GCC, which have their own licenses (see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)).
