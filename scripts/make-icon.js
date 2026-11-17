// Renders build/icon.png (512x512) using Electron itself. Run: npm run make-icon
// (Only needed if you want to change the icon design; the PNG is committed to the project.)
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2b3a67"/>
      <stop offset="1" stop-color="#1a1d2b"/>
    </linearGradient>
    <linearGradient id="play" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4ade80"/>
      <stop offset="1" stop-color="#22a55a"/>
    </linearGradient>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="104" fill="url(#bg)"/>
  <rect x="16" y="16" width="480" height="480" rx="104" fill="none" stroke="#4f9cff" stroke-opacity=".45" stroke-width="6"/>
  <g fill="none" stroke="#4f9cff" stroke-width="40" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="176,168 92,256 176,344"/>
    <polyline points="336,168 420,256 336,344"/>
  </g>
  <polygon points="226,190 226,322 318,256" fill="url(#play)"/>
</svg>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 512, height: 512, useContentSize: true, transparent: true, frame: false });
  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">${SVG}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 300));
  const img = (await win.webContents.capturePage()).resize({ width: 512, height: 512, quality: 'best' });
  const out = path.join(__dirname, '..', 'build', 'icon.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, img.toPNG());
  app.quit();
});
