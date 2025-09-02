import { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// Tabs removed – single note view

import { Search, Plus, FileText, Trash, Settings } from "@/components/tn-icons";

import { cn } from "@/lib/utils";
import {
  listNotes as listNotesLocal,
  createNote as createLocalNote,
  getNote as getLocalNote,
  isLocalMode,
  getPersistedDirectoryHandle,
  tryRestoreLocalMode,
  deleteNote as deleteLocalNote
} from "@/lib/notesClient";

import TnNoteViewer from "@/components/tagnotes/tn-note-viewer";
import TnSettings from "@/components/tagnotes/tn-settings";
import { Hamburger, NavDrawer, NavDrawerBody, NavDrawerHeader } from "@fluentui/react-components";

import './Index.css'
import { NoteSummary } from "@/shared/models";

export default function Index() {
  // Notes list (id/title only). Full note loaded in viewer.
  const [navOpen, setNavOpen] = useState(true);

  const [isDirectoryLoaded, setIsDirectoryLoaded] = useState<boolean | undefined>(undefined);

  const [allNotes, setAllNotes] = useState<NoteSummary[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<NoteSummary[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<string | null>(null); // note id or 'settings'
  const [missingNote, setMissingNote] = useState(false); // true when noteId param doesn't resolve
  const navigate = useNavigate();
  const { noteId } = useParams();  

  useEffect(() => {
    let localMode = isLocalMode();

    const tryGetPersistedDirectoryHandle = async () => {
      const dir = await getPersistedDirectoryHandle();

      setIsDirectoryLoaded(!!dir);
    }

    if (!localMode) {
      tryGetPersistedDirectoryHandle();
    }

    setIsDirectoryLoaded(localMode);

    // Listen for directory selection changes -> refresh list immediately
    const onDirChanged = async () => {
      setIsDirectoryLoaded(true);
    };

    window.addEventListener('tagnotes:directoryChanged', onDirChanged as any);
  }, []);

  useEffect(() => {
    if (isDirectoryLoaded) {
      const list = async () => {
        console.log('list 1');
        const list = await listNotesLocal();
        setAllNotes(list);
      };

      list();
    }
  }, [isDirectoryLoaded]);

  // Fetch notes from API on mount
  useEffect(() => {
    let active = true;
    const run = async () => {
      // First attempt silent restore once (only on initial mount or when no local mode yet)
      if (isDirectoryLoaded === undefined) {
        try { await tryRestoreLocalMode(); } catch { /* ignore */ }
      }

      try {
        if (isDirectoryLoaded) {
        console.log('list 2');
          let list = allNotes;

          if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(n => n.title.toLowerCase().includes(q) || n.tags.some(t => t.includes(q)));
          }
          if (active) setFilteredNotes(list);
        } else {
          if (active) setFilteredNotes([]);
        }
      } catch { /* ignore */ }
    };
    const h = setTimeout(run, 300);
    return () => { active = false; clearTimeout(h); };
  }, [searchQuery, isDirectoryLoaded, allNotes]);

  // When a noteId is in the URL but note metadata list doesn't include it yet, attempt preload
  useEffect(() => {
    const preload = async () => {
      if (!noteId || noteId === 'settings') return;
      if (!isDirectoryLoaded) return; // wait for local mode (don't mark missing yet)
      const exists = allNotes.some(n => n.id === noteId);
      
      setMissingNote(!exists);
    };

    preload();

  }, [noteId, allNotes, searchQuery, isDirectoryLoaded]);

  // Create new note with default section
  const createNote = async () => {
    if (!isDirectoryLoaded) {
      alert('Select a local folder first');
      return;
    }
    const note = await createLocalNote({});

    setAllNotes(prev => [{ 
      id: note.id, 
      title: note.title, 
      createdAt: note.createdAt, 
      updatedAt: note.updatedAt, 
      location: note.location!, 
      tags: note.tags 
    }, ...prev]);
    
    setActiveView(note.id);
    navigate(`/${note.id}`);
  };

  // Open note in tab
  const openNote = async (noteId: string) => {
    setActiveView(noteId);
    navigate(`/${noteId}`);
    if (isDirectoryLoaded) {
      try { await getLocalNote(noteId); } catch { }
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
    if (!isDirectoryLoaded) return;
    await deleteLocalNote(noteId);
    setAllNotes(prev => prev.filter(n => n.id !== noteId));
    if (activeView === noteId) { setActiveView(null); navigate('/'); }
  };

  // Auto-open first note if none selected
  useEffect(() => {
    // Sync active view only when a route param is present; otherwise leave blank state.
    if (noteId) {
      if (noteId === 'settings') {
        if (activeView !== 'settings') setActiveView('settings');
        setMissingNote(false);
      } else if (activeView !== noteId) {
        setActiveView(noteId);
        // optimistic reset; actual existence checked in preload effect
        setMissingNote(false);
      }
    } else {
      setMissingNote(false);
    }
  }, [noteId, activeView]);  

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <NavDrawer open={navOpen} type={'inline'}>
        <NavDrawerHeader>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              TagNotes {isDirectoryLoaded && <span className="text-xs text-green-600 border rounded px-1">Local</span>}
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
        </NavDrawerHeader>
        <NavDrawerBody>

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

          {/* Create Note Button (only when local mode is active) */}
          {isDirectoryLoaded && (
            <div className="p-4 border-t border-border">
              <Button onClick={createNote} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </div>
          )}

        </NavDrawerBody>
      </NavDrawer>

      <div className="flex-1 flex flex-col min-w-0">
        <Hamburger onClick={() => setNavOpen(!navOpen)} />
        {
          isDirectoryLoaded ? (
            !activeView ? (
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
            ) : missingNote ? (
                <NotFound />
            ) : (
                  <TnNoteViewer
                    noteId={activeView}
                    onTitleUpdated={(id, newTitle) => {
                      setAllNotes(prev => prev.map(n => n.id === id ? { ...n, title: newTitle } : n));
                    }}
                  />
                )
          ) : (activeView === 'settings' ? (<TnSettings onClose={closeSettings} />) : <></>)

        }


      </div>
    </div>
  );
}
