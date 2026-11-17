# Contributing to CodeLab

Thanks for helping! CodeLab is a small offline coding playground for classrooms,
so we keep it **light, simple and easy to read**. Teachers and students may read
this code.

## Set up
You need Windows 10/11, [Node.js](https://nodejs.org) 20 or newer, and git.

```
git clone <this repo's URL>
cd codeLab
npm install
powershell -ExecutionPolicy Bypass -File scripts\fetch-runtimes.ps1   # downloads Python + GCC (~300 MB)
npm test        # must print "All passed" twice
npm start       # opens the app
```

## Before you open a pull request
1. `npm test` passes. It runs the highlighter tests and runs a program in all 4 languages.
2. You tried your change in the real app (`npm start`).
3. The pull request does one thing and says why.

## Good first contributions
- More languages (for example Java or Lua). `runner.js` has one entry per language.
- Highlighter fixes in `highlight.js`. Add a case to `scripts/test-highlight.js` too.
- Translations of the interface, or classroom-friendly error messages.
- A light theme.

## Please keep in mind
- **No heavy dependencies.** The app should stay small and start fast.
- **Security matters.** Student code is not sandboxed, so never loosen the limits in
  `runner.js` (time limit, output cap, no shell) or the settings in `main.js`
  (`contextIsolation`, no `nodeIntegration`) without discussing it first.
- Do not commit `runtimes/`, `node_modules/` or `dist/`. They are build outputs.

## Reporting bugs
Open an issue with your Windows version, the language, the code you ran, and what you
expected vs. what happened. For a security problem, please contact the maintainers
privately instead of opening a public issue.

By contributing, you agree that your work is released under the MIT license.
