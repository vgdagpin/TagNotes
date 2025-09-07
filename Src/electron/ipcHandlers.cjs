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
            const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
            
            if (result.canceled || !result.filePaths[0]) {
                return null;
            }

            const dirPath = result.filePaths[0];

            const noteDir = path.join(dirPath, 'Notes');

            if (!fs.existsSync(noteDir)) {
                fs.mkdirSync(noteDir);
            }

            const indexPath = path.join(dirPath, 'index.json');

            if (!fs.existsSync(indexPath)) {
                fs.writeFileSync(indexPath, JSON.stringify({ notes: [] }, null, 2), 'utf-8');
            }

            const tagsPath = path.join(dirPath, 'tags.txt');

            if (!fs.existsSync(tagsPath)) {
                fs.writeFileSync(tagsPath, '', 'utf-8');
            }

            return dirPath;
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
        const fileDir = path.join(dirPath, 'Notes', formatDateFolder(new Date()));

        if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
        }

        const filePath = path.join(fileDir, `${note.id}.json`);

        fs.writeFileSync(filePath, JSON.stringify(note, null, 2), 'utf-8');

        note.location = filePath;

        const indexPath = path.join(dirPath, 'index.json');

        if (!fs.existsSync(indexPath)) {
            fs.writeFileSync(indexPath, JSON.stringify({ notes: [] }, null, 2), 'utf-8');
        }

        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

        indexData.notes.push({ 
            id: note.id, 
            title: note.title, 
            createdAt: note.createdAt, 
            updatedAt: note.updatedAt, 
            location: note.location 
        });

        fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
        
        return note;
    });    
}

function formatDateFolder(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

module.exports = { registerIpcHandlers };
