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
	async getDefaultTags(): Promise<string[]> {
		const dirPath = await get(DIR_HANDLE_KEY);

		return await this.api?.getDefaultTags(dirPath);
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

	async getNote(noteId: string): Promise<Note> {
		const dirPath = await get(DIR_HANDLE_KEY);
		const note = await this.api?.getNote(dirPath, noteId);
		return note;
	}

	async listNotes(search?: string): Promise<NoteSummary[]> {
		const dirPath = await get(DIR_HANDLE_KEY);
		const notes = await this.api?.listNotes(dirPath, search);
		return notes || [];
	}

	async addSection(noteId: string, sectionType: Section["type"], width: number, height: number, x: number, y: number): Promise<Section> {
		const dirPath = await get(DIR_HANDLE_KEY);
		return await this.api?.addSection(dirPath, noteId, sectionType, width, height, x, y);
	}
	async addImageSection(noteId: string, imageData: string, width: number, height: number, x: number, y: number): Promise<Section> {
		const dirPath = await get(DIR_HANDLE_KEY);
		return await this.api?.addImageSection(dirPath, noteId, imageData, width, height, x, y);
	}
	async updateSectionContent(noteId: string, sectionId: string, content: string, language?: string | null | undefined): Promise<void> {
		const dirPath = await get(DIR_HANDLE_KEY);
		await this.api?.updateSectionContent(dirPath, noteId, sectionId, content, language);
	}

	async updateSectionTitle(noteId: string, sectionId: string, title: string): Promise<void> {
		const dirPath = await get(DIR_HANDLE_KEY);
		await this.api?.updateSectionTitle(dirPath, noteId, sectionId, title);
	}

	async updateSectionPosition(noteId: string, sectionId: string, x: number, y: number): Promise<void> {
		const dirPath = await get(DIR_HANDLE_KEY);
		await this.api?.updateSectionPosition(dirPath, noteId, sectionId, x, y);
	}

	async updateSectionDimensions(noteId: string, sectionId: string, width: number, height: number): Promise<void> {
		const dirPath = await get(DIR_HANDLE_KEY);
		await this.api?.updateSectionDimensions(dirPath, noteId, sectionId, width, height);
	}

	async convertSectionType(noteId: string, sectionId: string, newType: Section['type']): Promise<void> {
		const dirPath = await get(DIR_HANDLE_KEY);
		await this.api?.convertSectionType(dirPath, noteId, sectionId, newType);
	}
	async updateTitle(noteId: string, title: string): Promise<void> {
		const dirPath = await get(DIR_HANDLE_KEY);
		await this.api?.updateTitle(dirPath, noteId, title);
	}
	async deleteSection(noteId: string, sectionId: string): Promise<void> {
		const dirPath = await get(DIR_HANDLE_KEY);
		await this.api?.deleteSection(dirPath, noteId, sectionId);
	}
	async deleteNote(noteId: string): Promise<void> {
		const dirPath = await get(DIR_HANDLE_KEY);
		await this.api?.deleteNote(dirPath, noteId);
	}
	async addTag(noteId: string, tag: string): Promise<void> {
		const dirPath = await get(DIR_HANDLE_KEY);
		await this.api?.addTag(dirPath, noteId, tag);
	}
	async removeTag(noteId: string, tag: string): Promise<void> {
		const dirPath = await get(DIR_HANDLE_KEY);
		await this.api?.removeTag(dirPath, noteId, tag);
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
