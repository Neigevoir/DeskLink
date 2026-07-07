/// <reference types="vite/client" />

interface ElectronAPI {
  setWindowTitle: (title: string) => Promise<void>;
}

interface Window {
  electronAPI: ElectronAPI;
}
