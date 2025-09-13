'use strict';

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
	},

	createNote: async (dirPath, note) => {
		return await ipcRenderer.invoke('create-note', dirPath, note);
	},

	getDefaultTags: async (dirPath) => {
		return await ipcRenderer.invoke('get-default-tags', dirPath);
	},
	listNotes: async (dirPath, search) => {
		return await ipcRenderer.invoke('list-notes', dirPath, search);
	},
	getNote: async (dirPath, noteId) => {
		return await ipcRenderer.invoke('get-note', dirPath, noteId);
	},
	addSection: async (dirPath, noteId, sectionType, width, height, x, y) => {
		return await ipcRenderer.invoke(
			'add-section',
			dirPath,
			noteId,
			sectionType,
			width,
			height,
			x,
			y,
		);
	},
	addImageSection: async (dirPath, noteId, imageData, width, height, x, y) => {
		return await ipcRenderer.invoke(
			'add-image-section',
			dirPath,
			noteId,
			imageData,
			width,
			height,
			x,
			y,
		);
	},
	updateSectionContent: async (dirPath, noteId, sectionId, content, language) => {
		return await ipcRenderer.invoke(
			'update-section-content',
			dirPath,
			noteId,
			sectionId,
			content,
			language,
		);
	},
	updateSectionTitle: async (dirPath, noteId, sectionId, title) => {
		return await ipcRenderer.invoke('update-section-title', dirPath, noteId, sectionId, title);
	},
	updateTitle: async (dirPath, noteId, title) => {
		return await ipcRenderer.invoke('update-title', dirPath, noteId, title);
	},
	deleteSection: async (dirPath, noteId, sectionId) => {
		return await ipcRenderer.invoke('delete-section', dirPath, noteId, sectionId);
	},
	deleteNote: async (dirPath, noteId) => {
		return await ipcRenderer.invoke('delete-note', dirPath, noteId);
	},
	addTag: async (dirPath, noteId, tag) => {
		return await ipcRenderer.invoke('add-tag', dirPath, noteId, tag);
	},
	removeTag: async (dirPath, noteId, tag) => {
		return await ipcRenderer.invoke('remove-tag', dirPath, noteId, tag);
	},
});
