"use strict";

const { ipcMain, dialog } = require('electron');

// Internal shared state (encapsulated within this module)
let sharedId = null;

function registerIpcHandlers() {
    // Directory handle getters/setters
    const fs = require('fs');
    const path = require('path');
    const { v4: uuid } = require('uuid');
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

    // ---- Helper functions ----
    function indexPath(dirPath){ return path.join(dirPath, 'index.json'); }
    function notesDir(dirPath){ return path.join(dirPath, 'Notes'); }
    function ensureIndex(dirPath){
        if(!fs.existsSync(indexPath(dirPath))){
            fs.writeFileSync(indexPath(dirPath), JSON.stringify({ notes: [] }, null, 2), 'utf-8');
        }
    }
    function loadIndex(dirPath){
        ensureIndex(dirPath);
        try { return JSON.parse(fs.readFileSync(indexPath(dirPath), 'utf-8')); } catch { return { notes: [] }; }
    }
    function saveIndex(dirPath, data){ fs.writeFileSync(indexPath(dirPath), JSON.stringify(data, null, 2), 'utf-8'); }
    function loadNote(location){ return JSON.parse(fs.readFileSync(location, 'utf-8')); }
    function saveNote(location, note){ fs.writeFileSync(location, JSON.stringify(note, null, 2), 'utf-8'); }
    function touchUpdated(indexData, id, updatedAt){
        const entry = indexData.notes.find(n => n.id === id); if(entry){ entry.updatedAt = updatedAt; }
    }

    // ---- Notes operations ----
    ipcMain.handle('create-note', (event, dirPath, note) => {
        const notesPath = notesDir(dirPath);
        const fileDir = path.join(notesPath, formatDateFolder(new Date()));

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
    
    ipcMain.handle('get-default-tags', (event, dirPath) => {
        return new Promise((resolve, reject) => {
            try {
                const tags = fs.readFileSync(path.join(dirPath, 'tags.txt'), 'utf-8');
                resolve(tags.split('\n').filter(tag => tag.trim() !== ''));
            } catch (error) {
                reject(error);
            }
        });
    });

    ipcMain.handle('list-notes', (event, dirPath, search) => {
        try {
            const idx = loadIndex(dirPath);
            let notes = idx.notes;
            if(search){
                const s = search.toLowerCase();
                notes = notes.filter(n => (n.title || '').toLowerCase().includes(s));
            }
            // Sort by createdAt desc
            notes.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return notes;
        } catch (e){
            console.error('list-notes error', e); return [];
        }
    });

    ipcMain.handle('get-note', (event, dirPath, noteId) => {
        try {
            const idx = loadIndex(dirPath);
            const entry = idx.notes.find(n => n.id === noteId);
            if(!entry) return null;
            const note = loadNote(entry.location);
            return note;
        } catch (e){ console.error('get-note error', e); return null; }
    });

    ipcMain.handle('add-section', (event, dirPath, noteId, sectionType, width, height, x, y) => {
        const idx = loadIndex(dirPath);
        const entry = idx.notes.find(n => n.id === noteId);
        if(!entry) return null;
        const note = loadNote(entry.location);
        const section = { 
            id: uuid(), 
            type: sectionType, 
            content: '', 
            createdAt: new Date(), 
            title: sectionType === 'image' ? 'Image' : undefined ,
            width, 
            height, 
            x, 
            y
        };

        note.sections.push(section);
        note.updatedAt = new Date();
        touchUpdated(idx, noteId, note.updatedAt);
        saveNote(entry.location, note); saveIndex(dirPath, idx);
        return section;
    });

    ipcMain.handle('add-image-section', (event, dirPath, noteId, imageData, width, height, x, y) => {
        const idx = loadIndex(dirPath);
        const entry = idx.notes.find(n => n.id === noteId);
        if(!entry) return null;
        const note = loadNote(entry.location);
        const section = { 
            id: uuid(), 
            type: 'image', 
            content: '', 
            imageData, 
            createdAt: new Date(), 
            title: 'Image', 
            width, 
            height, 
            x, 
            y 
        };
        
        note.sections.push(section);
        note.updatedAt = new Date();
        touchUpdated(idx, noteId, note.updatedAt);
        saveNote(entry.location, note); saveIndex(dirPath, idx);
        return section;
    });

    ipcMain.handle('update-section-content', (event, dirPath, noteId, sectionId, content, language) => {
        const idx = loadIndex(dirPath);
        const entry = idx.notes.find(n => n.id === noteId); if(!entry) return false;
        const note = loadNote(entry.location);
        const section = note.sections.find(s => s.id === sectionId); if(!section) return false;
        section.content = content;
        if(language !== undefined) section.language = language;
        note.updatedAt = new Date();
        touchUpdated(idx, noteId, note.updatedAt);
        saveNote(entry.location, note); saveIndex(dirPath, idx);
        return true;
    });

    ipcMain.handle('update-section-title', (event, dirPath, noteId, sectionId, title) => {
        const idx = loadIndex(dirPath);
        const entry = idx.notes.find(n => n.id === noteId); if(!entry) return false;
        const note = loadNote(entry.location);
        const section = note.sections.find(s => s.id === sectionId); if(!section) return false;
        section.title = title;
        note.updatedAt = new Date();
        touchUpdated(idx, noteId, note.updatedAt);
        saveNote(entry.location, note); saveIndex(dirPath, idx);
        return true;
    });

    ipcMain.handle('update-title', (event, dirPath, noteId, title) => {
        const idx = loadIndex(dirPath);
        const entry = idx.notes.find(n => n.id === noteId); if(!entry) return false;
        const note = loadNote(entry.location);
        note.title = title;
        note.updatedAt = new Date();
        entry.title = title; entry.updatedAt = note.updatedAt;
        saveNote(entry.location, note); saveIndex(dirPath, idx);
        return true;
    });

    ipcMain.handle('delete-section', (event, dirPath, noteId, sectionId) => {
        const idx = loadIndex(dirPath);
        const entry = idx.notes.find(n => n.id === noteId); if(!entry) return false;
        const note = loadNote(entry.location);
        const before = note.sections.length;
        note.sections = note.sections.filter(s => s.id !== sectionId);
        if(note.sections.length === before){ return false; }
        note.updatedAt = new Date(); touchUpdated(idx, noteId, note.updatedAt);
        saveNote(entry.location, note); saveIndex(dirPath, idx);
        return true;
    });

    ipcMain.handle('delete-note', (event, dirPath, noteId) => {
        const idx = loadIndex(dirPath);
        const i = idx.notes.findIndex(n => n.id === noteId); if(i === -1) return false;
        const entry = idx.notes[i];
        try { if(entry.location && fs.existsSync(entry.location)) fs.unlinkSync(entry.location); } catch {}
        idx.notes.splice(i,1);
        saveIndex(dirPath, idx);
        return true;
    });

    ipcMain.handle('add-tag', (event, dirPath, noteId, tag) => {
        const idx = loadIndex(dirPath);
        const entry = idx.notes.find(n => n.id === noteId); if(!entry) return false;
        const note = loadNote(entry.location);
        if(!note.tags) note.tags = [];
        if(!note.tags.includes(tag)) note.tags.push(tag);
        note.updatedAt = new Date(); touchUpdated(idx, noteId, note.updatedAt);
        saveNote(entry.location, note); saveIndex(dirPath, idx);

        entry.tags = note.tags;
        saveIndex(dirPath, idx);

        return true;
    });

    ipcMain.handle('remove-tag', (event, dirPath, noteId, tag) => {
        const idx = loadIndex(dirPath);
        const entry = idx.notes.find(n => n.id === noteId); if(!entry) return false;
        const note = loadNote(entry.location);
        if(note.tags) note.tags = note.tags.filter(t => t !== tag);
        note.updatedAt = new Date(); touchUpdated(idx, noteId, note.updatedAt);
        saveNote(entry.location, note); saveIndex(dirPath, idx);

        entry.tags = note.tags;
        saveIndex(dirPath, idx);
        
        return true;
    });

}

function formatDateFolder(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

module.exports = { registerIpcHandlers };
