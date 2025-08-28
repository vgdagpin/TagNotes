import axios from 'axios';
import { Note, Section } from '@shared/api';
import { pickNotesDirectory, getPersistedDirectoryHandle, writeNoteFile, readAllNoteFiles, deleteNoteFile } from './fs-access';
import { v4 as uuid } from 'uuid';

let dirHandle: FileSystemDirectoryHandle | null = null;
let loadedIndex: { id: string; title: string; updatedAt: string }[] = [];
let indexLoaded = false;

async function ensureHandleLoaded() {
  if (!dirHandle) {
    dirHandle = await getPersistedDirectoryHandle();
    if (dirHandle) {
      await refreshIndex();
    }
  }
}

export function isLocalMode() { return !!dirHandle; }

export async function enableLocalMode() {
  dirHandle = await pickNotesDirectory();
  await refreshIndex();
}

export async function disableLocalMode() {
  dirHandle = null; // leave handle persistence removal to caller if needed
}

async function refreshIndex() {
  if (!dirHandle) return;
  const notes = await readAllNoteFiles(dirHandle);
  loadedIndex = notes.map((n: any) => ({ id: n.id, title: n.title, updatedAt: n.updatedAt || n.createdAt || new Date().toISOString() }));
  indexLoaded = true;
}

export async function listNotes(search: string) {
  await ensureHandleLoaded();
  if (!dirHandle) {
    // server fallback
    const res = await axios.get(`/api/notes?search=${encodeURIComponent(search)}`);
    return res.data.result as { id: string; title: string }[];
  }
  if (!indexLoaded) await refreshIndex();
  let list = loadedIndex;
  if (search && search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(n => n.title.toLowerCase().includes(q));
  }
  return list.map(n => ({ id: n.id, title: n.title }));
}

async function readNote(id: string): Promise<Note | null> {
  if (!dirHandle) return null;
  for await (const entry of (dirHandle as any).values()) {
    if (entry.kind === 'file' && entry.name === `${id}.json`) {
      const file = await entry.getFile();
      const text = await file.text();
      const raw = JSON.parse(text);
      return hydrate(raw);
    }
  }
  return null;
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
  if (!dirHandle) {
    const res = await axios.get(`/api/notes/${noteId}`);
    const note = res.data.result || res.data; // support both shapes
    return hydrate(note);
  }
  const note = await readNote(noteId);
  if (!note) throw new Error('Note not found');
  return note;
}

export async function createNote(initial?: Partial<Note>): Promise<Note> {
  await ensureHandleLoaded();
  const newNote: Note = {
    id: initial?.id || uuid(),
    title: initial?.title || 'New Note',
    sections: initial?.sections || [],
    tags: initial?.tags || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  if (!dirHandle) {
    await axios.post('/api/notes', newNote);
    return newNote;
  }
  await writeNoteFile(dirHandle, serialize(newNote));
  await refreshIndex();
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
  if (!dirHandle) {
    // minimal server updates depend on endpoint granularity; send full note for simplicity if you add such endpoint later
  } else {
    await writeNoteFile(dirHandle, serialize(note));
    await refreshIndex();
  }
  return note;
}

export async function updateTitle(noteId: string, title: string) {
  return update(noteId, n => { n.title = title; });
}

export async function addSection(noteId: string, sectionType: Section['type']) {
  return update(noteId, n => {
    const newSection: Section = { id: uuid(), type: sectionType, content: '', createdAt: new Date(), language: sectionType === 'code' ? 'javascript' : undefined };
    n.sections.push(newSection);
  });
}

export async function addImageSection(noteId: string, imageData: string) {
  return update(noteId, n => {
    n.sections.push({ id: uuid(), type: 'image', content: 'Image', imageData, createdAt: new Date() });
  });
}

export async function updateSectionContent(noteId: string, sectionId: string, content: string) {
  return update(noteId, n => {
    const s = n.sections.find(s => s.id === sectionId); if (s) s.content = content;
  });
}

export async function updateSectionLanguage(noteId: string, sectionId: string, language: string) {
  return update(noteId, n => {
    const s = n.sections.find(s => s.id === sectionId); if (s) (s as any).language = language;
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
  if (!dirHandle) {
    await axios.delete(`/api/notes/${noteId}`);
    return;
  }
  await deleteNoteFile(dirHandle, noteId);
  await refreshIndex();
}
