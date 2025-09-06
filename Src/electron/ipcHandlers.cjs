"use strict";

const { ipcMain, dialog } = require('electron');

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

  ipcMain.handle('browse-directory', async () => {
    try {
      console.log('>>>>>> ipc: browse-directory invoked in main');
      // Placeholder: keep behavior consistent (will throw) until refactored.
      const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
      if (result.canceled || !result.filePaths[0]) return null;

      return result.filePaths[0]; // absolute path
      // return fsDirHandler;
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
