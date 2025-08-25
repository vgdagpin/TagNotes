import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, FileText, Edit3, Save, Trash2, Tag, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

// Types for our note system
interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Mock data for initial notes
const mockNotes: Note[] = [
  {
    id: "1",
    title: "Welcome to Notes",
    content:
      "This is your first note! You can edit this content by clicking the edit button or double-clicking in the content area.\n\nFeatures:\n• Create new notes with the + tab\n• Search through your notes\n• Edit and save changes\n• Open multiple notes in tabs\n• Responsive design",
    tags: ["welcome", "tutorial", "getting-started"],
    createdAt: new Date("2024-01-15T10:00:00"),
    updatedAt: new Date("2024-01-15T10:00:00"),
  },
  {
    id: "2",
    title: "Project Ideas",
    content:
      "Some ideas for future projects:\n\n1. Personal portfolio website\n2. Recipe management app\n3. Habit tracker\n4. Book reading list\n5. Photo gallery with tags",
    tags: ["projects", "ideas", "development"],
    createdAt: new Date("2024-01-14T14:30:00"),
    updatedAt: new Date("2024-01-14T14:30:00"),
  },
  {
    id: "3",
    title: "Meeting Notes - Jan 12",
    content:
      "Team meeting highlights:\n\n• Discussed Q1 goals\n• New feature roadmap review\n�� Budget planning for next quarter\n• Team building event planning\n\nAction items:\n- Follow up with design team\n- Review budget proposal\n- Schedule 1:1s with team members",
    tags: ["meeting", "work", "q1-goals", "team"],
    createdAt: new Date("2024-01-12T09:15:00"),
    updatedAt: new Date("2024-01-12T09:15:00"),
  },
  {
    id: "4",
    title: "Learning Resources",
    content:
      "Useful learning resources:\n\n**React & TypeScript:**\n• React documentation\n• TypeScript handbook\n• Advanced React patterns\n\n**Design:**\n• Radix UI components\n• Tailwind CSS documentation\n• UI/UX design principles\n\n**Tools:**\n• Vite build tool\n• ESLint configuration\n• Testing with Vitest",
    tags: ["learning", "react", "typescript", "documentation"],
    createdAt: new Date("2024-01-10T16:45:00"),
    updatedAt: new Date("2024-01-10T16:45:00"),
  },
];

