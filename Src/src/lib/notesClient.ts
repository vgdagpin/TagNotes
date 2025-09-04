import type { Note, NoteSummary, Section } from '@/shared/models';
import { pickNotesDirectory, getPersistedDirectoryHandle, writeNoteFile, writeNoteFileAtPath, readAllNoteFiles, deleteNoteFile, upsertIndexEntry, removeIndexEntry, loadTags, writeTag } from './fs-access';
import { v4 as uuid } from 'uuid';

export { getPersistedDirectoryHandle } from './fs-access';

let dirHandle: FileSystemDirectoryHandle | null = null;
let loadedIndex: NoteSummary[] = [];
let indexLoaded = false;

async function ensureHandleLoaded() {
    if (!dirHandle) {
        dirHandle = await getPersistedDirectoryHandle();
        if (dirHandle) {
            await refreshIndex();
        }
    }
}

export function isLocalMode() { 
    return dirHandle != null;
}

export async function enableLocalMode() {
    dirHandle = await pickNotesDirectory();
    await refreshIndex();
    try {
        const name = (dirHandle as any)?.name || '';
        window.dispatchEvent(new CustomEvent('tagnotes:directoryChanged', { detail: { name } }));
    } catch {}
}

// Attempt to restore previously persisted directory handle silently.
export async function tryRestoreLocalMode(): Promise<boolean> {
    if (dirHandle) return true;
    await ensureHandleLoaded();
    return !!dirHandle;
}

export async function disableLocalMode() {
    dirHandle = null; // leave handle persistence removal to caller if needed
}

// Switch to a new local directory (user picks). Returns directory name.
export async function switchLocalDirectory(): Promise<string> {
    dirHandle = await pickNotesDirectory();
    indexLoaded = false;
    await refreshIndex();
    const name = (dirHandle as any)?.name || '';
    try { window.dispatchEvent(new CustomEvent('tagnotes:directoryChanged', { detail: { name } })); } catch {}
    return name;
}

export function getCurrentDirectoryName(): string | null {
    return dirHandle ? (dirHandle as any).name || null : null;
}

export function getTags() {
    return dirHandle ? loadTags(dirHandle) : Promise.resolve([]);
}

export function createTag(tag: string) {
    return dirHandle ? writeTag(dirHandle, tag) : Promise.resolve(false);
}

async function refreshIndex() {
    if (!dirHandle) return;
    const notes = await readAllNoteFiles(dirHandle);
    loadedIndex = notes.map((n: any) => ({
        id: n.id,
        title: n.title,
        updatedAt: n.updatedAt,
        createdAt: n.createdAt,
        sections: [],
        tags: n.tags || [],
        location: n.location
    }));
    indexLoaded = true;
}

export async function listNotes(search?: string): Promise<NoteSummary[]> {
    await ensureHandleLoaded();
    if (!dirHandle) return [] as NoteSummary[];
    if (!indexLoaded) await refreshIndex();
    let list = loadedIndex;
    if (search && search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(n => n.title.toLowerCase().includes(q) || n.tags.some(t => t.includes(q)));
    }
    return list.map(n => ({ id: n.id, title: n.title, createdAt: n.createdAt, updatedAt: n.updatedAt, location: n.location, tags: n.tags }));
}

async function readNote(id: string): Promise<Note | null> {
    if (!dirHandle) return null;
    if (!indexLoaded) await refreshIndex();
    const meta = loadedIndex.find(n => n.id === id);
    if (!meta || !meta.location) return null;
    const parts = meta.location.split('/');
    if (parts.length !== 3) return null; // expect Notes/YYYY-MM-DD/<id>.json
    try {
        const [rootName, dateFolder, fileName] = parts as [string, string, string];
        const notesRoot = await dirHandle.getDirectoryHandle(rootName, { create: false });
        const dateDir = await notesRoot.getDirectoryHandle(dateFolder, { create: false });
        const fileHandle = await dateDir.getFileHandle(fileName, { create: false });
        const file = await fileHandle.getFile();
        const text = await file.text();
        return hydrate(JSON.parse(text));
    } catch {
        return null;
    }
}

function hydrate(raw: any): Note {
    return {
        ...raw,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
        sections: (raw.sections || []).map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) }))
    };
}

export async function getNote(noteId: string): Promise<Note> {
    await ensureHandleLoaded();
    if (!dirHandle) throw new Error('Local directory not selected');
    const note = await readNote(noteId);
    if (!note) throw new Error('Note not found');
    return note;
}

