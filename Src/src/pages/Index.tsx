import { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// Tabs removed – single note view

import { Search, Plus, FileText, Trash, Settings } from "../components/tn-icons";

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
  const [activeView, setActiveView] = useState<string | null>(null); // note id or 'settings'
  const navigate = useNavigate();
  const { noteId } = useParams();

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
    setActiveView(note.id);
    navigate(`/${note.id}`);
  };

  // Open note in tab
  const openNote = async (noteId: string) => {
    setActiveView(noteId);
    navigate(`/${noteId}`);
    if (isLocalMode()) {
      try { await getLocalNote(noteId); } catch {}
    }
  };

  // Close tab
  // (closeCurrent removed – no external caller yet)

  // Open settings in tab
  const openSettings = () => { setActiveView("settings"); navigate('/settings'); };

  // Close settings tab
  const closeSettings = () => { if (activeView === "settings") { setActiveView(null); navigate('/'); } };

  // Delete note
  const deleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;
    if (!isLocalMode()) return;
    await deleteLocalNote(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  if (activeView === noteId) { setActiveView(null); navigate('/'); }
  };

  // Auto-open first note if none selected
  useEffect(() => {
    // Sync active view only when a route param is present; otherwise leave blank state.
    if (noteId) {
      if (noteId === 'settings') {
        if (activeView !== 'settings') setActiveView('settings');
      } else if (activeView !== noteId) {
        setActiveView(noteId);
      }
    }
  }, [noteId, activeView]);

  // When a noteId is in the URL but note metadata list doesn't include it yet, attempt preload
  useEffect(() => {
    const preload = async () => {
      if (!noteId || noteId === 'settings') return;
      if (!isLocalMode()) return; // wait for local mode
      const exists = notes.some(n => n.id === noteId);
      if (!exists) {
        try {
          const full = await getLocalNote(noteId);
          // add minimal metadata if fetch succeeded
          setNotes(prev => [{ id: full.id, title: full.title }, ...prev]);
        } catch { /* ignore */ }
      }
    };
    preload();
  }, [noteId, notes]);

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
                onClick={() => openNote(note.id)}
                className={cn(
                  "px-2 py-1 border-b border-border cursor-pointer hover:bg-accent transition-colors group",
                  activeView === note.id && "bg-accent",
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

      {/* Right Main Content - Single View */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeView ? (
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
        ) : activeView === 'settings' ? (
          <TnSettings onClose={closeSettings} />
        ) : (
          <TnNoteViewer
            noteId={activeView}
            onDeleteNote={deleteNote}
            onTitleUpdated={(id, newTitle) => {
              setNotes(prev => prev.map(n => n.id === id ? { ...n, title: newTitle } : n));
            }}
          />
        )}
      </div>
    </div>
  );
}
