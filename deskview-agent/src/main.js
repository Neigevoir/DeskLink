const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 550,
    title: 'DeskLink Agent',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('src/renderer/index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
});

ipcMain.handle('get-screen-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
  });
  return sources.map((s) => ({ id: s.id, name: s.name, appIcon: s.appIcon?.toDataURL() }));
});

app.on('window-all-closed', () => { app.quit(); });
