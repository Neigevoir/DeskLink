const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setWindowTitle: (title) => ipcRenderer.invoke('set-window-title', title),
});
