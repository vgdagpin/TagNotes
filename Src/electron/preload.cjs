"use strict";

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	submitEntry: (data) => ipcRenderer.invoke('submit-entry', data),
    openAddNewNotesWindow: () => ipcRenderer.invoke('open-add-new-notes-window'),
	setDirectoryHandle: async (handle) => {
		console.log('>>>>> preload: Setting directory handle', handle);
		return await ipcRenderer.invoke('set-directory-handle', handle);
	},
	getDirectoryHandle: async () => {
		return await ipcRenderer.invoke('get-directory-handle');
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
