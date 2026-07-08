/// <reference types="vite/client" />

interface ScreenSource {
  id: string;
  name: string;
  appIcon?: string;
}

interface ScreenSize {
  width: number;
  height: number;
}

interface ElectronAPI {
  getScreenSources: () => Promise<ScreenSource[]>;
  getScreenSize: () => Promise<ScreenSize>;
  mouseMove: (ratioX: number, ratioY: number) => Promise<void>;
  mouseToggle: (action: 'down' | 'up', button: string) => Promise<void>;
  mouseClick: (button: string) => Promise<void>;
  mouseScroll: (deltaX: number, deltaY: number) => Promise<void>;
  keyToggle: (code: string, key: string, action: 'down' | 'up',
    shiftKey?: boolean, ctrlKey?: boolean, altKey?: boolean, metaKey?: boolean) => Promise<void>;
}

interface Window {
  electronAPI: ElectronAPI;
}
