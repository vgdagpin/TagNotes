import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Edit } from '@/components/tn-icons';

import { Note, Section } from "@shared/models";
import TnCanvasViewer from "./tn-canvas-viewer";
import TnCanvasMinimap from "./tn-canvas-minimap";
import { useRef } from 'react';

import "./tn-note-viewer.css";
import TnTagsPicker from "./tn-tags-picker";
import { useTagNotesContext } from "@/contexts/TagNotesContextProvider";

type TnNoteViewerProps = {
  note: Note;
  directoryLoaded: boolean | undefined;

  onTitleUpdated?: (noteId: string, newTitle: string) => void;
};

const TnNoteViewer = ({ note, directoryLoaded, onTitleUpdated }: TnNoteViewerProps) => {
  const [isDirLoaded, setIsDirLoaded] = useState<boolean | undefined>(undefined);
  const [noteTags, setNoteTags] = useState<string[]>(note.tags);
  const [newSectionId, setNewSectionId] = useState<string | null>(null);

  const tagNotesContext = useTagNotesContext();

  const [selectedNote, setSelectedNote] = useState<Note>(note);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    const checkIfHasSelectedDir = async () => {
      const hasSelectedDir = await tagNotesContext.hasSelectedDirectory();

      setIsDirLoaded(hasSelectedDir);
    }

    checkIfHasSelectedDir();
  }, [tagNotesContext]);

  useEffect(() => {
    setNoteTags(note.tags);
  }, [note.tags]);

  useEffect(() => {
    setSelectedNote(note);
  }, [note]);

  useEffect(() => {
    setIsDirLoaded(directoryLoaded);
  }, [directoryLoaded]);

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Handle image paste
  const handleImagePaste = (noteId: string, event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.type.indexOf("image") !== -1) {
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

  const handleSetTitle = (title: string) => {
    setSelectedNote((prev) => {
      return {
        ...prev,
        title: title,
        updatedAt: new Date(),
      };
    });
  };

  const saveTitle = async () => {
    if (!isDirLoaded) return;
    const newTitle = selectedNote.title;

    await tagNotesContext.updateTitle(selectedNote.id, newTitle);

    setSelectedNote((prev) => ({
      ...prev,
      title: newTitle,
      updatedAt: new Date(),
    }));

    onTitleUpdated?.(selectedNote.id, newTitle);

    setEditingTitle(false);
  };

  // Add keyboard shortcut for title editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s" && editingTitle) {
        e.preventDefault();
        saveTitle();
      }
    };

    if (editingTitle) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [editingTitle]);

  // Geometry defaults (mirrors service defaults; kept here for local optimistic state)
  const DEFAULT_WIDTH = 400;
  const DEFAULT_HEIGHT = 200;
  const DEFAULT_IMAGE_WIDTH = 400;
  const DEFAULT_IMAGE_HEIGHT = 300;

  // Add image section with default positioning
  const addImageSection = async (noteId: string, imageData: string) => {
    if (!isDirLoaded) return;

    // Position image at a default location (bottom right of existing sections)
    const existingSections = selectedNote.sections;
    const defaultX = 50 + (existingSections.length % 3) * 420;
    const defaultY = 50 + Math.floor(existingSections.length / 3) * 250;

    const newImageSection = await tagNotesContext.addImageSection(noteId, imageData, DEFAULT_IMAGE_WIDTH, DEFAULT_IMAGE_HEIGHT, defaultX, defaultY);

    setSelectedNote((prev) => ({
      ...prev,
      sections: [...prev.sections, newImageSection],
    }));

    setNewSectionId(newImageSection.id);
  };

  // Add new section to note with canvas coordinates
  const handleAddSection = async (x: number, y: number, sectionType: Section["type"]) => {
    if (!isDirLoaded) return;

    const newSection = await tagNotesContext.addSection(selectedNote.id, sectionType, DEFAULT_WIDTH, DEFAULT_HEIGHT, x, y);

    setSelectedNote((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    setNewSectionId(newSection.id);
  };

  // Handle section position changes
  const handlePositionChange = async (sectionId: string, x: number, y: number) => {
    if (!isDirLoaded) return;

    await tagNotesContext.updateSectionPosition(selectedNote.id, sectionId, x, y);

    setSelectedNote((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, x, y } : sec
      ),
    }));
  };

  // Handle section type changes
  const handleTypeChange = async (sectionId: string, newType: Section['type']) => {
    if (!isDirLoaded) return;

    await tagNotesContext.convertSectionType(selectedNote.id, sectionId, newType);

    setSelectedNote((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, type: newType } : sec
      ),
    }));
  };

  // Handle section dimension changes
  const handleDimensionChange = async (sectionId: string, width: number, height: number) => {
    if (!isDirLoaded) return;

    await tagNotesContext.updateSectionDimensions(selectedNote.id, sectionId, width, height);

    setSelectedNote((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, width, height } : sec
      ),
    }));
  };

  // Save section changes
  const handleSaveSection = async (sectionId: string, content: string, language?: string | null) => {
    if (!isDirLoaded) return;

    await tagNotesContext.updateSectionContent(note.id, sectionId, content, language);

    setSelectedNote((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => (sec.id === sectionId ? { ...sec, content, language } : sec)),
    }));

    setNewSectionId(null);
  };

  // Delete section
  const handleDeleteSection = async (sectionId: string) => {
    if (!isDirLoaded) return;

    await tagNotesContext.deleteSection(note.id, sectionId);

    setSelectedNote((prev) => ({
      ...prev,
      sections: prev.sections.filter((sec) => sec.id !== sectionId),
    }));

    setNewSectionId(null);
  };

  const handleTagsUpdated = (tags: string[]) => {
    setSelectedNote((prev) => ({
      ...prev,
      tags,
    }));
  };

  return (
    <div
      key={selectedNote.id}
      className="h-full flex flex-col min-w-0 w-full"
      onPaste={(e) => handleImagePaste(selectedNote.id, e.nativeEvent)}
    >
      <div className="note-viewer-container">
        {/* Note Header */}
        <div className="p-4 border-b border-border bg-card group relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Editable Title */}
              <div className="flex items-center gap-2 mb-1">
                {editingTitle ? (
                  <Input
                    value={selectedNote.title}
                    onChange={(e) => handleSetTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveTitle();
                      } else if (e.key === "Escape") {
                        // setTitleContents((prev) => ({
                        //     ...prev,
                        //     [noteId]: note.title,
                        // }));
                        setEditingTitle(false);
                      }
                    }}
                    onBlur={() => saveTitle()}
                    className="text-xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-1 focus-visible:ring-ring"
                    autoFocus
                  />
                ) : (
                  <>
                    <h2
                      className="text-xl font-semibold text-foreground cursor-pointer hover:bg-accent hover:bg-opacity-50 rounded px-1 py-0.5 -mx-1 transition-colors"
                      onClick={() => setEditingTitle(true)}
                      title="Click to edit title"
                    >
                      {selectedNote.title}
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditingTitle(true)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Updated {formatDate(selectedNote.updatedAt)}
              </p>

              <TnTagsPicker noteId={selectedNote.id} noteTags={noteTags} directoryLoaded={isDirLoaded} onTagsUpdated={handleTagsUpdated} />

            </div>
            {/* Minimap container (outside canvas, near title bar) */}
            <div className="pt-1 hidden md:block">
              <TnCanvasMinimap
                sections={selectedNote.sections}
                canvasRef={canvasRef}
                width={220}
                height={150}
              />
            </div>
          </div>
        </div>

        {/* Canvas Viewer with overlay minimap */}
        <div className="flex-1 min-w-0 w-full relative">
          <TnCanvasViewer
            note={selectedNote}
            newSectionId={newSectionId}
            onAddSection={handleAddSection}
            onSaveSection={handleSaveSection}
            onDeleteSection={handleDeleteSection}
            onPositionChange={handlePositionChange}
            onDimensionChange={handleDimensionChange}
            onTypeChange={handleTypeChange}
            forwardCanvasRef={canvasRef}
          />
        </div>
      </div>
    </div>
  );
};

export default TnNoteViewer;
