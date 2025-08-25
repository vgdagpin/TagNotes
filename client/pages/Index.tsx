import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Search,
  Plus,
  X,
  FileText,
  Edit3,
  Save,
  Trash2,
  Tag,
  Hash,
  Code,
  Type,
  Image,
  ChevronDown,
  Eye,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for our note system
interface Section {
  id: string;
  type: "markdown" | "text" | "code" | "image";
  content: string;
  language?: string; // for code sections
  imageData?: string; // for image sections (base64)
  createdAt: Date;
}

interface Note {
  id: string;
  title: string;
  sections: Section[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Mock data for initial notes
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

export default function Index() {
  // State management
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [openTabs, setOpenTabs] = useState<string[]>(["1"]); // Start with first note open
  const [activeTab, setActiveTab] = useState("1");
  const [editingNotes, setEditingNotes] = useState<Set<string>>(new Set());
  const [noteTags, setNoteTags] = useState<Record<string, string[]>>({});
  const [sectionContents, setSectionContents] = useState<
    Record<string, string>
  >({});
  const [editingSections, setEditingSections] = useState<Set<string>>(
    new Set(),
  );
  const [editingTitles, setEditingTitles] = useState<Set<string>>(new Set());
  const [titleContents, setTitleContents] = useState<Record<string, string>>({});

  // Initialize note tags, section contents, and title contents for editing
  useEffect(() => {
    const tags: Record<string, string[]> = {};
    const contents: Record<string, string> = {};
    const titles: Record<string, string> = {};
    notes.forEach((note) => {
      tags[note.id] = [...note.tags];
      titles[note.id] = note.title;
      note.sections.forEach((section) => {
        contents[section.id] = section.content;
      });
    });
    setNoteTags(tags);
    setSectionContents(contents);
    setTitleContents(titles);
  }, [notes]);

  // Filtered notes based on search
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;

    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.sections.some((section) =>
          section.content.toLowerCase().includes(query),
        ) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [notes, searchQuery]);

  // Generate new ID
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Create new note with default section
  const createNote = () => {
    const newNote: Note = {
      id: generateId(),
      title: "New Note",
      sections: [
        {
          id: generateId(),
          type: "text",
          content: "",
          createdAt: new Date(),
        },
      ],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setNoteTags((prev) => ({ ...prev, [newNote.id]: [] }));
    setSectionContents((prev) => ({ ...prev, [newNote.sections[0].id]: "" }));

    // Open the new note in a tab
    if (!openTabs.includes(newNote.id)) {
      setOpenTabs((prev) => [...prev, newNote.id]);
    }
    setActiveTab(newNote.id);
    setEditingNotes((prev) => new Set([...prev, newNote.id]));
  };

  // Add new section to note
  const addSection = (noteId: string, sectionType: Section["type"]) => {
    const newSection: Section = {
      id: generateId(),
      type: sectionType,
      content: "",
      language: sectionType === "code" ? "javascript" : undefined,
      createdAt: new Date(),
    };

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              sections: [...note.sections, newSection],
              updatedAt: new Date(),
            }
          : note,
      ),
    );

