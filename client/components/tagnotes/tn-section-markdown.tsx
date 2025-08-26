import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { Edit3, Save, Trash2, Hash } from "lucide-react";
import { Section } from "@shared/api";
import { useState, useEffect } from "react";
import axios from "axios";

type TnSectionMarkdownProps = {
  section: Section;
  noteId: string;

  onSaveSection?: (content: string, language?: string) => void;
  onDeleteSection?: (sectionId: string) => void;
};

const TnSectionMarkdown = ({
  section,
  noteId,
  onSaveSection,
  onDeleteSection,
}: TnSectionMarkdownProps) => {
  const [sectionEdit, setSectionEdit] = useState(!section.content.trim());

  const [content, setContent] = useState(section.content);

  const handleSave = () => {
    axios.put(`/api/notes/${noteId}/updateSection/${section.id}/content`, {
      content,
    });

    onSaveSection?.call(null, content, null);
    setSectionEdit(false);
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this section? This action cannot be undone.",
      )
    )
      return;

    axios.delete(`/api/notes/${noteId}/deleteSection/${section.id}`);

    onDeleteSection?.call(null, section.id);
  };

  // Add keyboard shortcut for section editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s" && sectionEdit) {
        e.preventDefault();
        handleSave();
      }
    };

    if (sectionEdit) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [sectionEdit, content]);

  return (
    <div className="note-section border border-border rounded-md pb-2 pl-2 pr-2 group hover:border-accent transition-colors min-w-0 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-muted-foreground">
          <Hash className="w-3" />
        </div>

        {/* Hover controls */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {sectionEdit ? (
            <Button variant="ghost" size="sm" onClick={() => handleSave()}>
              <Save className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSectionEdit(true)}
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete()}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Section Content */}
      {sectionEdit ? (
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Enter ${section.type} content...`}
            className="min-h-32 resize-vertical"
            autoFocus={!section.content.trim()}
          />
        </div>
      ) : (
        <div className="prose max-w-none min-w-0 w-full overflow-hidden">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: section.content
                .replace(/\\n/g, "<br>")
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.*?)\*/g, "<em>$1</em>")
                .replace(
                  /^## (.*)/gm,
                  '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>',
                )
                .replace(
                  /^### (.*)/gm,
                  '<h3 class="text-base font-semibold mt-3 mb-2">$1</h3>',
                )
                .replace(/^- (.*)/gm, '<li class="ml-4">$1</li>'),
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TnSectionMarkdown;
