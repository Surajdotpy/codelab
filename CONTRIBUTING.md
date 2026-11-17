# Contributing to CodeLab

Thanks for helping. CodeLab is a small offline coding playground for classrooms, so we
keep it **light, simple and easy to read**. Teachers and students may read this code.

Everyone taking part must follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help
- **Report a bug** or **suggest a feature**: [open an issue](https://github.com/Surajdotpy/codelab/issues/new/choose).
- **Improve the docs**: fix a typo, clarify a step, or translate the [user guide](docs/USER-GUIDE.md).
- **Write code**: pick an issue labelled `good first issue`, or one of the ideas below.

Ideas that fit the project:
- More languages (for example Java or Lua). See [Adding a language](#adding-a-language).
- Highlighter fixes in `highlight.js`, with a test in `scripts/test-highlight.js`.
- Translations of the interface, or friendlier error messages for beginners.
- A light theme, or a bigger-text accessibility option.

For anything large, **open an issue first** so we can agree on the approach before you spend time on it.

## Set up
You need Windows 10 or 11, [Node.js](https://nodejs.org) 20 or newer, and git.

```
git clone https://github.com/<your-username>/codelab.git
cd codelab
npm install
powershell -ExecutionPolicy Bypass -File scripts\fetch-runtimes.ps1   # downloads Python + GCC (~300 MB, once)
npm test        # should print "All passed" twice
npm start       # opens the app
```

## Making a change
1. **Fork** the repo on GitHub, then clone your fork (above).
2. Create a branch with a short name: `git checkout -b fix-tab-indent`
3. Make your change. Keep it focused on **one thing**.
4. Run `npm test`, then try it in the real app with `npm start`.
5. Commit with a clear message in the present tense, for example
   `Fix Tab key inserting 2 spaces in C` (what changed, not how).
6. Push your branch and open a **pull request** against `main`. Fill in the template.
7. The automatic checks (CI) must pass. A maintainer will review and may ask for changes.

Small pull requests get reviewed faster.

## How the code is organised
For the full picture (run flow, editor design, security model) read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
If you use an AI coding assistant, point it at [CLAUDE.md](CLAUDE.md). It lists the project's rules and gotchas.

| File | What it does |
|---|---|
| `index.html`, `style.css`, `renderer.js` | The window: tabs, editor, input box, output |
| `highlight.js` | Syntax colors (no dependencies; tested without Electron) |
| `preload.js` | The only bridge from the window to the computer (`run`, `save`, `open`) |
| `main.js` | Opens the window; handles run, save and open requests |
| `runner.js` | Writes the code to a temp folder, compiles C/C++, runs it with limits |
| `scripts/smoke.js` | Runs real programs in all 4 languages (`npm test`) |
| `scripts/test-highlight.js` | Tests for the highlighter |
| `scripts/fetch-runtimes.ps1` | Downloads Python and GCC into `runtimes/` |

## Adding a language
Each language touches a few small places. Use an existing one (for example `cpp`) as a model.

1. `runner.js`: add an entry to `languages` with the file name, an optional `compile` step,
   and a `run` step.
2. `index.html`: add a tab button with a matching `data-lang`.
3. `renderer.js`: add a starter program to `STARTERS` and a file name to `FILE_NAMES`.
4. `highlight.js`: add keyword and string rules for the language to `LANGS`.
5. `main.js`: add the file extension to `EXT` (used by Open and Save).
6. `scripts/smoke.js`: add test cases (hello, input, an error).
7. If it needs a tool that isn't bundled yet, download it in `scripts/fetch-runtimes.ps1` and
   add its license to `THIRD-PARTY-NOTICES.md`. **Mention the size increase in your pull request.**

## Rules for keeping it safe and light
- **No heavy dependencies.** The installer should stay small and the app should start fast.
- **Security matters.** Student code is not sandboxed, so don't loosen the limits in
  `runner.js` (time limit, output cap, no shell) or the Electron settings in `main.js`
  (`contextIsolation`, no `nodeIntegration`) without discussing it in an issue first.
- Don't commit `runtimes/`, `node_modules/` or `dist/`. They are build outputs.
- Don't commit personal data, such as real names or email addresses of students.

## Releases
Contributors don't publish releases. Maintainers do, by pushing a version tag. See
[docs/RELEASING.md](docs/RELEASING.md). Your change reaches users in the next release.

## Reporting a security problem
Please don't open a public issue. See [SECURITY.md](SECURITY.md).

## License
By contributing, you agree that your work is released under the [MIT License](LICENSE).
