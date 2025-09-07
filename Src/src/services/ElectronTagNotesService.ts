import { ITagNotesService } from "@/shared/ITagNotesService";
import { Note, NoteSummary, Section } from "@/shared/models";
import { set, get } from 'idb-keyval';
import { v4 as uuid } from 'uuid';

//import { ipcRenderer } from 'electron';

const DIR_HANDLE_KEY = 'tagnotes:electron.dirHandle';

// Electron-specific service that delegates to exposed preload APIs if available.
export class ElectronTagNotesService implements ITagNotesService {

    private api: any;
    constructor(api: any) {
        this.api = api;
    }
	getTags(): Promise<string[]> {
		throw new Error("Method not implemented.");
	}
	getNote(_noteId: string): Promise<Note> {
		throw new Error("Method not implemented.");
	}
	listNotes(_search?: string): Promise<NoteSummary[]> {
		throw new Error("Method not implemented.");
	}
    async hasSelectedDirectory(): Promise<boolean> {
		const isValidDir = this.api?.isValidDirectory;

		if (isValidDir === undefined) {
			throw new Error('isValidDirectory api not available');
		}

		const dirPath = await get(DIR_HANDLE_KEY);

        const isValid:boolean = await isValidDir(dirPath);

		return isValid;
    }

    async getDirectoryName(): Promise<string | null> {
        const dirPath = await get(DIR_HANDLE_KEY);

        return dirPath;
    }

	async browseDirectory(): Promise<string> {
		const setDirHandle = this.api?.browseDirectory;

		if (setDirHandle === undefined) {
			throw new Error('browseDirectory api not available');
		}

		const result = await setDirHandle();

		await set(DIR_HANDLE_KEY, result);

		// if (!(window as any).showDirectoryPicker) {
		// 	throw new Error('File System Access API not supported in this browser.');
		// }

		// const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });

		// // Request write permission explicitly now
		// const granted = await this.verifyPermission(handle, true, true);

		// if (!granted) throw new Error('Permission denied for selected directory.');

		// console.log('browseDirectory: Selected directory', handle.name, handle);

		// await setDirHandle(handle);
		//await ipcRenderer.invoke('set-directory-handle', handle);

		return result;
	}

    async createNote(initial?: Partial<Note>): Promise<Note> {
        const newNote: Note = {
			id: initial?.id || uuid(),
			title: initial?.title || 'New Note',
			sections: initial?.sections || [],
			tags: initial?.tags || [],
			createdAt: new Date(),
			updatedAt: new Date()
		};

		const dirPath = await get(DIR_HANDLE_KEY);

		await this.api?.createNote(dirPath, newNote);
		
		return newNote;
    }

	addSection(_noteId: string, _sectionType: Section["type"]): Promise<Section> {
		throw new Error("Method not implemented.");
	}
	addImageSection(_noteId: string, _imageData: string): Promise<Section> {
		throw new Error("Method not implemented.");
	}
	updateSectionContent(_noteId: string, _sectionId: string, _content: string, _language?: string | null | undefined): Promise<void> {
		throw new Error("Method not implemented.");
	}

	updateSectionTitle(_noteId: string, _sectionId: string, _title: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	updateTitle(_noteId: string, _title: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	deleteSection(_noteId: string, _sectionId: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	deleteNote(_noteId: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	addTag(_noteId: string, _tag: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	removeTag(_noteId: string, _tag: string): Promise<void> {
		throw new Error("Method not implemented.");
	}


	async verifyPermission(handle: any, requestWrite: boolean, promptIfNeeded: boolean) {
		if (!handle) {
			return false;
		}

		const opts: any = {
			mode: requestWrite ? 'readwrite' : 'read'
		};

		const current = await handle.queryPermission(opts);

		if (current === 'granted') {
			return true;
		}

		if (!promptIfNeeded) {
			return false;
		}

		const req = await handle.requestPermission(opts);

		return req === 'granted';
	}

	isDirectoryHandle(obj: any): obj is FileSystemDirectoryHandle {
		return obj && typeof obj === 'object' && obj.kind === 'directory';
	}
}
