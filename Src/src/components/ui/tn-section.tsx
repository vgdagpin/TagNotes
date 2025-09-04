import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import { Edit, Save, Trash, Type } from '@/components/tn-icons';
import { Section } from "@shared/models";
import { useState, useEffect } from "react";

type TnSectionProps = {
  section: Section;
  isNew: boolean;

  onSaveSection?: (content: string, language?: string | null, title?: string) => void;
  onDeleteSection?: (sectionId: string) => void;
};

const TnSection = ({
  section,
  isNew,
  onSaveSection,
  onDeleteSection,
}: TnSectionProps) => {
  const [sectionEdit, setSectionEdit] = useState(isNew);
  const [content, setContent] = useState(section.content);
  const [title, setTitle] = useState(section.title || "");

  const handleSave = () => {
    onSaveSection?.call(null, content, null, title);
    setSectionEdit(false);
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this section? This action cannot be undone.",
      )
    )
      return;

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
          <Type className="w-3" />
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
              <Edit className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete()}
            className="text-destructive hover:text-destructive"
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Section Content */}
      {sectionEdit ? (
        <div className="space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Section title (optional)"
            className=""
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Enter ${section.type} content...`}
            className="min-h-32 resize-vertical"
            autoFocus={!section.content.trim()}
          />
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {section.title?.trim() && (
            <div className="font-semibold text-foreground mb-1">{section.title}</div>
          )}
          {section.content || (
            <span className="text-muted-foreground italic">Blank..</span>
          )}
        </div>
      )}
    </div>
  );
};

export default TnSection;
