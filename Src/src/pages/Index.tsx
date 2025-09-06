import { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import { Button } from "@/components/ui/button";
// Tabs removed – single note view

import { Plus, FileText } from "@/components/tn-icons";

import {
  listNotes as listNotesLocal,
  createNote as createLocalNote,
  getNote as getLocalNote,
  deleteNote as deleteLocalNote
} from "@/lib/notesClient";

import TnNoteViewer from "@/components/ui/tn-note-viewer";
import TnSettings from "@/components/ui/tn-settings";
import { Hamburger } from "@fluentui/react-components";

import './Index.css'
import { NoteSummary } from "@/shared/models";
import TnNavigation from "@/components/ui/tn-navigation";
import { useTagNotesContext } from "@/contexts/TagNotesContextProvider";

export default function Index() {
  // Notes list (id/title only). Full note loaded in viewer.
  const [navOpen, setNavOpen] = useState(true);

  const [isDirectoryLoaded, setIsDirectoryLoaded] = useState<boolean | undefined>(undefined);

  const [allNotes, setAllNotes] = useState<NoteSummary[]>([]);

  const [activeView, setActiveView] = useState<string | null>(null); // note id or 'settings'
  const [missingNote, setMissingNote] = useState<boolean | undefined>(undefined);
  const navigate = useNavigate();
  const { noteId } = useParams();

  const tagNotesContext = useTagNotesContext();

  useEffect(() => {
    const checkIfHasSelectedDir = async () => {
      const hasSelectedDir = await tagNotesContext.hasSelectedDirectory();

      setIsDirectoryLoaded(hasSelectedDir);    
    }

    checkIfHasSelectedDir();

    window.addEventListener('tagnotes:directoryChanged', () => {
      setIsDirectoryLoaded(true);
    });
  }, [tagNotesContext]);

  useEffect(() => {
    if (isDirectoryLoaded) {
      const list = async () => {
        const list = await listNotesLocal();
        list.sort((a, b) => (b.createdAt as any).getTime() - (a.createdAt as any).getTime());
        setAllNotes(list);
      };

      list();
    }
  }, [isDirectoryLoaded]);

  // When a noteId is in the URL but note metadata list doesn't include it yet, attempt preload
  useEffect(() => {
    const preload = async () => {
      if (!noteId || noteId === 'settings') return;
      if (!isDirectoryLoaded) return; // wait for local mode (don't mark missing yet)
      const exists = allNotes.some(n => n.id === noteId);

      setMissingNote(!exists);
    };

    preload();

  }, [noteId, allNotes, isDirectoryLoaded]);

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
      <TnNavigation
        openNavigation={navOpen}
        directoryLoaded={isDirectoryLoaded}
        notes={allNotes}
        currentActiveView={activeView}
        onOpenSettings={openSettings}
        onOpenNote={openNote}
        onDeleteNote={deleteNote}
        onCreateNote={createNote}
      />

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
            ) : missingNote === true ? (
              <NotFound />
            ) : (
              <TnNoteViewer
                noteId={activeView}
                directoryLoaded={isDirectoryLoaded}
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
