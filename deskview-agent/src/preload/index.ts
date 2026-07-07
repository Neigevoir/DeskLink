import { contextBridge, ipcRenderer } from 'electron';

interface ScreenSource {
  id: string;
  name: string;
  appIcon?: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSources: (): Promise<ScreenSource[]> => ipcRenderer.invoke('get-screen-sources'),
});
