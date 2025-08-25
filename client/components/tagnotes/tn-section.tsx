import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
    Hash,
    Code,
    Type,
    Image,
} from "lucide-react";
import { Section } from "@shared/api";
import { useState } from "react";

type TnSectionProps = {
    section: Section;
    noteId: string;

    onSaveSection?: (content: string, language?: string) => void;
    onDeleteSection?: (noteId: string, sectionId: string) => void;
};

const TnSection = ({ section, noteId, onSaveSection, onDeleteSection }: TnSectionProps) => {
    const [sectionEdit, setSectionEdit] = useState(false);

    const [language, setLanguage] = useState(section.language);
    const [content, setContent] = useState(section.content);

    const handleSave = () => {
        onSaveSection?.call(null, content, language);
        setSectionEdit(false);
    }

    return (
        <div
            key={section.id}
            className="border border-border rounded-lg p-4 space-y-2 group hover:border-accent transition-colors"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {section.type === "markdown" && <Hash className="h-4 w-4" />}
                    {section.type === "text" && <Type className="h-4 w-4" />}
                    {section.type === "code" && <Code className="h-4 w-4" />}
                    {section.type === "image" && <Image className="h-4 w-4" />}
                    <span className="capitalize">{section.type}</span>
                    {section.type === "code" && section.language && (
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
                        onClick={() => onDeleteSection?.call(null, noteId, section.id)}
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Section Content */}
            {section.type === "image" && section.imageData ? (
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="cursor-pointer">
                            <img
                                src={section.imageData}
                                alt={section.content}
                                className="max-w-xs h-32 object-cover rounded border hover:opacity-80 transition-opacity"
                            />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                        <img
                            src={section.imageData}
                            alt={section.content}
                            className="w-full h-auto max-h-[80vh] object-contain"
                        />
                    </DialogContent>
                </Dialog>
            ) : sectionEdit ? (
                <div className="space-y-2">
                    {section.type === "code" && (
                        <Select
                            value={language}
                            onValueChange={(value) => setLanguage(value) }
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
                    )}
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={`Enter ${section.type} content...`}
                        className="min-h-32 resize-vertical"
                    />
                </div>
            ) : (
                <div
                    className="prose max-w-none"
                    onClick={() => setSectionEdit(true)}
                >
                    {section.type === "code" ? (
                        <SyntaxHighlighter
                            language={language || "javascript"}
                            style={tomorrow}
                            className="rounded border cursor-pointer"
                        >
                            {section.content}
                        </SyntaxHighlighter>
                    ) : section.type === "markdown" ? (
                        <div
                            className="prose prose-sm max-w-none cursor-pointer"
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
                    ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed cursor-pointer">
                            {section.content || (
                                <span className="text-muted-foreground italic">
                                    Click to edit...
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TnSection;