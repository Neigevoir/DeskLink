const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'DeskLink Client',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('src/renderer/index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
});

ipcMain.handle('set-window-title', (_event, title) => {
  if (mainWindow) mainWindow.setTitle(title);
});

app.on('window-all-closed', () => { app.quit(); });
