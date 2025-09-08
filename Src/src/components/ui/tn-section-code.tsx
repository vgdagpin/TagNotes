import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Field, Textarea } from "@fluentui/react-components";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Edit, Save, Trash, Code, ChevronDown, ChevronUp, } from '@/components/tn-icons';

import { Section } from "@shared/models";
import { useState, useCallback } from "react";

type TnSectionCodeProps = {
  section: Section;
  isNew: boolean;

  onSaveSection?: (content: string, language?: string) => void;
  onDeleteSection?: (sectionId: string) => void;
};

const TnSectionCode = ({
  section,
  isNew,
  onSaveSection,
  onDeleteSection,
}: TnSectionCodeProps) => {
  const [sectionEdit, setSectionEdit] = useState(isNew);
  const [isExpanded, setIsExpanded] = useState(false);

  const [language, setLanguage] = useState<string | undefined>(section.language || undefined);
  const [content, setContent] = useState(section.content);
  // Title removed

  // Count lines and determine if folding is needed
  const codeLines = section.content.split("\n");
  const shouldShowFoldButton = codeLines.length > 5;
  const displayContent =
    !isExpanded && shouldShowFoldButton
      ? codeLines.slice(0, 5).join("\n")
      : section.content;

  const handleSave = useCallback(() => {
    onSaveSection?.call(null, content, language || undefined);
    setSectionEdit(false);
  }, [content, language]);

  const handleDelete = () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this section? This action cannot be undone.",
      )
    )
      return;

    onDeleteSection?.call(null, section.id);
  };

  return (
    <div className="note-section border border-border rounded-md pb-2 pl-2 pr-2 group hover:border-accent transition-colors min-w-0 w-full">
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
          {/* Title input removed */}
          <Select
            value={language || ''}
            onValueChange={(value) => setLanguage(value || undefined)}
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
          <Field size="medium">
            <Textarea
              value={content}
              onChange={(_, data) => setContent(data.value)}
              placeholder={`Enter ${section.type} content...`}
              className=""
              onKeyDown={(ev) => {
                if (ev.ctrlKey && ev.key === "s") {
                  ev.preventDefault();
                  handleSave();
                }
              }}
              autoFocus={!section.content.trim()}
            />
          </Field>
        </div>
      ) : (
        <div className="prose max-w-none min-w-0 w-full">
          {/* Title display removed */}
          <div className="relative min-w-0 w-full">
            <div className="min-w-0 w-full overflow-hidden">
              <SyntaxHighlighter
                language={language || "javascript"}
                style={oneLight}
                className="rounded border min-w-0 w-full"
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
