import { useState, useEffect } from "react";

import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Edit,
  Plus,
  X,
  FileText,
  Tag,
  Hash,
  Type,
  Trash,
  Code,
} from '../tn-icons';

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

type TnNoteViewerProps = {
  noteId: string;

  onDeleteNote?: (noteId: string) => void;
};

const TnNoteViewer = ({ noteId, onDeleteNote }: TnNoteViewerProps) => {
  const [note, setNote] = useState<Note>({
    id: noteId,
    title: "",
    tags: [],
    sections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchNote = async () => {
      try {
  if (!isLocalMode()) return;
  const data = await getLocalNote(noteId);
  if (!active) return;
  setNote(data);
      } catch {}
    };
    fetchNote();
    return () => { active = false; };
  }, [noteId]);

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

  // Delete note
  const deleteNote = (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;
  if (!isLocalMode()) return;
  deleteNoteLocal(noteId).then(() => onDeleteNote?.call(null, noteId));
  };

  // Remove tag from note
  const removeTagFromNote = (noteId: string, tagToRemove: string) => {
    if (!window.confirm(`Remove tag \"${tagToRemove}\" from this note?`)) return;
  if (!isLocalMode()) return;
  removeTagLocal(noteId, tagToRemove).then(updated => setNote(updated));
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
  updateTitleLocal(note.id, note.title).then(updated => setNote(updated));
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
    <TabsContent
      key={noteId}
      value={noteId}
      className="h-full mt-0 data-[state=active]:flex flex-col min-w-0 w-full"
      onPaste={(e) => {
        handleImagePaste(noteId, e.nativeEvent);
      }}
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
                          const input = e.target as HTMLInputElement;
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
                          ?.querySelector("input") as HTMLInputElement;
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
                    {note.tags.map((tag) => (
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
                          onClick={() => removeTagFromNote(noteId, tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {note.tags.length === 0 && (
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
      </div>
    </TabsContent>
  );
};

export default TnNoteViewer;
