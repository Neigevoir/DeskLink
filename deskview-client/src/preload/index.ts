import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  setWindowTitle: (title: string): Promise<void> => ipcRenderer.invoke('set-window-title', title),
});