export async function createNote(initial?: Partial<Note>): Promise<Note> {
    await ensureHandleLoaded();
    if (!dirHandle) throw new Error('Local directory not selected');
    const newNote: Note = {
        id: initial?.id || uuid(),
        title: initial?.title || 'New Note',
        sections: initial?.sections || [],
        tags: initial?.tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const location = await writeNoteFile(dirHandle, serialize(newNote));

    newNote.location = location;

    await upsertIndexEntry(dirHandle, { id: newNote.id, title: newNote.title, createdAt: newNote.createdAt, updatedAt: newNote.updatedAt, location, tags: newNote.tags } as any);
    loadedIndex.unshift({ id: newNote.id, title: newNote.title, createdAt: newNote.createdAt, updatedAt: newNote.updatedAt, tags: newNote.tags, location });
    indexLoaded = true;
    return newNote;
}

function serialize(note: Note) {
    return {
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        sections: note.sections.map(s => ({ ...s, createdAt: s.createdAt.toISOString() }))
    };
}

async function update(noteId: string, mutator: (n: Note) => void): Promise<Note> {
    const note = await getNote(noteId);
    mutator(note);
    note.updatedAt = new Date();
    if (!dirHandle) throw new Error('Local directory not selected');
    // update index entry incrementally
    const idx = loadedIndex.find(i => i.id === note.id);
    const loc = idx?.location;
    // preserve original path (date folder) so we don't create duplicates when day rolls over
    if (loc) {
        await writeNoteFileAtPath(dirHandle, loc, serialize(note));
    } else {
        await writeNoteFile(dirHandle, serialize(note));
    }
    if (idx) {
        idx.title = note.title;
        idx.updatedAt = note.updatedAt;
        idx.tags = note.tags;
    }
    if (loc) {
    await upsertIndexEntry(dirHandle, { id: note.id, title: note.title, createdAt: note.createdAt, updatedAt: note.updatedAt, location: loc, tags: note.tags } as any);
    } else {
        await refreshIndex();
    }
    return note;
}

export async function updateTitle(noteId: string, title: string) {
    // Optimized path: update only title & updatedAt without loading full sections
    await ensureHandleLoaded();
    if (!dirHandle) throw new Error('Local directory not selected');
    if (!indexLoaded) await refreshIndex();
    const entry = loadedIndex.find(n => n.id === noteId);
    if (!entry) return update(noteId, n => { n.title = title; }); // fallback
    entry.title = title;
    entry.updatedAt = new Date();
    // Persist: load note file, modify title & updatedAt, write back, then upsert index entry
    const full = await getNote(noteId); // reuse existing loader for consistency
    full.title = title;
    full.updatedAt = entry.updatedAt;
    if (entry.location) {
        await writeNoteFileAtPath(dirHandle, entry.location, serialize(full));
    } else {
        await writeNoteFile(dirHandle, serialize(full));
    }
    if (entry.location) {
    await upsertIndexEntry(dirHandle, { id: full.id, title: full.title, createdAt: full.createdAt, updatedAt: full.updatedAt, location: entry.location, tags: full.tags } as any);
    }
    return full;
}

export async function addSection(noteId: string, sectionType: Section['type']) {
    const newSection: Section = { 
            id: uuid(), 
            type: sectionType, 
            content: '', 
            createdAt: new Date(), 
            language: sectionType === 'code' ? 'javascript' : null
        };

    await update(noteId, n => n.sections.push(newSection));

    return newSection;
}

export async function addImageSection(noteId: string, imageData: string) {
    return update(noteId, n => {
        n.sections.push({ id: uuid(), type: 'image', content: 'Image', imageData, createdAt: new Date() });
    });
}

export async function updateSectionContent(noteId: string, sectionId: string, content: string, language?: string | null | undefined) {

    return update(noteId, n => {
        const s = n.sections.find(s => s.id === sectionId); 
        if (s)  {
            s.content = content;

            if (language) {
                if (s.language != language) {
                    s.language = language;
                }
            }
        }            
    });
}

export async function deleteSection(noteId: string, sectionId: string) {
    return update(noteId, n => { n.sections = n.sections.filter(s => s.id !== sectionId); });
}

export async function addTag(noteId: string, tag: string) {
    tag = tag.trim().toLowerCase();
    return update(noteId, n => { if (!n.tags.includes(tag)) n.tags.push(tag); });
}

export async function removeTag(noteId: string, tag: string) {
    return update(noteId, n => { n.tags = n.tags.filter(t => t !== tag); });
}

export async function deleteNote(noteId: string) {
    await ensureHandleLoaded();
    if (!dirHandle) throw new Error('Local directory not selected');
    await deleteNoteFile(dirHandle, noteId);
    loadedIndex = loadedIndex.filter(n => n.id !== noteId);
    await removeIndexEntry(dirHandle, noteId);
    // no need full refresh; keep in-memory consistent
}
