import { Textarea } from "@/components/ui/textarea";
import { Section } from "@shared/models";
import { useState, useCallback, useRef } from "react";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type TnSectionMarkdownProps = {
  section: Section;
  isNew: boolean;
  onSaveSection?: (content: string, language?: string) => void;
  onDeleteSection?: (sectionId: string) => void;
};

const TnSectionMarkdown = ({ section, isNew, onSaveSection, onDeleteSection }: TnSectionMarkdownProps) => {
  const [sectionEdit, setSectionEdit] = useState(isNew);
  const [content, setContent] = useState(section.content);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const handleSave = useCallback(() => {
    onSaveSection?.call(null, content, undefined);
    setSectionEdit(false);
  }, [content]);

  const handleDelete = () => {
    onDeleteSection?.call(null, section.id);
  };

  const handleBlur: React.FocusEventHandler<HTMLDivElement> = (e) => {
    if (!sectionEdit) return;
    const next = e.relatedTarget as Node | null;
    if (rootRef.current && next && rootRef.current.contains(next)) return;
    handleSave();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!sectionEdit && e.key === 'Delete') {
      e.preventDefault();
      handleDelete();
    }
  };

  return (
    <div
      ref={rootRef}
      className="note-section border border-border rounded-md p-2 transition-colors min-w-0 w-full focus:outline-none focus:ring-1 focus:ring-accent"
      onDoubleClick={() => !sectionEdit && setSectionEdit(true)}
      tabIndex={0}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {sectionEdit ? (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Enter ${section.type} content...`}
          className="min-h-32 resize-vertical"
          onKeyDown={(e) => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); } }}
          onKeyDownCapture={(e) => { if (e.key === 'Escape') { e.preventDefault(); handleSave(); } }}
          autoFocus={!section.content.trim()}
        />
      ) : (
        <div className="prose max-w-none min-w-0 w-full overflow-hidden">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      )}
    </div>
  );
};

export default TnSectionMarkdown;
