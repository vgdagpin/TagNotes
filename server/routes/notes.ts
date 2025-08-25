import { RequestHandler } from 'express';
import { Note, Section } from '@shared/api'

const mockNotes: Note[] = [
    {
        id: "1",
        title: "Welcome to Notes",
        sections: [
            {
                id: "s1",
                type: "text",
                content:
                    "This is your first note! You can now add different types of sections to organize your content better.",
                createdAt: new Date("2024-01-15T10:00:00"),
            },
            {
                id: "s2",
                type: "markdown",
                content:
                    "## Features\\n\\n- Create new notes with the + tab\\n- Search through your notes and tags\\n- Add **markdown**, plain text, code, and image sections\\n- Edit and save changes\\n- Responsive design",
                createdAt: new Date("2024-01-15T10:01:00"),
            },
        ],
        tags: ["welcome", "tutorial", "getting-started"],
        createdAt: new Date("2024-01-15T10:00:00"),
        updatedAt: new Date("2024-01-15T10:00:00"),
    },
    {
        id: "2",
        title: "Project Ideas",
        sections: [
            {
                id: "s3",
                type: "text",
                content: "Some ideas for future projects:",
                createdAt: new Date("2024-01-14T14:30:00"),
            },
            {
                id: "s4",
                type: "markdown",
                content:
                    "1. Personal portfolio website\\n2. Recipe management app\\n3. Habit tracker\\n4. Book reading list\\n5. Photo gallery with tags",
                createdAt: new Date("2024-01-14T14:31:00"),
            },
        ],
        tags: ["projects", "ideas", "development"],
        createdAt: new Date("2024-01-14T14:30:00"),
        updatedAt: new Date("2024-01-14T14:30:00"),
    },
    {
        id: "3",
        title: "Meeting Notes - Jan 12",
        sections: [
            {
                id: "s5",
                type: "markdown",
                content:
                    "## Team meeting highlights\\n\\n- Discussed Q1 goals\\n- New feature roadmap review\\n- Budget planning for next quarter\\n- Team building event planning",
                createdAt: new Date("2024-01-12T09:15:00"),
            },
            {
                id: "s6",
                type: "text",
                content:
                    "Action items:\\n- Follow up with design team\\n- Review budget proposal\\n- Schedule 1:1s with team members",
                createdAt: new Date("2024-01-12T09:16:00"),
            },
        ],
        tags: ["meeting", "work", "q1-goals", "team"],
        createdAt: new Date("2024-01-12T09:15:00"),
        updatedAt: new Date("2024-01-12T09:15:00"),
    },
    {
        id: "4",
        title: "Learning Resources",
        sections: [
            {
                id: "s7",
                type: "markdown",
                content:
                    "## Useful learning resources\\n\\n### React & TypeScript\\n- React documentation\\n- TypeScript handbook\\n- Advanced React patterns",
                createdAt: new Date("2024-01-10T16:45:00"),
            },
            {
                id: "s8",
                type: "code",
                content:
                    "// Example React component\\nconst MyComponent = () => {\\n  const [count, setCount] = useState(0);\\n  \\n  return (\\n    <button onClick={() => setCount(count + 1)}>\\n      Count: {count}\\n    </button>\\n  );\\n};",
                language: "javascript",
                createdAt: new Date("2024-01-10T16:46:00"),
            },
        ],
        tags: ["learning", "react", "typescript", "documentation"],
        createdAt: new Date("2024-01-10T16:45:00"),
        updatedAt: new Date("2024-01-10T16:45:00"),
    },
];

export const handleGetNotes: RequestHandler = (req, res) => {
    const { search, skip, take }  = req.query;
    let filtered = mockNotes;
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
    const summary = filtered.slice(skipNum, skipNum + takeNum);

    res.status(200).json({
        search,
        total,
        result: summary
    });
}

// Handler to find a note by id
export const handleFindNote: RequestHandler = (req, res) => {
    const { noteId } = req.params;
    const note = mockNotes.find(n => n.id === noteId);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }
    res.status(200).json(note);
};

export const handleDeleteNote: RequestHandler = (req, res) => {
    const { noteId } = req.params;
    const noteIndex = mockNotes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) {
        return res.status(404).json({ error: 'Note not found' });
    }
    mockNotes.splice(noteIndex, 1);
    res.status(204).send();
}

export const handleUpdateNoteTitle: RequestHandler = (req, res) => {
    const { noteId } = req.params;
    const { title } = req.body;

    const note = mockNotes.find(n => n.id === noteId);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }

    note.title = title;
    note.updatedAt = new Date();

    res.status(200).json(note);
}

export const handleCreateNote: RequestHandler = (req, res) => {
    const { id, title, sections, tags, createdAt, updatedAt } = req.body;

    const newNote: Note = {
        id,
        title,
        sections: sections || [],
        tags: tags || [],
        createdAt,
        updatedAt,
    };

    mockNotes.push(newNote);
    res.status(201).json(newNote);
}

export const handleAddNoteTag: RequestHandler = (req, res) => {
    const { noteId } = req.params;
    const { tag } = req.body;

    const note = mockNotes.find(n => n.id === noteId);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }

    if (!note.tags.includes(tag)) {
        note.tags.push(tag);
        note.updatedAt = new Date();
    }

    res.status(200).json(note);
}

export const handleRemoveNoteTag: RequestHandler = (req, res) => {
    const { noteId, tag } = req.params;

    const note = mockNotes.find(n => n.id === noteId);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }

    note.tags = note.tags.filter(t => t !== tag);
    note.updatedAt = new Date();

    res.status(200).json(note);
}

export const handleAddNoteSection: RequestHandler = (req, res) => {
    const { noteId } = req.params;
    const { id, type, content, language, createdAt } = req.body;

    const note = mockNotes.find(n => n.id === noteId);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }

    const newSection: Section = {
        id,
        type,
        content,
        language,
        createdAt,
    };

    note.sections.push(newSection);
    note.updatedAt = new Date();

    res.status(201).json(newSection);
};

export const handleDeleteNoteSection: RequestHandler = (req, res) => {
    const { noteId, sectionId } = req.params;

    const note = mockNotes.find(n => n.id === noteId);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }

    note.sections = note.sections.filter(s => s.id !== sectionId);
    note.updatedAt = new Date();

    res.status(204).send();
}

export const handleUpdateSectionContent: RequestHandler = (req, res) => {
    const { noteId, sectionId } = req.params;
    const { content } = req.body;

    const note = mockNotes.find(n => n.id === noteId);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }

    const section = note.sections.find(s => s.id === sectionId);
    if (!section) {
        return res.status(404).json({ error: 'Section not found' });
    }

    section.content = content;
    note.updatedAt = new Date();

    res.status(200).json(section);
}

export const handleUpdateSectionLanguage: RequestHandler = (req, res) => {
    const { noteId, sectionId } = req.params;
    const { language } = req.body;

    const note = mockNotes.find(n => n.id === noteId);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }

    const section = note.sections.find(s => s.id === sectionId);
    if (!section) {
        return res.status(404).json({ error: 'Section not found' });
    }

    section.language = language;
    note.updatedAt = new Date();

    res.status(200).json(section);
}