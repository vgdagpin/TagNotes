import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Search,
  Plus,
  X,
  FileText,
  Trash,
  Settings,
} from "../components/tn-icons";

import { cn } from "@/lib/utils";
import {
  listNotes as listNotesLocal,
  createNote as createLocalNote,
  getNote as getLocalNote,
  isLocalMode,
  tryRestoreLocalMode,
  deleteNote as deleteLocalNote
} from "@/lib/notesClient";
import TnNoteViewer from "@/components/tagnotes/tn-note-viewer";
import TnSettings from "@/components/tagnotes/tn-settings";

export default function Index() {
  // Notes list (id/title only). Full note loaded in viewer.
  const [notes, setNotes] = useState<{ id: string; title: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openTabs, setOpenTabs] = useState<string[]>(["1"]); // Start with first note open
  const [activeTab, setActiveTab] = useState("1");

  // Fetch notes from API on mount
  useEffect(() => {
    let active = true;
    const run = async () => {
      // First attempt silent restore once (only on initial mount or when no local mode yet)
      if (!isLocalMode()) {
        try { await tryRestoreLocalMode(); } catch { /* ignore */ }
      }
      try {
        if (isLocalMode()) {
          const list = await listNotesLocal(searchQuery);
          if (active) setNotes(list);
        } else {
          // no server mode; wait for user to enable local folder
          if (active) setNotes([]);
        }
      } catch { /* ignore */ }
    };
    const h = setTimeout(run, 300);
    return () => { active = false; clearTimeout(h); };
  }, [searchQuery]);

  // Generate new ID
  // generateId removed (no server fallback)

  // Create new note with default section
  const createNote = async () => {
    if (!isLocalMode()) {
      alert('Select a local folder first');
      return;
    }
    const note = await createLocalNote({});
    setNotes(prev => [{ id: note.id, title: note.title }, ...prev]);
    if (!openTabs.includes(note.id)) setOpenTabs(prev => [...prev, note.id]);
    setActiveTab(note.id);
  };

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

  // Delete note
  const deleteNote = async (noteId: string) => {
  if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;
  if (!isLocalMode()) return;
  await deleteLocalNote(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    closeTab(noteId);
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Sidebar - Navigation */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              TagNotes {isLocalMode() && <span className="text-xs text-green-600 border rounded px-1">Local</span>}
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
          {/* Removed 'Use Local Folder' button; directory selection now in Settings */}

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
                  <TnNoteViewer
                    key={tabId}
                    noteId={tabId}
                    onDeleteNote={deleteNote}
                    onTitleUpdated={(id, newTitle) => {
                      setNotes(prev => prev.map(n => n.id === id ? { ...n, title: newTitle } : n));
                    }}
                  />
                );
              })}
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
}
