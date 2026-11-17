const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { createRunner } = require('./runner');

// Packaged: runtimes live in resources/runtimes. Dev: ./runtimes.
const runtimesDir = app.isPackaged
  ? path.join(process.resourcesPath, 'runtimes')
  : path.join(__dirname, 'runtimes');

// JavaScript runs on Electron's own built-in Node — nothing extra to ship.
const runner = createRunner({
  runtimesDir,
  jsRuntime: { cmd: process.execPath, env: { ELECTRON_RUN_AS_NODE: '1' } },
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    title: 'CodeLab',
    backgroundColor: '#1e1f24',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile('index.html');
}

ipcMain.handle('run-code', async (_e, req) => {
  if (!req || typeof req.code !== 'string' || typeof req.lang !== 'string') {
    return { stdout: '', stderr: 'Bad request', exitCode: -1, phase: 'setup' };
  }
  return runner.run({ lang: req.lang, code: req.code, stdin: String(req.stdin || '') });
});

// --- Save / Open: the user picks the file in a native dialog; the page never sees paths.
const EXT = { python: 'py', javascript: 'js', c: 'c', cpp: 'cpp' };
const MAX_OPEN_BYTES = 1024 * 1024;

ipcMain.handle('save-file', async (e, req) => {
  try {
    const ext = EXT[req && req.lang];
    if (!ext || typeof req.code !== 'string') return { error: 'Bad request' };
    const r = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
      defaultPath: 'main.' + ext,
      filters: [{ name: req.lang, extensions: [ext] }, { name: 'All files', extensions: ['*'] }],
    });
    if (r.canceled || !r.filePath) return { canceled: true };
    fs.writeFileSync(r.filePath, req.code, 'utf8');
    return { ok: true, name: path.basename(r.filePath) };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('open-file', async (e, req) => {
  try {
    const ext = EXT[req && req.lang];
    if (!ext) return { error: 'Bad request' };
    const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
      properties: ['openFile'],
      filters: [{ name: req.lang, extensions: [ext] }, { name: 'All files', extensions: ['*'] }],
    });
    if (r.canceled || !r.filePaths.length) return { canceled: true };
    const file = r.filePaths[0];
    if (fs.statSync(file).size > MAX_OPEN_BYTES) return { error: 'File is too big (limit 1 MB)' };
    return { ok: true, name: path.basename(file), code: fs.readFileSync(file, 'utf8') };
  } catch (err) { return { error: err.message }; }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on('window-all-closed', () => app.quit());
