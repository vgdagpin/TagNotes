// File System Access API helpers
// Provides: pickNotesDirectory, getPersistedDirectoryHandle, writeNoteFile, readAllNoteFiles, revokeDirectoryHandle
// Persists handle via IndexedDB using idb-keyval.

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

// Write (upsert) a note JSON file: <id>.json
export async function writeNoteFile(handle: FileSystemDirectoryHandle, note: any) {
  const fileHandle = await handle.getFileHandle(`${note.id}.json`, { create: true });
  const stream = await fileHandle.createWritable();
  const toWrite = JSON.stringify(note, null, 2);
  await stream.write(toWrite);
  await stream.close();
}

// Remove a note file
export async function deleteNoteFile(handle: FileSystemDirectoryHandle, noteId: string) {
  try {
    await handle.removeEntry(`${noteId}.json`);
  } catch (e) {
    // ignore if missing
  }
}

// Read all note JSON files in the chosen directory
export async function readAllNoteFiles(handle: FileSystemDirectoryHandle): Promise<any[]> {
  const notes: any[] = [];
  for await (const entry of (handle as any).values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.json')) {
      const file = await entry.getFile();
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed && parsed.id && parsed.title) notes.push(parsed);
      } catch {
        // skip invalid
      }
    }
  }
  return notes;
}

// Sync a list of notes to folder (add/update, delete extras if prune=true)
export async function syncNotesToFolder(handle: FileSystemDirectoryHandle, notes: any[], prune = false) {
  const keep = new Set(notes.map(n => `${n.id}.json`));
  // Write/update
  for (const n of notes) await writeNoteFile(handle, n);
  if (prune) {
    for await (const entry of (handle as any).values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json') && !keep.has(entry.name)) {
        await handle.removeEntry(entry.name);
      }
    }
  }
}
