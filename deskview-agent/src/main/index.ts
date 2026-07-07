import { app, BrowserWindow, desktopCapturer, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

interface ScreenSource {
  id: string;
  name: string;
  appIcon?: string;
}

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 550,
    title: 'DeskLink Agent',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  mainWindow.on('closed', () => { mainWindow = null; });
});

ipcMain.handle('get-screen-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
  });
  return sources.map((s): ScreenSource => ({ id: s.id, name: s.name, appIcon: s.appIcon?.toDataURL() }));
});

app.on('window-all-closed', () => { app.quit(); });
