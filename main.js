const { app, BrowserWindow, ipcMain, Menu, dialog, session } = require('electron');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
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

// Every renderer is sandboxed, not only the main window.
app.enableSandbox();

const INDEX_PATH = path.join(__dirname, 'index.html');

// IPC requests are only accepted from our own index.html. If anything else ever loaded in a
// window (a dropped file, a link), it could otherwise call run/save/open through the preload.
function fromApp(event) {
  try {
    const url = new URL(event.senderFrame.url);
    return url.protocol === 'file:' && path.normalize(fileURLToPath(url)).toLowerCase() === INDEX_PATH.toLowerCase();
  } catch {
    return false;
  }
}

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
      webviewTag: false,
      spellcheck: false,
      devTools: !app.isPackaged, // students can't open DevTools in the installed app
    },
  });
  win.loadFile(INDEX_PATH);
}

// Lock down every web page Electron creates: no navigation away from index.html (this also stops
// a dropped file from replacing the app), no new windows, no <webview>.
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (e) => e.preventDefault());
  contents.on('will-redirect', (e) => e.preventDefault());
  contents.on('will-attach-webview', (e) => e.preventDefault());
});

ipcMain.handle('run-code', async (e, req) => {
  if (!fromApp(e) || !req || typeof req.code !== 'string' || typeof req.lang !== 'string') {
    return { stdout: '', stderr: 'Bad request', exitCode: -1, phase: 'setup' };
  }
  return runner.run({ lang: req.lang, code: req.code, stdin: String(req.stdin || '') });
});

// --- Save / Open: the user picks the file in a native dialog; the page never sees paths.
const EXT = { python: 'py', javascript: 'js', c: 'c', cpp: 'cpp' };
const MAX_FILE_BYTES = 1024 * 1024;

ipcMain.handle('save-file', async (e, req) => {
  try {
    const ext = EXT[req && req.lang];
    if (!fromApp(e) || !ext || typeof req.code !== 'string') return { error: 'Bad request' };
    if (Buffer.byteLength(req.code) > MAX_FILE_BYTES) return { error: 'Program is too big (limit 1 MB)' };
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
    if (!fromApp(e) || !ext) return { error: 'Bad request' };
    const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
      properties: ['openFile'],
      filters: [{ name: req.lang, extensions: [ext] }, { name: 'All files', extensions: ['*'] }],
    });
    if (r.canceled || !r.filePaths.length) return { canceled: true };
    const file = r.filePaths[0];
    if (fs.statSync(file).size > MAX_FILE_BYTES) return { error: 'File is too big (limit 1 MB)' };
    return { ok: true, name: path.basename(file), code: fs.readFileSync(file, 'utf8') };
  } catch (err) { return { error: err.message }; }
});

app.whenReady().then(() => {
  // The app never needs camera, microphone, notifications, location, USB, etc.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setDevicePermissionHandler(() => false);

  Menu.setApplicationMenu(null);
  createWindow();
});

app.on('window-all-closed', () => app.quit());
