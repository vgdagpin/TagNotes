// File System Access API helpers
// Provides: pickNotesDirectory, getPersistedDirectoryHandle, writeNoteFile, readAllNoteFiles, revokeDirectoryHandle
// Persists handle via IndexedDB using idb-keyval.

import type { NoteSummary } from '@/shared/models';
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
  // Request write permission explicitly now
  const granted = await verifyPermission(handle, true, true);
  if (!granted) throw new Error('Permission denied for selected directory.');
  await set(DIR_HANDLE_KEY, handle);
  // Ask browser to persist storage (best-effort)
  try { await ensurePersistentStorage(); } catch { /* ignore */ }
  return handle;
}

export async function getPersistedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await get(DIR_HANDLE_KEY);
  if (!handle || !isDirectoryHandle(handle)) return null;
  // Only query permission; do NOT prompt user automatically on load
  const hasPerm = await verifyPermission(handle, false, false).catch(() => false);
  if (!hasPerm) return null;
  return handle;
}

export async function revokeDirectoryHandle() {
  await del(DIR_HANDLE_KEY);
}

async function verifyPermission(handle: any, requestWrite: boolean, promptIfNeeded: boolean) {
  if (!handle) return false;
  const opts: any = { mode: requestWrite ? 'readwrite' : 'read' };
  const current = await handle.queryPermission(opts);
  if (current === 'granted') return true;
  if (!promptIfNeeded) return false;
  const req = await handle.requestPermission(opts);
  return req === 'granted';
}

/** Attempt to make site storage persistent so the directory handle reference survives eviction */
export async function ensurePersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && (navigator.storage as any).persist) {
      const persisted = await (navigator.storage as any).persisted();
      if (persisted) return true;
      return await (navigator.storage as any).persist();
    }
  } catch { /* ignore */ }
  return false;
}

/** Returns true if a directory handle is stored and still has permission */
export async function hasRestorableHandle(): Promise<boolean> {
  const handle = await getPersistedDirectoryHandle();
  return !!handle;
}

// ---------------- Index & Notes Folder Management ----------------

const INDEX_FILE = 'index.json';
const NOTES_DIR = 'Notes';

function formatDateFolder(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeNotePath(id: string, date: Date = new Date()): string {
  return `${NOTES_DIR}/${formatDateFolder(date)}/${id}.json`;
}

// Internal index entry now uses only 'location'. Older index versions may still have 'path'; we migrate it.
export interface NoteIndexEntry extends NoteSummary {}

async function ensureNotesDir(handle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  const root = await handle.getDirectoryHandle(NOTES_DIR, { create: true });
  const dated = await root.getDirectoryHandle(formatDateFolder(new Date()), { create: true });
  return dated;
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
    // Map legacy entries that used 'path' to 'location'. Accept entries that have either.
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
        // legacy: files directly in Notes root
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
        } catch { /* skip */ }
      } else if (entry.kind === 'directory') {
        // date folder
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
            } catch { /* skip */ }
          }
        }
      }
    }
  }
  await writeIndex(handle, entries);
  return entries;
}

// Write (upsert) a note JSON file inside Notes/ and update index
export async function writeNoteFile(handle: FileSystemDirectoryHandle, note: any): Promise<string> {
  const notesDir = await ensureNotesDir(handle); // date folder
  const fileHandle = await notesDir.getFileHandle(`${note.id}.json`, { create: true });
  const stream = await fileHandle.createWritable();
  await stream.write(JSON.stringify(note, null, 2));
  await stream.close();
  const folderName = (notesDir as any).name as string; // date folder name
  return `${NOTES_DIR}/${folderName}/${note.id}.json`;
}

// Write a note JSON file at an existing path without changing its date folder.
// Path formats supported:
//   Notes/<id>.json (legacy)
//   Notes/YYYY-MM-DD/<id>.json (current)
export async function writeNoteFileAtPath(handle: FileSystemDirectoryHandle, path: string, note: any): Promise<string> {
  if (!path.startsWith(`${NOTES_DIR}/`)) {
    // Fall back to regular writer (will assign a date folder)
    return writeNoteFile(handle, note);
  }
  const parts = path.split('/'); // e.g., ["Notes", "2025-08-29", "abc.json"] or ["Notes", "abc.json"]
  if (parts.length === 3) {
    const [, dateFolderRaw, fileNameRaw] = parts;
    const dateFolder = dateFolderRaw!; // parts length check ensures defined
    const fileName = fileNameRaw!;
    const root = await handle.getDirectoryHandle(NOTES_DIR, { create: true });
    const dateDir = await root.getDirectoryHandle(dateFolder, { create: true });
    const fh = await dateDir.getFileHandle(fileName, { create: true });
    const ws = await fh.createWritable();
    await ws.write(JSON.stringify(note, null, 2));
    await ws.close();
    return path; // unchanged
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
  // Unexpected format: delegate
  return writeNoteFile(handle, note);
}

export async function deleteNoteFile(handle: FileSystemDirectoryHandle, noteId: string) {
  try {
    // We don't know which date folder it is in; scan current date first then others.
    const root = await handle.getDirectoryHandle(NOTES_DIR, { create: false });
    for await (const entry of (root as any).values()) {
      if (entry.kind === 'directory') {
        try {
          const dir = await root.getDirectoryHandle(entry.name, { create: false });
          await dir.removeEntry(`${noteId}.json`);
          break;
        } catch { /* continue */ }
      } else if (entry.kind === 'file' && entry.name === `${noteId}.json`) {
        // legacy root file
        await root.removeEntry(entry.name);
        break;
      }
    }
  } catch { /* ignore */ }
}

export async function readAllNoteFiles(handle: FileSystemDirectoryHandle): Promise<NoteSummary[]> {
  const idx = await loadIndex(handle);
  return idx.map(({ id, title, createdAt, updatedAt, location, tags }) => ({
    id,
    title,
    createdAt: new Date(createdAt as any),
    updatedAt: new Date(updatedAt as any),
    location,
    tags: tags || []
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
