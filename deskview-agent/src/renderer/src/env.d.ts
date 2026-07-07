/// <reference types="vite/client" />

interface ScreenSource {
  id: string;
  name: string;
  appIcon?: string;
}

interface ElectronAPI {
  getScreenSources: () => Promise<ScreenSource[]>;
}

interface Window {
  electronAPI: ElectronAPI;
}
