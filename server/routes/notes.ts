import { RequestHandler } from 'express';
import { Note, Section } from '@shared/api'
import * as fs from 'fs';
import * as path from 'path';
import { getSettings } from '../../client/lib/settingsHelper';

// Persistence setup - get directory from settings or use default
function getDataDirectory(): string {
  try {
    const settings = getSettings();
    if (settings.notesDirectory && settings.notesDirectory.trim() !== '') {
      return settings.notesDirectory;
    }
  } catch (error) {
    console.warn('Failed to load settings, using fallback directory:', error);
  }

  // Fallback to relative data directory if settings fail
  return path.join(__dirname, '..', 'data');
}

const DATA_DIR = getDataDirectory();
const DATA_FILE = path.join(DATA_DIR, 'notes.json');

function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
        const seed = [];
        fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
    }
}

function loadNotes(): Note[] {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const arr = JSON.parse(raw);
    return arr.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
        sections: (n.sections || []).map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) }))
    }));
}

function saveNotes(notes: Note[]) {
    const serializable = notes.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        sections: n.sections.map(s => ({ ...s, createdAt: s.createdAt.toISOString() }))
    }));
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(serializable, null, 2));
}

export const handleGetNotes: RequestHandler = (req, res) => {
    const { search, skip, take }  = req.query;
    let notes = loadNotes();
    let filtered = notes;
    // Apply search to title and tags if search is provided
    if (typeof search === 'string' && search.trim() !== '') {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(note =>
            note.title.toLowerCase().includes(searchLower) ||
            (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        );
    }
    const total = filtered.length;

    // Parse skip/take as integers, default to 0/total
    const skipNum = Number(skip) || 0;
    const takeNum = Number(take) || total;
    const summary = filtered.slice(skipNum, skipNum + takeNum).map(note => ({ id: note.id, title: note.title }));

    res.status(200).json({
        search,
        total,
        result: summary
    });
}

// Handler to find a note by id
export const handleFindNote: RequestHandler = (req, res) => {
    const { noteId } = req.params;
    const note = loadNotes().find(n => n.id === noteId);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }
    res.status(200).json(note);
};

export const handleDeleteNote: RequestHandler = (req, res) => {
    const { noteId } = req.params;
    const notes = loadNotes();
    const noteIndex = notes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) return res.status(404).json({ error: 'Note not found' });
    notes.splice(noteIndex, 1);
    saveNotes(notes);
    res.status(204).send();
}

export const handleUpdateNoteTitle: RequestHandler = (req, res) => {
    const { noteId } = req.params;
    const { title } = req.body;
    const notes = loadNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    note.title = title;
    note.updatedAt = new Date();
    saveNotes(notes);
    res.status(200).json(note);
}

export const handleCreateNote: RequestHandler = (req, res) => {
    const { id, title, sections, tags, createdAt, updatedAt } = req.body;
    const notes = loadNotes();
    const newNote: Note = {
        id,
        title,
        sections: (sections || []).map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) })),
        tags: tags || [],
        createdAt: createdAt ? new Date(createdAt) : new Date(),
        updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
    };
    notes.push(newNote);
    saveNotes(notes);
    res.status(201).json(newNote);
}

export const handleAddNoteTag: RequestHandler = (req, res) => {
    const { noteId } = req.params;
    const { tag } = req.body;
    const notes = loadNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (!note.tags.includes(tag)) {
        note.tags.push(tag);
        note.updatedAt = new Date();
        saveNotes(notes);
    }
    res.status(200).json(note);
}

export const handleRemoveNoteTag: RequestHandler = (req, res) => {
    const { noteId, tag } = req.params;
    const notes = loadNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    note.tags = note.tags.filter(t => t !== tag);
    note.updatedAt = new Date();
    saveNotes(notes);
    res.status(200).json(note);
}

export const handleAddNoteSection: RequestHandler = (req, res) => {
    const { noteId } = req.params;
    const { id, type, content, language, createdAt, imageData } = req.body;
    const notes = loadNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    const newSection: Section = { id, type, content, language, imageData, createdAt: createdAt ? new Date(createdAt) : new Date() };
    note.sections.push(newSection);
    note.updatedAt = new Date();
    saveNotes(notes);
    res.status(201).json(newSection);
};

export const handleDeleteNoteSection: RequestHandler = (req, res) => {
    const { noteId, sectionId } = req.params;
    const notes = loadNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    note.sections = note.sections.filter(s => s.id !== sectionId);
    note.updatedAt = new Date();
    saveNotes(notes);
    res.status(204).send();
}

export const handleUpdateSectionContent: RequestHandler = (req, res) => {
    const { noteId, sectionId } = req.params;
    const { content } = req.body;
    const notes = loadNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    const section = note.sections.find(s => s.id === sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found' });
    section.content = content;
    note.updatedAt = new Date();
    saveNotes(notes);
    res.status(200).json(section);
}

export const handleUpdateSectionLanguage: RequestHandler = (req, res) => {
    const { noteId, sectionId } = req.params;
    const { language } = req.body;
    const notes = loadNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    const section = note.sections.find(s => s.id === sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found' });
    section.language = language;
    note.updatedAt = new Date();
    saveNotes(notes);
    res.status(200).json(section);
}
