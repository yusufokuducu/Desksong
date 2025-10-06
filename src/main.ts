import { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Windows için glassmorphism efekti desteği
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

function createWindow() {
  // Ana pencereyi oluştur
  mainWindow = new BrowserWindow({
    width: 420,
    height: 740,
    minWidth: 400,
    minHeight: 600,
    frame: false, // Custom title bar için
    transparent: true, // Glassmorphism için
    hasShadow: true,
    backgroundColor: '#00000000', // Tamamen transparan
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Local dosyaları yüklemek için
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'hidden',
    vibrancy: 'sidebar', // macOS için
    visualEffectState: 'active' // macOS için
  });

  // Windows için blur efekti
  if (process.platform === 'win32') {
    mainWindow.setBackgroundMaterial('acrylic');
  }

  // HTML dosyasını yükle
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // DevTools'u development modunda aç
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Pencere kapatma eventi
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron hazır olduğunda
app.whenReady().then(() => {
  // Menüyü kaldır
  Menu.setApplicationMenu(null);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Tüm pencereler kapandığında
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// IPC Handlers

// Pencere kontrolleri
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

// Dosya seçici dialog
ipcMain.handle('select-audio-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled) {
    return result.filePaths;
  }
  return [];
});

// Export dialog
ipcMain.handle('save-audio-file', async (event, defaultName: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultName,
    filters: [
      { name: 'WAV Audio', extensions: ['wav'] },
      { name: 'MP3 Audio', extensions: ['mp3'] }
    ]
  });

  if (!result.canceled) {
    return result.filePath;
  }
  return null;
});

// Dosya okuma
ipcMain.handle('read-file', async (event, filePath: string) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return buffer;
  } catch (error) {
    console.error('File read error:', error);
    return null;
  }
});

// Dosya yazma
ipcMain.handle('write-file', async (event, filePath: string, data: Buffer) => {
  try {
    await fs.promises.writeFile(filePath, data);
    return true;
  } catch (error) {
    console.error('File write error:', error);
    return false;
  }
});

// Tema değişikliği takibi
nativeTheme.on('updated', () => {
  mainWindow?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
});