export default function Index() {
  // State management
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [openTabs, setOpenTabs] = useState<string[]>(["1"]); // Start with first note open
  const [activeTab, setActiveTab] = useState("1");
  const [editingNotes, setEditingNotes] = useState<Set<string>>(new Set());
  const [noteContents, setNoteContents] = useState<Record<string, string>>({});
  const [noteTags, setNoteTags] = useState<Record<string, string[]>>({});

  // Initialize note contents and tags for editing
  useEffect(() => {
    const contents: Record<string, string> = {};
    const tags: Record<string, string[]> = {};
    notes.forEach((note) => {
      contents[note.id] = note.content;
      tags[note.id] = [...note.tags];
    });
    setNoteContents(contents);
    setNoteTags(tags);
  }, [notes]);

  // Filtered notes based on search
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;

    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query)),
    );
  }, [notes, searchQuery]);

  // Generate new note ID
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Create new note
  const createNote = () => {
    const newNote: Note = {
      id: generateId(),
      title: "New Note",
      content: "",
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setNoteContents((prev) => ({ ...prev, [newNote.id]: "" }));
    setNoteTags((prev) => ({ ...prev, [newNote.id]: [] }));

    // Open the new note in a tab
    if (!openTabs.includes(newNote.id)) {
      setOpenTabs((prev) => [...prev, newNote.id]);
    }
    setActiveTab(newNote.id);
    setEditingNotes((prev) => new Set([...prev, newNote.id]));
  };

  // Open note in tab
  const openNoteInTab = (noteId: string) => {
    if (!openTabs.includes(noteId)) {
      setOpenTabs((prev) => [...prev, noteId]);
    }
    setActiveTab(noteId);
  };

  // Close tab
  const closeTab = (noteId: string) => {
    const newOpenTabs = openTabs.filter((id) => id !== noteId);
    setOpenTabs(newOpenTabs);

    if (activeTab === noteId) {
      // Switch to the previous tab or the first available tab
      const currentIndex = openTabs.indexOf(noteId);
      const nextTab =
        newOpenTabs[Math.max(0, currentIndex - 1)] || newOpenTabs[0];
      if (nextTab) {
        setActiveTab(nextTab);
      }
    }

    // Stop editing if we were editing this note
    setEditingNotes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(noteId);
      return newSet;
    });
  };

  // Toggle edit mode
  const toggleEdit = (noteId: string) => {
    setEditingNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Save note changes
  const saveNote = (noteId: string) => {
    const content = noteContents[noteId] || "";
    const title = content.split("\n")[0].slice(0, 50) || "Untitled";
    const tags = noteTags[noteId] || [];

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, title, content, tags, updatedAt: new Date() }
          : note,
      ),
    );

    setEditingNotes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(noteId);
      return newSet;
    });
  };

  // Delete note
  const deleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    closeTab(noteId);
    setNoteContents((prev) => {
      const newContents = { ...prev };
      delete newContents[noteId];
      return newContents;
    });
    setNoteTags((prev) => {
      const newTags = { ...prev };
      delete newTags[noteId];
      return newTags;
    });
  };

  // Update note content in state
  const updateNoteContent = (noteId: string, content: string) => {
    setNoteContents((prev) => ({ ...prev, [noteId]: content }));
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Get preview text for sidebar
  const getPreviewText = (content: string) => {
    return (
      content.slice(0, 60).replace(/\n/g, " ") +
      (content.length > 60 ? "..." : "")
    );
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Left Sidebar - Navigation */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notes
          </h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? "No notes found" : "No notes yet"}
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => openNoteInTab(note.id)}
                className={cn(
                  "p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors",
                  activeTab === note.id && "bg-accent",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {note.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getPreviewText(note.content)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(note.updatedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Note Button */}
        <div className="p-4 border-t border-border">
          <Button onClick={createNote} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>

      {/* Right Main Content - Tabbed Interface */}
      <div className="flex-1 flex flex-col">
        {openTabs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium text-foreground mb-2">
                No notes open
              </h2>
              <p className="text-muted-foreground mb-4">
                Select a note from the sidebar to get started
              </p>
              <Button onClick={createNote}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first note
              </Button>
            </div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col"
          >
            {/* Tabs List */}
            <div className="border-b border-border bg-card px-4">
              <TabsList className="h-12 p-0 bg-transparent">
                {openTabs.map((noteId) => {
                  const note = notes.find((n) => n.id === noteId);
                  if (!note) return null;

                  return (
                    <div key={noteId} className="flex items-center">
                      <TabsTrigger
                        value={noteId}
                        className="relative pr-8 max-w-48"
                      >
                        <span className="truncate">{note.title}</span>
                        {editingNotes.has(noteId) && (
                          <div className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full"></div>
                        )}
                      </TabsTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -ml-6 z-10"
                        onClick={() => closeTab(noteId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}

                {/* Add new note tab */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 ml-2"
                  onClick={createNote}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TabsList>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-hidden">
              {openTabs.map((noteId) => {
                const note = notes.find((n) => n.id === noteId);
                if (!note) return null;

                const isEditing = editingNotes.has(noteId);

                return (
                  <TabsContent
                    key={noteId}
                    value={noteId}
                    className="h-full mt-0 data-[state=active]:flex flex-col"
                  >
                    {/* Note Header */}
                    <div className="p-4 border-b border-border bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold text-foreground">
                            {note.title}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Updated {formatDate(note.updatedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <Button onClick={() => saveNote(noteId)} size="sm">
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => toggleEdit(noteId)}
                              size="sm"
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteNote(noteId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Note Content */}
                    <div className="flex-1 p-4 overflow-y-auto">
                      {isEditing ? (
                        <Textarea
                          value={noteContents[noteId] || ""}
                          onChange={(e) =>
                            updateNoteContent(noteId, e.target.value)
                          }
                          placeholder="Start writing your note..."
                          className="w-full h-full min-h-96 resize-none border-0 focus-visible:ring-0 p-0 text-base leading-relaxed"
                        />
                      ) : (
                        <div
                          className="w-full h-full min-h-96 text-base leading-relaxed whitespace-pre-wrap cursor-text"
                          onDoubleClick={() => toggleEdit(noteId)}
                        >
                          {note.content || (
                            <span className="text-muted-foreground italic">
                              Double-click to start writing...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                );
              })}
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
}
