import { contextBridge, ipcRenderer, webUtils } from 'electron';

// Renderer process'e güvenli API'ler expose et
contextBridge.exposeInMainWorld('electronAPI', {
  // Pencere kontrolleri
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Dosya işlemleri
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  saveAudioFile: (defaultName: string) => ipcRenderer.invoke('save-audio-file', defaultName),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, data: Buffer) => ipcRenderer.invoke('write-file', filePath, data),
  getFilePathFromFile: (file: File) => webUtils.getPathForFile(file),

  // Tema değişiklikleri
  onThemeChanged: (callback: (isDark: boolean) => void) => {
    ipcRenderer.on('theme-changed', (event, isDark) => callback(isDark));
  },

  // Platform bilgisi
  platform: process.platform,
});

// TypeScript tip tanımlamaları için
declare global {
  interface Window {
    electronAPI: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      selectAudioFiles: () => Promise<string[]>;
      saveAudioFile: (defaultName: string) => Promise<string | null>;
      readFile: (filePath: string) => Promise<Buffer | null>;
      writeFile: (filePath: string, data: Buffer) => Promise<boolean>;
      getFilePathFromFile: (file: File) => string;
      onThemeChanged: (callback: (isDark: boolean) => void) => void;
      platform: NodeJS.Platform;
    };
  }
}