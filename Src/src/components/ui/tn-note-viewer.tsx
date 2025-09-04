import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Edit, Plus, FileText, Hash, Type, Code } from '@/components/tn-icons';

import TnSection from "@/components/ui/tn-section";
import { Note, Section } from "@shared/models";
import {
  getNote as getLocalNote,
  addSection as addSectionLocal,
  addImageSection as addImageSectionLocal,
  updateSectionContent as updateSectionContentLocal,
  updateSectionTitle as updateSectionTitleLocal,
  updateTitle as updateTitleLocal,
  deleteSection,
} from "@/lib/notesClient";
import TnSectionCode from "./tn-section-code";
import TnSectionMarkdown from "@/components/ui/tn-section-markdown";
import TnSectionImage from "./tn-section-image";

import "./tn-note-viewer.css";
import TnTagsPicker from "./tn-tags-picker";

type TnNoteViewerProps = {
  noteId: string;
  directoryLoaded: boolean | undefined;

  onTitleUpdated?: (noteId: string, newTitle: string) => void;
};

const TnNoteViewer = ({ noteId, directoryLoaded, onTitleUpdated }: TnNoteViewerProps) => {
  const [isDirLoaded, setIsDirLoaded] = useState<boolean | undefined>(directoryLoaded);
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [newSectionId, setNewSectionId] = useState<string | null>(null);

  const [note, setNote] = useState<Note>({
    id: noteId,
    title: "",
    tags: [],
    sections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [editingTitle, setEditingTitle] = useState(false);

  console.log('TnNoteViewer');

  useEffect(() => {
    let active = true;
    const fetchNote = async () => {
      try {
        if (!isDirLoaded) return;
        const data = await getLocalNote(noteId);
        if (!active) return;
        console.log('setNote from useEffect');

        setNote(data);

        setNoteTags(data.tags);
      } catch { }
    };
    fetchNote();
    return () => { active = false; };
  }, [noteId, isDirLoaded]);

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
    setNote((prev) => {
      return {
        ...prev,
        title: title,
        updatedAt: new Date(),
      };
    });
  };

  const saveTitle = () => {
    if (!isDirLoaded) return;
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

  // Add image section
  const addImageSection = async (noteId: string, imageData: string) => {
    if (!isDirLoaded) return;
    
    const newImageSection = await addImageSectionLocal(noteId, imageData);
    setNote((prev) => ({
      ...prev,
      sections: [...prev.sections, newImageSection],
    }));

    setNewSectionId(newImageSection.id);
  };

  // Add new section to note
  const handleAddSection = async (noteId: string, sectionType: Section["type"]) => {
    if (!isDirLoaded) return;

    const newSection = await addSectionLocal(noteId, sectionType);

    setNote((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    setNewSectionId(newSection.id);
  };

  // Save section changes
  const handleSaveSection = async (sectionId: string, content: string, language?: string | null, title?: string) => {
    if (!isDirLoaded) return;

    let updated = await updateSectionContentLocal(note.id, sectionId, content, language);
    if (typeof title === 'string') {
      updated = await updateSectionTitleLocal(note.id, sectionId, title);
    }
    setNote(updated);
    setNewSectionId(null);
  };

  // Delete section
  const handleDeleteSection = async (sectionId: string) => {
    if (!isDirLoaded) return;

    const updated = await deleteSection(note.id, sectionId);
    setNote(updated);
    setNewSectionId(null);
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

              <TnTagsPicker noteId={note.id} noteTags={noteTags} directoryLoaded={isDirLoaded} />

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
                    isNew={section.id === newSectionId}
        onSaveSection={(content, language, title) => handleSaveSection(section.id, content, language, title)}
                    onDeleteSection={(sectionId) => handleDeleteSection(sectionId)}
                  />
                );
              } else if (section.type === "markdown") {
                return (
                  <TnSectionMarkdown
                    key={section.id}
                    section={section}
                    isNew={section.id === newSectionId}
        onSaveSection={(content, language, title) => handleSaveSection(section.id, content, language, title)}
                    onDeleteSection={(sectionId) => handleDeleteSection(sectionId)}
                  />
                );
              } else if (section.type === "image") {
                return (
                  <TnSectionImage
                    key={section.id}
                    section={section}
                    isNew={section.id === newSectionId}
                    onSaveSection={(content, language, title) => handleSaveSection(section.id, content, language, title)}
                    onDeleteSection={(sectionId) => handleDeleteSection(sectionId)}
                  />
                );
              } else {
                return (
                  <TnSection
                    key={section.id}
                    section={section}
                    isNew={section.id === newSectionId}
        onSaveSection={(content, language, title) => handleSaveSection(section.id, content, language, title)}
                    onDeleteSection={(sectionId) => handleDeleteSection(sectionId)}
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
                onClick={() => handleAddSection(noteId, "text")}
              >
                <Type className="h-4 w-4" />
                Plain Text
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center gap-2"
                onClick={() => handleAddSection(noteId, "markdown")}
              >
                <Hash className="h-4 w-4" />
                Markdown
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center gap-2"
                onClick={() => handleAddSection(noteId, "code")}
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
