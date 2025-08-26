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

const TnSectionCode = ({ section, noteId, onSaveSection, onDeleteSection }: TnSectionCodeProps) => {
    const [sectionEdit, setSectionEdit] = useState(!section.content.trim());

    const [language, setLanguage] = useState(section.language);
    const [content, setContent] = useState(section.content);

    const handleSave = () => {
        axios.put(`/api/notes/${noteId}/updateSection/${section.id}/content`, { content });

        if (language) {
            axios.put(`/api/notes/${noteId}/updateSection/${section.id}/language`, { language });
        }

        onSaveSection?.call(null, content, language);
        setSectionEdit(false);
    }

    const handleDelete = () => {
        if (!window.confirm("Are you sure you want to delete this section? This action cannot be undone.")) return;

        axios.delete(`/api/notes/${noteId}/deleteSection/${section.id}`);

        onDeleteSection?.call(null, section.id);
    }

    return (
        <div
            key={section.id}
            className="border border-border rounded-lg p-4 space-y-2 group hover:border-accent transition-colors"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Code className="h-4 w-4" />
                    <span className="capitalize">{section.type}</span>
                    {section.language && (
                        <Badge variant="outline" className="text-xs">
                            {section.language}
                        </Badge>
                    )}
                </div>

                {/* Hover controls */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {sectionEdit ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSave()}
                        >
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
                <div className="prose max-w-none cursor-pointer" onClick={() => setSectionEdit(true)}>
                    <SyntaxHighlighter
                        language={language || "javascript"}
                        style={tomorrow}
                        className="rounded border cursor-pointer"
                    >
                        {section.content}
                    </SyntaxHighlighter>
                </div>
            )}
        </div>
    );
};

export default TnSectionCode;
