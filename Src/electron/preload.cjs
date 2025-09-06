"use strict";

const { contextBridge, ipcRenderer } = require('electron');

// Expose a small safe API to renderer windows for submitting the Add Entry form
let directoryHandle = null;

contextBridge.exposeInMainWorld('electronAPI', {
	submitEntry: (data) => ipcRenderer.invoke('submit-entry', data),
    openAddNewNotesWindow: () => ipcRenderer.invoke('open-add-new-notes-window'),
	setDirectoryHandle: (handle) => {
		directoryHandle = handle;
	},
	getDirectoryHandle: () => directoryHandle,
	setId: async (newId) => {
		await ipcRenderer.invoke('set-id', newId);
	},
	getId: async () => {
		return await ipcRenderer.invoke('get-id');
	}
});
