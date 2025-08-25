import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  X,
  FileText,
  Edit3,
  Trash2,
  Tag,
  Hash,
  Code,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Note, Section } from "@shared/api";
import TnSection from "@/components/tagnotes/tn-section";

export default function Index() {
  // State management
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [openTabs, setOpenTabs] = useState<string[]>(["1"]); // Start with first note open
  const [activeTab, setActiveTab] = useState("1");
  const [noteTags, setNoteTags] = useState<Record<string, string[]>>({});
  const [sectionContents, setSectionContents] = useState<Record<string, string>>({});
  const [sectionLanguages, setSectionLanguages] = useState<Record<string, string>>({});
  const [editingSections, setEditingSections] = useState<Set<string>>(
    new Set(),
  );
  const [editingTitles, setEditingTitles] = useState<Set<string>>(new Set());
  const [titleContents, setTitleContents] = useState<Record<string, string>>({},);

  // Fetch notes from API on mount
  useEffect(() => {
    const fetchNotes = async (search: string) => {
      const res = await axios.get(`/api/notes?search=${encodeURIComponent(search)}`);
      const data = res.data;
      setNotes(
        data.result.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
          sections: note.sections ? note.sections.map((section: any) => ({
            ...section,
            createdAt: new Date(section.createdAt),
          })) : [],
        }))
      );
    };

    const handler = setTimeout(() => { fetchNotes(searchQuery);}, 500);

    return () => clearTimeout(handler);

  }, [searchQuery]);

  // Initialize note tags, section contents, and title contents for editing
  useEffect(() => {
    const tags: Record<string, string[]> = {};
    const contents: Record<string, string> = {};
    const languages: Record<string, string> = {};
    const titles: Record<string, string> = {};
    notes.forEach((note) => {
      tags[note.id] = [...note.tags];
      titles[note.id] = note.title;
      note.sections.forEach((section) => {
        contents[section.id] = section.content;
        if (section.language) {
          languages[section.id] = section.language;
        }
      });
    });
    setNoteTags(tags);
    setSectionContents(contents);
    setSectionLanguages(languages);
    setTitleContents(titles);
  }, [notes]);

  // // Filtered notes based on search
  // const filteredNotes = useMemo(() => {
  //   if (!searchQuery.trim()) return notes;

  //   const query = searchQuery.toLowerCase();
  //   return notes.filter(
  //     (note) =>
  //       note.title.toLowerCase().includes(query) ||
  //       note.sections.some((section) =>
  //         section.content.toLowerCase().includes(query),
  //       ) ||
  //       note.tags.some((tag) => tag.toLowerCase().includes(query)),
  //   );
  // }, [notes, searchQuery]);

  // Generate new ID
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).slice(2, 11);
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

    axios.post('/api/notes', newNote);

    setNotes((prev) => [newNote, ...prev]);
    setNoteTags((prev) => ({ ...prev, [newNote.id]: [] }));
    setSectionContents((prev) => ({ ...prev, [newNote.sections[0].id]: "" }));

    // Open the new note in a tab
    if (!openTabs.includes(newNote.id)) {
      setOpenTabs((prev) => [...prev, newNote.id]);
    }
    setActiveTab(newNote.id);
    setEditingSections((prev) => new Set([...prev, newNote.sections[0].id]));
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

    axios.post(`/api/notes/${noteId}/addSection`, newSection);

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
    if (!window.confirm("Are you sure you want to delete this section? This action cannot be undone.")) return;

    axios.delete(`/api/notes/${noteId}/deleteSection/${sectionId}`);

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
    setSectionLanguages((prev) => ({ ...prev, [sectionId]: language }));

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
  const saveSection = (noteId: string, sectionId: string) => {
    const content = sectionContents[sectionId] || "";
    const language = sectionLanguages[sectionId] || "";

    axios.put(`/api/notes/${noteId}/updateSection/${sectionId}/content`, { content });

    if (language) {
      axios.put(`/api/notes/${noteId}/updateSection/${sectionId}/language`, { language });
    }

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

    axios.post(`/api/notes/${noteId}/addSection`, newSection);

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
  };

  // Toggle title edit mode
  const toggleTitleEdit = (noteId: string) => {
    setEditingTitles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Update title content
  const updateTitleContent = (noteId: string, title: string) => {
    setTitleContents((prev) => ({ ...prev, [noteId]: title }));
  };

  // Save title changes
  const saveTitle = (noteId: string) => {
    const title = titleContents[noteId]?.trim() || "Untitled";

    axios.put(`/api/notes/${noteId}/setTitle`, { title });

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, title, updatedAt: new Date() } : note,
      ),
    );

    setEditingTitles((prev) => {
      const newSet = new Set(prev);
      newSet.delete(noteId);
      return newSet;
    });
  };

  // Save note changes (mainly for tags)
  const saveNote = (noteId: string) => {
    const tags = noteTags[noteId] || [];

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, tags, updatedAt: new Date() } : note,
      ),
    );
  };

  // Delete note
  const deleteNote = (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;

    axios.delete(`/api/notes/${noteId}`);

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

    axios.post(`/api/notes/${noteId}/tags`, { tag: trimmedTag });

    setNoteTags((prev) => {
      const currentTags = prev[noteId] || [];
      if (currentTags.includes(trimmedTag)) return prev;
      return { ...prev, [noteId]: [...currentTags, trimmedTag] };
    });
  };

  // Remove tag from note
  const removeTagFromNote = (noteId: string, tagToRemove: string) => {
    if (!window.confirm(`Remove tag \"${tagToRemove}\" from this note?`)) return;

    axios.delete(`/api/notes/${noteId}/tags/${tagToRemove}`);

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
              placeholder="Search notes or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? "No notes found" : "No notes yet"}
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                onClick={() => openNoteInTab(note.id)}
                className={cn(
                  "px-2 py-1 border-b border-border cursor-pointer hover:bg-accent transition-colors group",
                  activeTab === note.id && "bg-accent",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-normal text-sm text-foreground truncate">
                      {note.title}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
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

                return (
                  <TabsContent
                    key={noteId}
                    value={noteId}
                    className="h-full mt-0 data-[state=active]:flex flex-col"
                    onPaste={(e) => {
                      handleImagePaste(noteId, e.nativeEvent);
                    }}
                  >
                    {/* Note Header */}
                    <div className="p-4 border-b border-border bg-card group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Editable Title */}
                          <div className="flex items-center gap-2 mb-1">
                            {editingTitles.has(noteId) ? (
                              <Input
                                value={titleContents[noteId] || note.title}
                                onChange={(e) =>
                                  updateTitleContent(noteId, e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    saveTitle(noteId);
                                  } else if (e.key === "Escape") {
                                    setTitleContents((prev) => ({
                                      ...prev,
                                      [noteId]: note.title,
                                    }));
                                    toggleTitleEdit(noteId);
                                  }
                                }}
                                onBlur={() => saveTitle(noteId)}
                                className="text-xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-1 focus-visible:ring-ring"
                                autoFocus
                              />
                            ) : (
                              <>
                                <h2
                                  className="text-xl font-semibold text-foreground cursor-pointer hover:bg-accent hover:bg-opacity-50 rounded px-1 py-0.5 -mx-1 transition-colors"
                                  onClick={() => toggleTitleEdit(noteId)}
                                  title="Click to edit title"
                                >
                                  {note.title}
                                </h2>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => toggleTitleEdit(noteId)}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Updated {formatDate(note.updatedAt)}
                          </p>

                          {/* Tags Section */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Tag className="h-4 w-4" />
                              Tags
                            </div>

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

                              {/* Display Tags */}
                              <div className="flex flex-wrap gap-2">
                                {(noteTags[noteId] || note.tags).map((tag) => (
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
                                {(noteTags[noteId] || note.tags).length ===
                                  0 && (
                                    <span className="text-muted-foreground italic text-sm">
                                      No tags yet
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
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

                    {/* Note Sections */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      {note.sections.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>
                            No sections yet. Add a section below to get started.
                          </p>
                        </div>
                      ) : (
                        note.sections.map((section) =>
                          <TnSection
                            key={section.id}
                            section={section}
                            isEditingSection={editingSections.has(section.id)}
                            noteId={noteId}
                            onToggleSectionEdit={(sectionId) => toggleSectionEdit(sectionId)}
                            onSaveSection={(sectionId) => saveSection(noteId, sectionId)}
                            onDeleteSection={(noteId, sectionId) => deleteSection(noteId, sectionId)}
                            onUpdateSectionLanguage={(sectionId, language) => updateSectionLanguage(sectionId, language)}
                            onUpdateSectionContent={(sectionId, content) => updateSectionContent(sectionId, content)}
                          />
                        )
                      )}

                      {/* Add Section Dropdown - At Bottom */}
                      <div className="pt-8 border-t border-border">
                        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                          <Plus className="h-4 w-4" />
                          Add New Section
                        </div>
                        <Select
                          onValueChange={(value) =>
                            addSection(noteId, value as Section["type"])
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose section type..." />
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
