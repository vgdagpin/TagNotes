// File System Access API helpers
// Provides: pickNotesDirectory, getPersistedDirectoryHandle, writeNoteFile, readAllNoteFiles, revokeDirectoryHandle
// Persists handle via IndexedDB using idb-keyval.

import { NoteSummary } from '@shared/models';
import { set, get, del } from 'idb-keyval';

const DIR_HANDLE_KEY = 'tagnotes.dirHandle';

// Type guard for FileSystemDirectoryHandle
function isDirectoryHandle(obj: any): obj is FileSystemDirectoryHandle {
  return obj && typeof obj === 'object' && obj.kind === 'directory';
}

export async function pickNotesDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!(window as any).showDirectoryPicker) {
    throw new Error('File System Access API not supported in this browser.');
  }
  const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  await verifyPermission(handle, true);
  await set(DIR_HANDLE_KEY, handle);
  return handle;
}

export async function getPersistedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await get(DIR_HANDLE_KEY);
  if (!handle) return null;
  // Re-check permission
  const ok = await verifyPermission(handle, false).catch(() => false);
  if (!ok) return null;
  return isDirectoryHandle(handle) ? handle : null;
}

export async function revokeDirectoryHandle() {
  await del(DIR_HANDLE_KEY);
}

async function verifyPermission(handle: any, requestWrite: boolean) {
  if (!handle) return false;
  const opts: any = { mode: requestWrite ? 'readwrite' : 'read' };
  if (await handle.queryPermission(opts) === 'granted') return true;
  if (await handle.requestPermission(opts) === 'granted') return true;
  return false;
}

// ---------------- Index & Notes Folder Management ----------------

const INDEX_FILE = 'index.json';
const NOTES_DIR = 'Notes';

export interface NoteIndexEntry extends Omit<NoteSummary, 'location'> { path: string; location: string; }

async function ensureNotesDir(handle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  return await handle.getDirectoryHandle(NOTES_DIR, { create: true });
}

async function getNotesDirIfExists(handle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle | null> {
  try { return await handle.getDirectoryHandle(NOTES_DIR, { create: false }); } catch { return null; }
}

async function readFileTextSafe(fileHandle: FileSystemFileHandle): Promise<string | null> {
  try { const f = await fileHandle.getFile(); return await f.text(); } catch { return null; }
}

async function loadIndexRaw(handle: FileSystemDirectoryHandle): Promise<NoteIndexEntry[] | null> {
  try {
    const fh = await handle.getFileHandle(INDEX_FILE, { create: false });
    const txt = await readFileTextSafe(fh);
    if (!txt) return null;
    const data = JSON.parse(txt) as any;
    if (!data || !Array.isArray(data.notes)) return null;
    return data.notes.filter((n: any) => n && n.id && n.title && n.path);
  } catch { return null; }
}

async function writeIndex(handle: FileSystemDirectoryHandle, entries: NoteIndexEntry[]) {
  const fh = await handle.getFileHandle(INDEX_FILE, { create: true });
  const ws = await fh.createWritable();
  const body = JSON.stringify({ version: 1, notes: entries }, null, 2);
  await ws.write(body);
  await ws.close();
}

export async function loadIndex(handle: FileSystemDirectoryHandle): Promise<NoteIndexEntry[]> {
  // Try existing index
  const existing = await loadIndexRaw(handle);
  if (existing) return existing.map(e => ({ ...e }));
  // Build from scanning Notes folder once, then persist
  const notesDir = await getNotesDirIfExists(handle);
  const entries: NoteIndexEntry[] = [];
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
                path: location,
                location
              });
            }
        } catch { /* skip */ }
      }
    }
  }
  await writeIndex(handle, entries);
  return entries;
}

// Write (upsert) a note JSON file inside Notes/ and update index
export async function writeNoteFile(handle: FileSystemDirectoryHandle, note: any) {
  const notesDir = await ensureNotesDir(handle);
  const fileHandle = await notesDir.getFileHandle(`${note.id}.json`, { create: true });
  const stream = await fileHandle.createWritable();
  await stream.write(JSON.stringify(note, null, 2));
  await stream.close();
}

export async function deleteNoteFile(handle: FileSystemDirectoryHandle, noteId: string) {
  try {
    const notesDir = await ensureNotesDir(handle);
    await notesDir.removeEntry(`${noteId}.json`);
  } catch { /* ignore */ }
}

export async function readAllNoteFiles(handle: FileSystemDirectoryHandle): Promise<NoteSummary[]> {
  const idx = await loadIndex(handle);
  return idx.map(({ id, title, createdAt, updatedAt, location }) => ({
    id,
    title,
    createdAt: new Date(createdAt as any),
    updatedAt: new Date(updatedAt as any),
    location
  }));
}

export async function upsertIndexEntry(handle: FileSystemDirectoryHandle, entry: NoteIndexEntry) {
  const idx = await loadIndex(handle);
  const i = idx.findIndex(e => e.id === entry.id);
  if (i >= 0) idx[i] = entry; else idx.push(entry);
  await writeIndex(handle, idx);
}

export async function removeIndexEntry(handle: FileSystemDirectoryHandle, noteId: string) {
  const idx = await loadIndex(handle);
  const filtered = idx.filter(e => e.id !== noteId);
  await writeIndex(handle, filtered);
}
