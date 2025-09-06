"use strict";

const { contextBridge, ipcRenderer } = require('electron');

// Expose a small safe API to renderer windows for submitting the Add Entry form
contextBridge.exposeInMainWorld('electronAPI', {
	submitEntry: (data) => ipcRenderer.invoke('submit-entry', data),
	openAddNewNotesWindow: () => ipcRenderer.invoke('open-add-new-notes-window')
});
