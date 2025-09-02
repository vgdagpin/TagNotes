import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Edit, Plus, X, FileText, Hash, Type, Trash, Code } from '@/components/tn-icons';

import TnSection from "./tn-section";
import { Note, Section } from "@shared/models";
import {
  getNote as getLocalNote,
  addTag as addTagLocal,
  removeTag as removeTagLocal,
  deleteNote as deleteNoteLocal,
  addSection as addSectionLocal,
  addImageSection as addImageSectionLocal,
  updateSectionContent as updateSectionContentLocal,
  updateSectionLanguage as updateSectionLanguageLocal,
  updateTitle as updateTitleLocal,
  isLocalMode,
} from "@/lib/notesClient";
import TnSectionCode from "./tn-section-code";
import TnSectionMarkdown from "./tn-section-markdown";
import TnSectionImage from "./tn-section-image";

import "./tn-note-viewer.css";
import TnTagsPicker from "./tn-tags-picker";

type TnNoteViewerProps = {
  noteId: string;

  onDeleteNote?: (noteId: string) => void;
  onTitleUpdated?: (noteId: string, newTitle: string) => void;
};

const TnNoteViewer = ({ noteId, onDeleteNote, onTitleUpdated }: TnNoteViewerProps) => {
  const [note, setNote] = useState<Note>({
    id: noteId,
    title: "",
    tags: [],
    sections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [editingTitle, setEditingTitle] = useState(false);
  const localMode = isLocalMode();

  useEffect(() => {
    let active = true;
    const fetchNote = async () => {
      try {
        if (!localMode) return;
        const data = await getLocalNote(noteId);
        if (!active) return;
        setNote(data);
      } catch { }
    };
    fetchNote();
    return () => { active = false; };
  }, [noteId, localMode]);

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Generate new ID
  // generateId removed (no server-created placeholder sections)

  // Add tag to note
  const addTagToNote = (noteId: string, tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) return;
    if (!isLocalMode()) return;
    addTagLocal(noteId, trimmedTag).then(updated => setNote(updated));
  };

  const handleAddTag = async (tag: string) => {
     const updated = await addTagLocal(noteId, tag);
     setNote(updated);
  };

  const handleRemoveTag = async (tag: string) => {
     const updated = await removeTagLocal(noteId, tag);
     setNote(updated);
  }

  // Delete note
  const deleteNote = (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;
    if (!isLocalMode()) return;
    deleteNoteLocal(noteId).then(() => onDeleteNote?.call(null, noteId));
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

  // Add image section
  const addImageSection = (noteId: string, imageData: string) => {
    if (!isLocalMode()) return;
    addImageSectionLocal(noteId, imageData).then(updated => setNote(updated));
  };

  const handleSetTitle = (title: string) => {
    setNote((prev) => {
      return {
        ...prev,
        title: title,
        updatedAt: new Date(),
      };
    });
  };

  const saveTitle = () => {
    if (!isLocalMode()) return;
    const newTitle = note.title;
    updateTitleLocal(note.id, newTitle).then(updated => {
      setNote(updated);
      onTitleUpdated?.(updated.id, updated.title);
    });
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

  // Add new section to note
  const addSection = (noteId: string, sectionType: Section["type"]) => {
    if (!isLocalMode()) return;
    addSectionLocal(noteId, sectionType).then(updated => setNote(updated));
  };

  // Save section changes
  const saveSection = (sectionId: string, content: string, language?: string | null) => {
    if (!isLocalMode()) return;
    updateSectionContentLocal(note.id, sectionId, content).then(updated => setNote(updated));
    if (language) updateSectionLanguageLocal(note.id, sectionId, language).then(updated => setNote(updated));
  };

  // Delete section
  const deleteSection = (sectionId: string) => {
    if (!isLocalMode()) return;
    import("@/lib/notesClient").then(m => m.deleteSection(note.id, sectionId).then(updated => setNote(updated)));
  };

  return (
    <div
      key={noteId}
      className="h-full flex flex-col min-w-0 w-full"
      onPaste={(e) => handleImagePaste(noteId, e.nativeEvent)}
    >
      <div className="note-viewer-container">
        {/* Note Header */}
        <div className="p-4 border-b border-border bg-card group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Editable Title */}
              <div className="flex items-center gap-2 mb-1">
                {editingTitle ? (
                  <Input
                    value={note.title}
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
                      {note.title}
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
                Updated {formatDate(note.updatedAt)}
              </p>

              <TnTagsPicker note={note} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} />

            </div>

            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteNote(noteId)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Note Sections */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 min-w-0 w-full">
          {note.sections.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sections yet. Add a section below to get started.</p>
            </div>
          ) : (
            note.sections.map((section) => {
              if (section.type === "code") {
                return (
                  <TnSectionCode
                    key={section.id}
                    section={section}
                    onSaveSection={(content, language) => saveSection(section.id, content, language)}
                    onDeleteSection={(sectionId) => deleteSection(sectionId)}
                  />
                );
              } else if (section.type === "markdown") {
                return (
                  <TnSectionMarkdown
                    key={section.id}
                    section={section}
                    onSaveSection={(content, language) => saveSection(section.id, content, language)}
                    onDeleteSection={(sectionId) => deleteSection(sectionId)}
                  />
                );
              } else if (section.type === "image") {
                return (
                  <TnSectionImage
                    key={section.id}
                    section={section}
                    onDeleteSection={(sectionId) => deleteSection(sectionId)}
                  />
                );
              } else {
                return (
                  <TnSection
                    key={section.id}
                    section={section}
                    onSaveSection={(content, language) => saveSection(section.id, content, language)}
                    onDeleteSection={(sectionId) => deleteSection(sectionId)}
                  />
                );
              }
            })
          )}

          {/* Add Section Dropdown - At Bottom */}
          <div className="pt-8 border-t border-border">
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              <Plus className="h-4 w-4" />
              Add New Section
            </div>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1 flex items-center gap-2"
                onClick={() => addSection(noteId, "text")}
              >
                <Type className="h-4 w-4" />
                Plain Text
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center gap-2"
                onClick={() => addSection(noteId, "markdown")}
              >
                <Hash className="h-4 w-4" />
                Markdown
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center gap-2"
                onClick={() => addSection(noteId, "code")}
              >
                <Code className="h-4 w-4" />
                Code
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Paste images from clipboard to add image sections
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TnNoteViewer;
