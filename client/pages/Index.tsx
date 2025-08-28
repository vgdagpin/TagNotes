import { useState, useEffect } from "react";
import axios from "axios"; // server fallback
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import {
  Search,
  Plus,
  X,
  FileText,
  Trash,
  Settings,
} from "../components/tn-icons";

import { cn } from "@/lib/utils";
import { Note, Section } from "@shared/api";
import {
  listNotes as listNotesLocal,
  createNote as createLocalNote,
  getNote as getLocalNote,
  enableLocalMode,
  isLocalMode,
} from "@/lib/notesClient";
import TnNoteViewer from "@/components/tagnotes/tn-note-viewer";
import TnSettings from "@/components/tagnotes/tn-settings";

export default function Index() {
  // Notes list (id/title only). Full note loaded in viewer.
  const [notes, setNotes] = useState<{ id: string; title: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openTabs, setOpenTabs] = useState<string[]>(["1"]); // Start with first note open
  const [activeTab, setActiveTab] = useState("1");
  const [noteTags, setNoteTags] = useState<Record<string, string[]>>({});
  const [sectionContents, setSectionContents] = useState<
    Record<string, string>
  >({});
  const [sectionLanguages, setSectionLanguages] = useState<
    Record<string, string>
  >({});
  const [editingSections, setEditingSections] = useState<Set<string>>(
    new Set(),
  );
  const [editingTitles, setEditingTitles] = useState<Set<string>>(new Set());
  const [titleContents, setTitleContents] = useState<Record<string, string>>(
    {},
  );

  // Fetch notes from API on mount
  useEffect(() => {
    let active = true;
    const fetchList = async () => {
      try {
        if (isLocalMode()) {
          const list = await listNotesLocal(searchQuery);
          if (active) setNotes(list);
        } else {
          const res = await axios.get(`/api/notes?search=${encodeURIComponent(searchQuery)}`);
          const data = res.data;
            // server returns id/title only (performance)
          if (active) setNotes(data.result.map((n: any)=>({ id: n.id, title: n.title })));
        }
      } catch (e) {
        // ignore
      }
    };
    const h = setTimeout(fetchList, 400);
    return () => { active = false; clearTimeout(h); };
  }, [searchQuery]);

  // Initialize note tags, section contents, and title contents for editing
  useEffect(() => {
    setNoteTags({});
    setSectionContents({});
    setSectionLanguages({});
    setTitleContents({});
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
  const createNote = async () => {
    if (isLocalMode()) {
      const note = await createLocalNote({});
      setNotes(prev => [{ id: note.id, title: note.title }, ...prev]);
      if (!openTabs.includes(note.id)) setOpenTabs(prev => [...prev, note.id]);
      setActiveTab(note.id);
      return;
    }
    const newNote: Note = {
      id: generateId(),
      title: "New Note",
      sections: [ { id: generateId(), type: "text", content: "", createdAt: new Date() } ],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await axios.post("/api/notes", newNote);
    setNotes(prev => [{ id: newNote.id, title: newNote.title }, ...prev]);
    if (!openTabs.includes(newNote.id)) setOpenTabs(prev => [...prev, newNote.id]);
    setActiveTab(newNote.id);
  };

  // Add new section to note
  const addSection = (_noteId: string, _sectionType: Section["type"]) => {
    // handled inside viewer for local mode; server mode viewer triggers axios
  };

  // Delete section
  const deleteSection = (_noteId: string, _sectionId: string) => {};

  // Update section content
  const updateSectionContent = (_sectionId: string, _content: string) => {};

  // Update section language (for code sections)
  const updateSectionLanguage = (_sectionId: string, _language: string) => {};

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
  const saveSection = (_noteId: string, _sectionId: string) => {};

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
  const addImageSection = (_noteId: string, _imageData: string) => {};

  // Open note in tab
  const openNoteInTab = async (noteId: string) => {
    if (!openTabs.includes(noteId)) setOpenTabs(prev => [...prev, noteId]);
    setActiveTab(noteId);
    // prefetch in local mode (optional)
    if (isLocalMode()) {
      try { await getLocalNote(noteId); } catch {}
    }
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

  // Open settings in tab
  const openSettings = () => {
    const settingsId = "settings";
    if (!openTabs.includes(settingsId)) {
      setOpenTabs((prev) => [...prev, settingsId]);
    }
    setActiveTab(settingsId);
  };

  // Close settings tab
  const closeSettings = () => {
    closeTab("settings");
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
    if (!title) return;
    // viewer handles updating in local mode; list needs title update
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, title } : n));
    setEditingTitles(prev => { const ns = new Set(prev); ns.delete(noteId); return ns; });
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
  const deleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;
    if (isLocalMode()) {
      const { deleteNote: deleteLocal } = await import("@/lib/notesClient");
      await deleteLocal(noteId);
    } else {
      axios.delete(`/api/notes/${noteId}`);
    }
    setNotes(prev => prev.filter(n => n.id !== noteId));
    closeTab(noteId);
  };

  // Add tag to note
  const addTagToNote = (_noteId: string, _tag: string) => {};

  // Remove tag from note
  const removeTagFromNote = (_noteId: string, _tagToRemove: string) => {};

  // Format date for display
  const formatDate = (date: Date) => new Intl.DateTimeFormat("en-US", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);

  // Get preview text for sidebar
  const getPreviewText = (_sections: Section[]) => "";

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Sidebar - Navigation */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes {isLocalMode() && <span className="text-xs text-green-600 border rounded px-1">Local</span>}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={openSettings}
              title="Open Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          {!isLocalMode() && (
            <Button variant="outline" size="sm" className="mb-2 w-full" onClick={() => enableLocalMode()}>
              Use Local Folder
            </Button>
          )}

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
                    <Trash className="h-3 w-3" />
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
      <div className="flex-1 flex flex-col min-w-0">
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
            <div className="border-b border-border bg-card px-4 overflow-x-auto">
              <TabsList className="h-12 p-0 bg-transparent w-max min-w-full">
                {openTabs.map((tabId) => {
                  // Handle settings tab
                  if (tabId === "settings") {
                    return (
                      <div key="settings" className="flex items-center">
                        <TabsTrigger
                          value="settings"
                          className="relative pr-8 max-w-48"
                        >
                          <div className="flex items-center gap-2">
                            <Settings className="h-3 w-3" />
                            <span className="truncate">Settings</span>
                          </div>
                        </TabsTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 -ml-6 z-10"
                          onClick={closeSettings}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  }

                  // Handle note tabs
                  const note = notes.find(n => n.id === tabId);
                  if (!note) return null;

                  return (
                    <div key={tabId} className="flex items-center">
                      <TabsTrigger
                        value={tabId}
                        className="relative pr-8 max-w-48"
                      >
                        <span className="truncate">{note.title}</span>
                      </TabsTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -ml-6 z-10"
                        onClick={() => closeTab(tabId)}
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
            <div className="flex-1 min-w-0 overflow-hidden">
              {openTabs.map((tabId) => {
                // Handle settings tab
                if (tabId === "settings") {
                  return <TnSettings key="settings" onClose={closeSettings} />;
                }

                // Handle note tabs
                const note = notes.find(n => n.id === tabId);
                if (!note) return null;

                return (
                  <TnNoteViewer key={tabId} noteId={tabId} onDeleteNote={deleteNote} />
                );
              })}
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
}
