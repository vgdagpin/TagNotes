"use strict";

const { ipcMain } = require('electron');

// Internal shared state (encapsulated within this module)
let sharedId = null;
let fsDirHandler = null;

function registerIpcHandlers() {
  // Directory handle getters/setters
  ipcMain.handle('get-directory-handle', () => {
    console.log('>>>>>> ipc: get-directory-handle', fsDirHandler);
    return fsDirHandler;
  });

  ipcMain.handle('set-directory-handle', (event, handle) => {
    console.log('>>>>>> ipc: set-directory-handle');
    fsDirHandler = handle;
    return fsDirHandler;
  });

  // NOTE: "window.showDirectoryPicker" cannot be used in the main process.
  // This handler currently mirrors existing logic but will always fail since
  // 'window' is undefined in the main process. Consider replacing with
  // dialog.showOpenDialog in main or moving picking logic to renderer.
  ipcMain.handle('browse-directory', async () => {
    try {
      console.log('>>>>>> ipc: browse-directory invoked in main (window API not available)');
      // Placeholder: keep behavior consistent (will throw) until refactored.
      // const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
      // if (result.canceled || !result.filePaths[0]) return null;
      // fsDirHandler = result.filePaths[0];
      // return fsDirHandler;
      throw new Error('window.showDirectoryPicker not available in main process');
    } catch (err) {
      console.error('>>>>>> ipc: browse-directory error', err);
      return null;
    }
  });

  // Shared ID handlers
  ipcMain.handle('get-id', () => {
    return sharedId;
  });

  ipcMain.handle('set-id', (event, id) => {
    sharedId = id;
    return sharedId;
  });
}

module.exports = { registerIpcHandlers };
