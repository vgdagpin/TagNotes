"use strict";

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	submitEntry: (data) => ipcRenderer.invoke('submit-entry', data),
    openAddNewNotesWindow: () => ipcRenderer.invoke('open-add-new-notes-window'),
	setDirectoryHandle: async (handle) => {
		console.log('>>>>> preload: Setting directory handle', handle);
		return await ipcRenderer.invoke('set-directory-handle', handle);
	},
	isValidDirectory: async (dirPath) => {
		return await ipcRenderer.invoke('is-valid-directory', dirPath);
	},
	browseDirectory: async () => {
		return await ipcRenderer.invoke('browse-directory');
	},
	setId: async (newId) => {
		await ipcRenderer.invoke('set-id', newId);
	},
	getId: async () => {
		return await ipcRenderer.invoke('get-id');
	}
});
