import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Edit3,
  Save,
  Trash2,
  Code,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Section } from "@shared/api";
import { useState } from "react";
import axios from "axios";

type TnSectionCodeProps = {
  section: Section;
  noteId: string;

  onSaveSection?: (content: string, language?: string) => void;
  onDeleteSection?: (sectionId: string) => void;
};

const TnSectionCode = ({
  section,
  noteId,
  onSaveSection,
  onDeleteSection,
}: TnSectionCodeProps) => {
  const [sectionEdit, setSectionEdit] = useState(!section.content.trim());
  const [isExpanded, setIsExpanded] = useState(false);

  const [language, setLanguage] = useState(section.language);
  const [content, setContent] = useState(section.content);

  // Count lines and determine if folding is needed
  const codeLines = section.content.split("\n");
  const shouldShowFoldButton = codeLines.length > 5;
  const displayContent =
    !isExpanded && shouldShowFoldButton
      ? codeLines.slice(0, 5).join("\n")
      : section.content;

  const handleSave = () => {
    axios.put(`/api/notes/${noteId}/updateSection/${section.id}/content`, {
      content,
    });

    if (language) {
      axios.put(`/api/notes/${noteId}/updateSection/${section.id}/language`, {
        language,
      });
    }

    onSaveSection?.call(null, content, language);
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
      if (e.ctrlKey && e.key === 's' && sectionEdit) {
        e.preventDefault();
        handleSave();
      }
    };

    if (sectionEdit) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [sectionEdit, content, language]);

  return (
    <div className="border border-border rounded-md pb-2 pl-2 pr-2 group hover:border-accent transition-colors min-w-0 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-muted-foreground">
          <Code className="w-3" />
          {section.language && (
            <Badge variant="outline" className="text-xs ml-2">
              {section.language}
            </Badge>
          )}
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
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
              <SelectItem value="csharp">C#</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="css">CSS</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="bash">Bash</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Enter ${section.type} content...`}
            className="min-h-32 resize-vertical"
            autoFocus={!section.content.trim()}
          />
        </div>
      ) : (
        <div className="prose max-w-none min-w-0 w-full">
          <div className="relative min-w-0 w-full">
            <div
              onClick={() => setSectionEdit(true)}
              className="cursor-pointer min-w-0 w-full overflow-hidden"
            >
              <SyntaxHighlighter
                language={language || "javascript"}
                style={tomorrow}
                className="rounded border cursor-pointer min-w-0 w-full"
                wrapLongLines={true}
              >
                {displayContent}
              </SyntaxHighlighter>
            </div>

            {/* Fade effect when collapsed */}
            {shouldShowFoldButton && !isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[rgb(45,45,45)] to-transparent pointer-events-none rounded-b border-l border-r border-b" />
            )}

            {/* Expand/Collapse button */}
            {shouldShowFoldButton && (
              <div className="flex justify-center mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show more ({codeLines.length - 5} more lines)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TnSectionCode;
