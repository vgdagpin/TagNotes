import { set, get } from 'idb-keyval';
import { v4 as uuid } from 'uuid';
import { ITagNotesService } from "@/shared/ITagNotesService";
import { Note, NoteSummary, Section } from "@/shared/models";

const DIR_HANDLE_KEY = 'tagnotes.dirHandle';
const INDEX_FILE = 'index.json';
const TAGS_FILE = 'tags.txt';
const NOTES_DIR = 'Notes';

export class TagNotesService implements ITagNotesService {
	private dirHandle: FileSystemDirectoryHandle | null = null;
	private loadedIndex: NoteSummary[] = [];
	private indexLoaded: boolean = false;

	// --- Directory logic ---
	private async pickNotesDirectory(): Promise<FileSystemDirectoryHandle> {
		if (!(window as any).showDirectoryPicker) {
			throw new Error('File System Access API not supported in this browser.');
		}
		const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
		const granted = await this.verifyPermission(handle, true, true);
		if (!granted) throw new Error('Permission denied for selected directory.');
		await set(DIR_HANDLE_KEY, handle);
		try { await this.ensurePersistentStorage(); } catch { }
		return handle;
	}

	private async getPersistedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
		const handle = await get(DIR_HANDLE_KEY);
		if (!handle || !this.isDirectoryHandle(handle)) return null;
		const hasPerm = await this.verifyPermission(handle, false, false).catch(() => false);
		if (!hasPerm) return null;
		return handle;
	}

	private isDirectoryHandle(obj: any): obj is FileSystemDirectoryHandle {
		return obj && typeof obj === 'object' && obj.kind === 'directory';
	}

	private async verifyPermission(handle: any, requestWrite: boolean, promptIfNeeded: boolean) {
		if (!handle) return false;
		const opts: any = { mode: requestWrite ? 'readwrite' : 'read' };
		const current = await handle.queryPermission(opts);
		if (current === 'granted') return true;
		if (!promptIfNeeded) return false;
		const req = await handle.requestPermission(opts);
		return req === 'granted';
	}

	private async ensurePersistentStorage(): Promise<boolean> {
		try {
			if (navigator.storage && (navigator.storage as any).persist) {
				const persisted = await (navigator.storage as any).persisted();
				if (persisted) return true;
				return await (navigator.storage as any).persist();
			}
		} catch { }
		return false;
	}

	async hasSelectedDirectory(): Promise<boolean> {
		const handle = await this.getPersistedDirectoryHandle();
		return handle != null;
	}

	async browseDirectory(): Promise<string> {
		this.dirHandle = await this.pickNotesDirectory();
		this.indexLoaded = false;
		await this.refreshIndex();
		const name = (this.dirHandle as any)?.name || '';
		try {
			window.dispatchEvent(new CustomEvent('tagnotes:directoryChanged', { detail: { name } }));
		} catch { }
		return name;
	}

	async getDirectoryName(): Promise<string | null> {
		return this.dirHandle ? (this.dirHandle as any).name || null : null;
	}

	// --- Tag logic ---
	async getDefaultTags(): Promise<string[]> {
		if (!this.dirHandle) return [];
		return await this.loadTags(this.dirHandle);
	}

	async addTag(noteId: string, tag: string): Promise<void> {
		tag = tag.trim().toLowerCase();
		await this.update(noteId, n => { if (!n.tags.includes(tag)) n.tags.push(tag); });
	}

	async removeTag(noteId: string, tag: string): Promise<void> {
		await this.update(noteId, n => { n.tags = n.tags.filter(t => t !== tag); });
	}

	private async loadTags(handle: FileSystemDirectoryHandle): Promise<string[]> {
		try {
			const fh = await handle.getFileHandle(TAGS_FILE, { create: true });
			const txt = await this.readFileTextSafe(fh);
			if (!txt) return [];
			const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
			const seen = new Set<string>();
			const out: string[] = [];
			for (const line of lines) {
				const low = line.toLowerCase();
				if (seen.has(low)) continue;
				seen.add(low);
				out.push(low);
			}
			return out;
		} catch { return []; }
	}

	// --- Note logic ---
	async createNote(initial?: Partial<Note>): Promise<Note> {
		await this.ensureHandleLoaded();
		if (!this.dirHandle) throw new Error('Local directory not selected');
		const newNote: Note = {
			id: initial?.id || uuid(),
			title: initial?.title || 'New Note',
			sections: initial?.sections || [],
			tags: initial?.tags || [],
			createdAt: new Date(),
			updatedAt: new Date()
		};
		const location = await this.writeNoteFile(this.dirHandle, this.serialize(newNote));
		newNote.location = location;
		await this.upsertIndexEntry(this.dirHandle, { id: newNote.id, title: newNote.title, createdAt: newNote.createdAt, updatedAt: newNote.updatedAt, location, tags: newNote.tags } as any);
		this.loadedIndex.unshift({ id: newNote.id, title: newNote.title, createdAt: newNote.createdAt, updatedAt: newNote.updatedAt, tags: newNote.tags, location });
		this.indexLoaded = true;
		return newNote;
	}

	async listNotes(search?: string): Promise<NoteSummary[]> {
		await this.ensureHandleLoaded();
		if (!this.dirHandle) return [] as NoteSummary[];
		if (!this.indexLoaded) await this.refreshIndex();
		let list = this.loadedIndex;
		if (search && search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(n => n.title.toLowerCase().includes(q) || n.tags.some(t => t.includes(q)));
		}
		return list.map(n => ({ id: n.id, title: n.title, createdAt: n.createdAt, updatedAt: n.updatedAt, location: n.location, tags: n.tags }));
	}

	async getNote(noteId: string): Promise<Note> {
		await this.ensureHandleLoaded();
		if (!this.dirHandle) throw new Error('Local directory not selected');
		const note = await this.readNote(noteId);
		if (!note) throw new Error('Note not found');
		return note;
	}

	async addSection(noteId: string, sectionType: Section['type']): Promise<Section> {
		const defaultTitle = sectionType === 'image' ? 'Image' : sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
		const newSection: Section = {
			id: uuid(),
			type: sectionType,
			title: defaultTitle,
			content: '',
			createdAt: new Date(),
			language: sectionType === 'code' ? 'javascript' : null
		};
		await this.update(noteId, n => n.sections.push(newSection));
		return newSection;
	}

	async addImageSection(noteId: string, imageData: string): Promise<Section> {
		const newImgSection: Section = {
			id: uuid(),
			type: 'image',
			content: 'Image',
			imageData,
			createdAt: new Date()
		};
		await this.update(noteId, n => n.sections.push(newImgSection));
		return newImgSection;
	}

	async updateSectionContent(noteId: string, sectionId: string, content: string, language?: string | null | undefined): Promise<void> {
		await this.update(noteId, n => {
			const s = n.sections.find(s => s.id === sectionId);
			if (s) {
				s.content = content;
				if (language) {
					if (s.language != language) {
						s.language = language;
					}
				}
			}
		});
	}

	async updateSectionTitle(noteId: string, sectionId: string, title: string): Promise<void> {
		await this.update(noteId, n => {
			const s = n.sections.find(s => s.id === sectionId);
			if (s) {
				s.title = title;
			}
		});
	}

	async updateTitle(noteId: string, title: string): Promise<void> {
		await this.ensureHandleLoaded();
		if (!this.dirHandle) throw new Error('Local directory not selected');
		if (!this.indexLoaded) await this.refreshIndex();
		const entry = this.loadedIndex.find(n => n.id === noteId);
		if (!entry) {
			this.update(noteId, n => { n.title = title; });
			return;
		}
		entry.title = title;
		entry.updatedAt = new Date();
		const full = await this.getNote(noteId);
		full.title = title;
		full.updatedAt = entry.updatedAt;
		if (entry.location) {
			await this.writeNoteFileAtPath(this.dirHandle, entry.location, this.serialize(full));
		} else {
			await this.writeNoteFile(this.dirHandle, this.serialize(full));
		}
		if (entry.location) {
			await this.upsertIndexEntry(this.dirHandle, { id: full.id, title: full.title, createdAt: full.createdAt, updatedAt: full.updatedAt, location: entry.location, tags: full.tags } as any);
		}
	}

	async deleteSection(noteId: string, sectionId: string): Promise<void> {
		await this.update(noteId, n => { n.sections = n.sections.filter(s => s.id !== sectionId); });
	}

	async deleteNote(noteId: string): Promise<void> {
		await this.ensureHandleLoaded();
		if (!this.dirHandle) throw new Error('Local directory not selected');
		await this.deleteNoteFile(this.dirHandle, noteId);
		this.loadedIndex = this.loadedIndex.filter(n => n.id !== noteId);
		await this.removeIndexEntry(this.dirHandle, noteId);
	}

	// --- Internal helpers ---
	private async ensureHandleLoaded() {
		if (!this.dirHandle) {
			this.dirHandle = await this.getPersistedDirectoryHandle();
			if (this.dirHandle) {
				await this.refreshIndex();
			}
		}
	}

	private async refreshIndex() {
		if (!this.dirHandle) return;
		const notes = await this.readAllNoteFiles(this.dirHandle);
		this.loadedIndex = notes.map((n: any) => ({
			id: n.id,
			title: n.title,
			updatedAt: n.updatedAt,
			createdAt: n.createdAt,
			sections: [],
			tags: n.tags || [],
			location: n.location
		}));
		this.indexLoaded = true;
	}

	private async readNote(id: string): Promise<Note | null> {
		if (!this.dirHandle) return null;
		if (!this.indexLoaded) await this.refreshIndex();
		const meta = this.loadedIndex.find(n => n.id === id);
		if (!meta || !meta.location) return null;
		const parts = meta.location.split('/');
		if (parts.length !== 3) return null;
		try {
			const [rootName, dateFolder, fileName] = parts as [string, string, string];
			const notesRoot = await this.dirHandle.getDirectoryHandle(rootName, { create: false });
			const dateDir = await notesRoot.getDirectoryHandle(dateFolder, { create: false });
			const fileHandle = await dateDir.getFileHandle(fileName, { create: false });
			const file = await fileHandle.getFile();
			const text = await file.text();
			return this.hydrate(JSON.parse(text));
		} catch { return null; }
	}

	private hydrate(raw: any): Note {
		return {
			...raw,
			createdAt: new Date(raw.createdAt),
			updatedAt: new Date(raw.updatedAt),
			sections: (raw.sections || []).map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) }))
		};
	}

	private serialize(note: Note) {
		return {
			...note,
			createdAt: note.createdAt.toISOString(),
			updatedAt: note.updatedAt.toISOString(),
			sections: note.sections.map(s => ({ ...s, createdAt: s.createdAt.toISOString() }))
		};
	}

	private async update(noteId: string, mutator: (n: Note) => void): Promise<Note> {
		const note = await this.getNote(noteId);
		mutator(note);
		note.updatedAt = new Date();
		if (!this.dirHandle) throw new Error('Local directory not selected');
		const idx = this.loadedIndex.find(i => i.id === note.id);
		const loc = idx?.location;
		if (loc) {
			await this.writeNoteFileAtPath(this.dirHandle, loc, this.serialize(note));
		} else {
			await this.writeNoteFile(this.dirHandle, this.serialize(note));
		}
		if (idx) {
			idx.title = note.title;
			idx.updatedAt = note.updatedAt;
			idx.tags = note.tags;
		}
		if (loc) {
			await this.upsertIndexEntry(this.dirHandle, { id: note.id, title: note.title, createdAt: note.createdAt, updatedAt: note.updatedAt, location: loc, tags: note.tags } as any);
		} else {
			await this.refreshIndex();
		}
		return note;
	}

	private async readFileTextSafe(fileHandle: FileSystemFileHandle): Promise<string | null> {
		try { const f = await fileHandle.getFile(); return await f.text(); } catch { return null; }
	}

	private async writeNoteFile(handle: FileSystemDirectoryHandle, note: any): Promise<string> {
		const notesDir = await this.ensureNotesDir(handle);
		const fileHandle = await notesDir.getFileHandle(`${note.id}.json`, { create: true });
		const stream = await fileHandle.createWritable();
		await stream.write(JSON.stringify(note, null, 2));
		await stream.close();
		const folderName = (notesDir as any).name as string;
		return `${NOTES_DIR}/${folderName}/${note.id}.json`;
	}

	private async writeNoteFileAtPath(handle: FileSystemDirectoryHandle, path: string, note: any): Promise<string> {
		if (!path.startsWith(`${NOTES_DIR}/`)) {
			return this.writeNoteFile(handle, note);
		}
		const parts = path.split('/');
		if (parts.length === 3) {
			const [, dateFolderRaw, fileNameRaw] = parts;
			const dateFolder = dateFolderRaw!;
			const fileName = fileNameRaw!;
			const root = await handle.getDirectoryHandle(NOTES_DIR, { create: true });
			const dateDir = await root.getDirectoryHandle(dateFolder, { create: true });
			const fh = await dateDir.getFileHandle(fileName, { create: true });
			const ws = await fh.createWritable();
			await ws.write(JSON.stringify(note, null, 2));
			await ws.close();
			return path;
		} else if (parts.length === 2) {
			const [, fileNameRaw] = parts;
			const fileName = fileNameRaw!;
			const root = await handle.getDirectoryHandle(NOTES_DIR, { create: true });
			const fh = await root.getFileHandle(fileName, { create: true });
			const ws = await fh.createWritable();
			await ws.write(JSON.stringify(note, null, 2));
			await ws.close();
			return path;
		}
		return this.writeNoteFile(handle, note);
	}

	private async ensureNotesDir(handle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
		const root = await handle.getDirectoryHandle(NOTES_DIR, { create: true });
		const dated = await root.getDirectoryHandle(this.formatDateFolder(new Date()), { create: true });
		return dated;
	}

	private formatDateFolder(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	private async upsertIndexEntry(handle: FileSystemDirectoryHandle, entry: any) {
		const idx = await this.loadIndex(handle);
		const i = idx.findIndex((e: any) => e.id === entry.id);
		if (i >= 0) idx[i] = entry; else idx.push(entry);
		await this.writeIndex(handle, idx);
	}

	private async removeIndexEntry(handle: FileSystemDirectoryHandle, noteId: string) {
		const idx = await this.loadIndex(handle);
		const filtered = idx.filter((e: any) => e.id !== noteId);
		await this.writeIndex(handle, filtered);
	}

	private async writeIndex(handle: FileSystemDirectoryHandle, entries: any[]) {
		const fh = await handle.getFileHandle(INDEX_FILE, { create: true });
		const ws = await fh.createWritable();
		const body = JSON.stringify({ version: 1, notes: entries }, null, 2);
		await ws.write(body);
		await ws.close();
	}

	private async loadIndex(handle: FileSystemDirectoryHandle): Promise<any[]> {
		const existing = await this.loadIndexRaw(handle);
		if (existing) return existing.map((e: any) => ({ ...e }));
		const notesDir = await this.getNotesDirIfExists(handle);
		const entries: any[] = [];
		if (notesDir) {
			for await (const entry of (notesDir as any).values()) {
				if (entry.kind === 'file' && entry.name.endsWith('.json')) {
					try {
						const file = await entry.getFile();
						const text = await file.text();
						const parsed = JSON.parse(text);
						if (parsed && parsed.id && parsed.title) {
							const location = `${NOTES_DIR}/${entry.name}`;
							entries.push({
								id: parsed.id,
								title: parsed.title,
								createdAt: parsed.createdAt || parsed.updatedAt || new Date().toISOString(),
								updatedAt: parsed.updatedAt || parsed.createdAt || new Date().toISOString(),
								location,
								tags: parsed.tags || []
							});
						}
					} catch { }
				} else if (entry.kind === 'directory') {
					for await (const fileEntry of entry.values()) {
						if (fileEntry.kind === 'file' && fileEntry.name.endsWith('.json')) {
							try {
								const file = await fileEntry.getFile();
								const text = await file.text();
								const parsed = JSON.parse(text);
								if (parsed && parsed.id && parsed.title) {
									const location = `${NOTES_DIR}/${entry.name}/${fileEntry.name}`;
									entries.push({
										id: parsed.id,
										title: parsed.title,
										createdAt: parsed.createdAt || parsed.updatedAt || new Date().toISOString(),
										updatedAt: parsed.updatedAt || parsed.createdAt || new Date().toISOString(),
										location,
										tags: parsed.tags || []
									});
								}
							} catch { }
						}
					}
				}
			}
		}
		await this.writeIndex(handle, entries);
		return entries;
	}

	private async loadIndexRaw(handle: FileSystemDirectoryHandle): Promise<any[] | null> {
		try {
			const fh = await handle.getFileHandle(INDEX_FILE, { create: false });
			const txt = await this.readFileTextSafe(fh);
			if (!txt) return null;
			const data = JSON.parse(txt) as any;
			if (!data || !Array.isArray(data.notes)) return null;
			return data.notes
				.filter((n: any) => n && n.id && n.title && (n.location || n.path))
				.map((n: any) => ({
					id: n.id,
					title: n.title,
					createdAt: n.createdAt,
					updatedAt: n.updatedAt,
					location: n.location || n.path,
					tags: n.tags || []
				}));
		} catch { return null; }
	}

	private async getNotesDirIfExists(handle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle | null> {
		try { return await handle.getDirectoryHandle(NOTES_DIR, { create: false }); } catch { return null; }
	}

	private async readAllNoteFiles(handle: FileSystemDirectoryHandle): Promise<NoteSummary[]> {
		const idx = await this.loadIndex(handle);
		return idx.map(({ id, title, createdAt, updatedAt, location, tags }) => ({
			id,
			title,
			createdAt: new Date(createdAt as any),
			updatedAt: new Date(updatedAt as any),
			location,
			tags: tags || []
		}));
	}

	private async deleteNoteFile(handle: FileSystemDirectoryHandle, noteId: string) {
		try {
			const root = await handle.getDirectoryHandle(NOTES_DIR, { create: false });
			for await (const entry of (root as any).values()) {
				if (entry.kind === 'directory') {
					try {
						const dir = await root.getDirectoryHandle(entry.name, { create: false });
						await dir.removeEntry(`${noteId}.json`);
						break;
					} catch { }
				} else if (entry.kind === 'file' && entry.name === `${noteId}.json`) {
					await root.removeEntry(entry.name);
					break;
				}
			}
		} catch { }
	}
}

// ...existing code...