    setSectionContents((prev) => ({ ...prev, [newSection.id]: "" }));
    setEditingSections((prev) => new Set([...prev, newSection.id]));
  };

  // Delete section
  const deleteSection = (noteId: string, sectionId: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              sections: note.sections.filter((s) => s.id !== sectionId),
              updatedAt: new Date(),
            }
          : note,
      ),
    );

    setSectionContents((prev) => {
      const newContents = { ...prev };
      delete newContents[sectionId];
      return newContents;
    });

    setEditingSections((prev) => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });
  };

  // Update section content
  const updateSectionContent = (sectionId: string, content: string) => {
    setSectionContents((prev) => ({ ...prev, [sectionId]: content }));
  };

  // Update section language (for code sections)
  const updateSectionLanguage = (sectionId: string, language: string) => {
    setNotes((prev) =>
      prev.map((note) => ({
        ...note,
        sections: note.sections.map((section) =>
          section.id === sectionId ? { ...section, language } : section,
        ),
      })),
    );
  };

  // Toggle section edit mode
  const toggleSectionEdit = (sectionId: string) => {
    setEditingSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Save section changes
  const saveSection = (sectionId: string) => {
    const content = sectionContents[sectionId] || "";

    setNotes((prev) =>
      prev.map((note) => ({
        ...note,
        sections: note.sections.map((section) =>
          section.id === sectionId ? { ...section, content } : section,
        ),
        updatedAt: new Date(),
      })),
    );

    setEditingSections((prev) => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });
  };

  // Handle image paste
  const handleImagePaste = (noteId: string, event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const imageData = e.target?.result as string;
            addImageSection(noteId, imageData);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  // Add image section
  const addImageSection = (noteId: string, imageData: string) => {
    const newSection: Section = {
      id: generateId(),
      type: "image",
      content: "Image",
      imageData: imageData,
      createdAt: new Date(),
    };

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              sections: [...note.sections, newSection],
              updatedAt: new Date(),
            }
          : note,
      ),
    );
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
      const currentIndex = openTabs.indexOf(noteId);
      const nextTab =
        newOpenTabs[Math.max(0, currentIndex - 1)] || newOpenTabs[0];
      if (nextTab) {
        setActiveTab(nextTab);
      }
    }

    setEditingNotes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(noteId);
      return newSet;
    });
  };

  // Toggle edit mode for note
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
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    // Update title from first section if it's text
    const firstSection = note.sections[0];
    const title =
      firstSection?.content.split("\\n")[0].slice(0, 50) || "Untitled";
    const tags = noteTags[noteId] || [];

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, title, tags, updatedAt: new Date() }
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
    setNoteTags((prev) => {
      const newTags = { ...prev };
      delete newTags[noteId];
      return newTags;
    });
  };

  // Add tag to note
  const addTagToNote = (noteId: string, tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) return;

    setNoteTags((prev) => {
      const currentTags = prev[noteId] || [];
      if (currentTags.includes(trimmedTag)) return prev;
      return { ...prev, [noteId]: [...currentTags, trimmedTag] };
    });
  };

  // Remove tag from note
  const removeTagFromNote = (noteId: string, tagToRemove: string) => {
    setNoteTags((prev) => ({
      ...prev,
      [noteId]: (prev[noteId] || []).filter((tag) => tag !== tagToRemove),
    }));
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
  const getPreviewText = (sections: Section[]) => {
    const firstTextSection = sections.find((s) => s.content.trim());
    if (!firstTextSection) return "Empty note";
    return (
      firstTextSection.content.slice(0, 60).replace(/\\n/g, " ") +
      (firstTextSection.content.length > 60 ? "..." : "")
    );
  };

  // Render section based on type
  const renderSection = (
    section: Section,
    noteId: string,
    isEditing: boolean,
  ) => {
    const isEditingSection = editingSections.has(section.id);
    const content = sectionContents[section.id] || section.content;

    return (
      <div
        key={section.id}
        className="border border-border rounded-lg p-4 space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {section.type === "markdown" && <Hash className="h-4 w-4" />}
            {section.type === "text" && <Type className="h-4 w-4" />}
            {section.type === "code" && <Code className="h-4 w-4" />}
            {section.type === "image" && <Image className="h-4 w-4" />}
            <span className="capitalize">{section.type}</span>
            {section.type === "code" && section.language && (
              <Badge variant="outline" className="text-xs">
                {section.language}
              </Badge>
            )}
          </div>

          {isEditing && (
            <div className="flex items-center gap-1">
              {isEditingSection ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => saveSection(section.id)}
                >
                  <Save className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSectionEdit(section.id)}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteSection(noteId, section.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Section Content */}
        {section.type === "image" && section.imageData ? (
          <Dialog>
            <DialogTrigger asChild>
              <div className="cursor-pointer">
                <img
                  src={section.imageData}
                  alt={section.content}
                  className="max-w-xs h-32 object-cover rounded border hover:opacity-80 transition-opacity"
                />
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <img
                src={section.imageData}
                alt={section.content}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </DialogContent>
          </Dialog>
        ) : isEditingSection ? (
          <div className="space-y-2">
            {section.type === "code" && (
              <Select
                value={section.language || "javascript"}
                onValueChange={(value) =>
                  updateSectionLanguage(section.id, value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="sql">SQL</SelectItem>
                  <SelectItem value="csharp">C#</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="bash">Bash</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Textarea
              value={content}
              onChange={(e) => updateSectionContent(section.id, e.target.value)}
              placeholder={`Enter ${section.type} content...`}
              className="min-h-32 resize-vertical"
            />
          </div>
        ) : (
          <div className="prose max-w-none">
            {section.type === "code" ? (
              <SyntaxHighlighter
                language={section.language || "javascript"}
                style={tomorrow}
                className="rounded border"
              >
                {section.content}
              </SyntaxHighlighter>
            ) : section.type === "markdown" ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: section.content
                    .replace(/\\n/g, "<br>")
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\*(.*?)\*/g, "<em>$1</em>")
                    .replace(
                      /^## (.*)/gm,
                      '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>',
                    )
                    .replace(
                      /^### (.*)/gm,
                      '<h3 class="text-base font-semibold mt-3 mb-2">$1</h3>',
                    )
                    .replace(/^- (.*)/gm, '<li class="ml-4">$1</li>'),
                }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {section.content || (
                  <span className="text-muted-foreground italic">
                    Empty section
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
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
              placeholder="Search notes and tags..."
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
                  "p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors group",
                  activeTab === note.id && "bg-accent",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {note.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getPreviewText(note.sections)}
                    </p>
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {note.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{note.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
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
                    onPaste={(e) => {
                      if (isEditing) {
                        handleImagePaste(noteId, e.nativeEvent);
                      }
                    }}
                  >
                    {/* Note Header */}
                    <div className="p-4 border-b border-border bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h2 className="text-xl font-semibold text-foreground">
                            {note.title}
                          </h2>
                          <p className="text-sm text-muted-foreground mb-3">
                            Updated {formatDate(note.updatedAt)}
                          </p>

                          {/* Tags Section */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Tag className="h-4 w-4" />
                              Tags
                            </div>

                            {isEditing ? (
                              <div className="space-y-2">
                                {/* Tag Input */}
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Add tag..."
                                    className="flex-1"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const input =
                                          e.target as HTMLInputElement;
                                        addTagToNote(noteId, input.value);
                                        input.value = "";
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      const input = (e.target as HTMLElement)
                                        .closest(".flex")
                                        ?.querySelector(
                                          "input",
                                        ) as HTMLInputElement;
                                      if (input) {
                                        addTagToNote(noteId, input.value);
                                        input.value = "";
                                      }
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* Editable Tags */}
                                <div className="flex flex-wrap gap-2">
                                  {(noteTags[noteId] || []).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="flex items-center gap-1"
                                    >
                                      <Hash className="h-3 w-3" />
                                      {tag}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={() =>
                                          removeTagFromNote(noteId, tag)
                                        }
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </Badge>
                                  ))}
                                  {(noteTags[noteId] || []).length === 0 && (
                                    <span className="text-muted-foreground italic text-sm">
                                      No tags yet
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Display Tags */
                              <div className="flex flex-wrap gap-2">
                                {note.tags.length > 0 ? (
                                  note.tags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="flex items-center gap-1"
                                    >
                                      <Hash className="h-3 w-3" />
                                      {tag}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground italic text-sm">
                                    No tags
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
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

                      {/* Add Section Dropdown */}
                      {isEditing && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <Select
                            onValueChange={(value) =>
                              addSection(noteId, value as Section["type"])
                            }
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Add section..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">
                                <div className="flex items-center gap-2">
                                  <Type className="h-4 w-4" />
                                  Plain Text
                                </div>
                              </SelectItem>
                              <SelectItem value="markdown">
                                <div className="flex items-center gap-2">
                                  <Hash className="h-4 w-4" />
                                  Markdown
                                </div>
                              </SelectItem>
                              <SelectItem value="code">
                                <div className="flex items-center gap-2">
                                  <Code className="h-4 w-4" />
                                  Code
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-2">
                            Paste images from clipboard to add image sections
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Note Sections */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      {note.sections.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No sections yet. Add a section to get started.</p>
                        </div>
                      ) : (
                        note.sections.map((section) =>
                          renderSection(section, noteId, isEditing),
                        )
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
