import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Section } from "@shared/models";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useState, useRef, useCallback } from "react";

type TnSectionImageProps = {
  section: Section;
  isNew: boolean;
  onSaveSection?: (content: string, language?: string) => void;
  onDeleteSection?: (sectionId: string) => void;
};

const TnSectionImage = ({ section, onSaveSection, onDeleteSection }: TnSectionImageProps) => {
  const [sectionEdit, setSectionEdit] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const handleSave = useCallback(() => {
    onSaveSection?.call(null, section.content, undefined);
    setSectionEdit(false);
  }, [section.content]);

  const handleDelete = useCallback(() => {
    onDeleteSection?.call(null, section.id);
  }, [section.id]);

  const handleBlur: React.FocusEventHandler<HTMLDivElement> = (e) => {
    if (!sectionEdit) return;
    const next = e.relatedTarget as Node | null;
    if (rootRef.current && next && rootRef.current.contains(next)) return;
    handleSave();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (sectionEdit) {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { e.preventDefault(); handleSave(); }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      handleDelete();
    }
  };

  return (
    <div
      ref={rootRef}
      className="note-section border border-border rounded-md p-2 min-w-0 w-full focus:outline-none focus:ring-1 focus:ring-accent"
      tabIndex={0}
      onDoubleClick={() => !sectionEdit && setSectionEdit(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
  {/* Removed image icon header for cleaner UI */}
      {/* Image content (no inline editing UI now) */}
      {section.imageData && (
        <Dialog>
          <DialogTrigger asChild>
            <div className="cursor-pointer inline-block">
              <img
                src={section.imageData}
                alt={section.content}
                className="max-w-xs h-32 object-cover rounded border hover:opacity-80 transition-opacity"
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogTitle>Image</DialogTitle>
            <img
              src={section.imageData}
              alt={section.content}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TnSectionImage;
