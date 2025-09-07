"use strict";

const { ipcMain, dialog } = require('electron');

// Internal shared state (encapsulated within this module)
let sharedId = null;

function registerIpcHandlers() {
    // Directory handle getters/setters
    const fs = require('fs');
    const path = require('path');
    ipcMain.handle('is-valid-directory', (event, dirPath) => {
        console.log('>>>>>> ipc: is-valid-directory', dirPath);
        try {
            // Check if directory exists
            if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
                console.log('>>>>>> ipc: is-valid-directory - doesnt exist or not a directory');
                return false;
            }
            // Try to write a temp file
            const testFile = path.join(dirPath, '.tagnotes_write_test');
            try {
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
                console.log('>>>>>> ipc: is-valid-directory - can write file');
                return true;
            } catch {
                console.log('>>>>>> ipc: is-valid-directory - cannot write file');
                return false;
            }
        } catch {
            console.log('>>>>>> ipc: is-valid-directory - something went wrong');
            return false;
        }
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

    ipcMain.handle('create-note', (event, dirPath, note) => {
        // Logic to create a note in the specified directory
    });
}

module.exports = { registerIpcHandlers };
