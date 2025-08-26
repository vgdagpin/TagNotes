import { useState, useEffect, useMemo } from "react";
import axios from "axios";

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
import TnSection from "./tn-section";
import { Note, Section } from "@shared/api";
import TnSectionCode from "./tn-section-code";
import TnSectionMarkdown from "./tn-section-markdown";
import TnSectionImage from "./tn-section-image";

import './tn-note-viewer.css';

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
    const fetchNote = async () => {
      const res = await axios.get(`/api/notes/${noteId}`);
      const data = res.data;
      setNote({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        sections: data.sections.map((section: any) => ({
          ...section,
          createdAt: new Date(section.createdAt),
        })),
      });
    };

    fetchNote();
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
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).slice(2, 11);
  };

  // Add tag to note
  const addTagToNote = (noteId: string, tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) return;

    axios.post(`/api/notes/${noteId}/tags`, { tag: trimmedTag });

    setNote((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tags: [...(prev.tags || []), trimmedTag],
        updatedAt: new Date(),
      };
    });
  };

  // Delete note
  const deleteNote = (noteId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this note? This action cannot be undone.",
      )
    )
      return;

    axios.delete(`/api/notes/${noteId}`);

    onDeleteNote?.call(null, noteId);
  };

  // Remove tag from note
  const removeTagFromNote = (noteId: string, tagToRemove: string) => {
    if (!window.confirm(`Remove tag \"${tagToRemove}\" from this note?`))
      return;

    axios.delete(`/api/notes/${noteId}/tags/${tagToRemove}`);

    setNote((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tags: (prev.tags || []).filter((tag) => tag !== tagToRemove),
        updatedAt: new Date(),
      };
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

    setNote((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        sections: [...prev.sections, newSection],
        updatedAt: new Date(),
      };
    });
  };

  const handleSetTitle = (title: string) => {
    setNote((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        title: title,
        updatedAt: new Date(),
      };
    });
  };

  const saveTitle = () => {
    axios.put(`/api/notes/${note.id}/setTitle`, { title: note.title });

    setEditingTitle(false);
  };

  // Add keyboard shortcut for title editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's' && editingTitle) {
        e.preventDefault();
        saveTitle();
      }
    };

    if (editingTitle) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [editingTitle]);

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

    setNote((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        sections: [...prev.sections, newSection],
        updatedAt: new Date(),
      };
    });

    // setNotes((prev) =>
    //   prev.map((note) =>
    //     note.id === noteId
    //       ? {
    //         ...note,
    //         sections: [...note.sections, newSection],
    //         updatedAt: new Date(),
    //       }
    //       : note,
    //   ),
    // );

    // setSectionContents((prev) => ({ ...prev, [newSection.id]: "" }));
    // setEditingSections((prev) => new Set([...prev, newSection.id]));
  };

  // Save section changes
  const saveSection = (
    sectionId: string,
    content: string,
    language?: string,
  ) => {
    setNote((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId
            ? { ...section, content, language }
            : section,
        ),
        updatedAt: new Date(),
      };
    });

    //   setNotes((prev) =>
    //     prev.map((note) => ({
    //       ...note,
    //       sections: note.sections.map((section) =>
    //         section.id === sectionId ? { ...section, content } : section,
    //       ),
    //       updatedAt: new Date(),
    //     })),
    //   );

    //   setEditingSections((prev) => {
    //     const newSet = new Set(prev);
    //     newSet.delete(sectionId);
    //     return newSet;
    //   });
  };

  // Delete section
  const deleteSection = (sectionId: string) => {
    setNote((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
        updatedAt: new Date(),
      };
    });

    // setNotes((prev) =>
    //   prev.map((note) =>
    //     note.id === noteId
    //       ? {
    //         ...note,
    //         sections: note.sections.filter((s) => s.id !== sectionId),
    //         updatedAt: new Date(),
    //       }
    //       : note,
    //   ),
    // );

    // setSectionContents((prev) => {
    //   const newContents = { ...prev };
    //   delete newContents[sectionId];
    //   return newContents;
    // });

    // setEditingSections((prev) => {
    //   const newSet = new Set(prev);
    //   newSet.delete(sectionId);
    //   return newSet;
    // });
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
                <Trash2 className="h-4 w-4" />
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
                    noteId={noteId}
                    onSaveSection={(content, language) =>
                      saveSection(section.id, content, language)
                    }
                    onDeleteSection={(sectionId) => deleteSection(sectionId)}
                  />
                );
              } else if (section.type === "markdown") {
                return (
                  <TnSectionMarkdown
                    key={section.id}
                    section={section}
                    noteId={noteId}
                    onSaveSection={(content, language) =>
                      saveSection(section.id, content, language)
                    }
                    onDeleteSection={(sectionId) => deleteSection(sectionId)}
                  />
                );
              } else if (section.type === "image") {
                return (
                  <TnSectionImage
                    key={section.id}
                    section={section}
                    noteId={noteId}
                    onDeleteSection={(sectionId) => deleteSection(sectionId)}
                  />
                );
              } else {
                return (
                  <TnSection
                    key={section.id}
                    section={section}
                    noteId={noteId}
                    onSaveSection={(content, language) =>
                      saveSection(section.id, content, language)
                    }
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
