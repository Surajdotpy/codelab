const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('codelab', {
  run: (lang, code, stdin) => ipcRenderer.invoke('run-code', { lang, code, stdin }),
  save: (lang, code) => ipcRenderer.invoke('save-file', { lang, code }),
  open: (lang) => ipcRenderer.invoke('open-file', { lang }),
});
