import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
    Edit3,
    Save,
    Trash2,
    Type,
} from "lucide-react";
import { Section } from "@shared/api";
import { useState } from "react";
import axios from "axios";

type TnSectionProps = {
    section: Section;
    noteId: string;

    onSaveSection?: (content: string, language?: string) => void;
    onDeleteSection?: (sectionId: string) => void;
};

const TnSection = ({ section, noteId, onSaveSection, onDeleteSection }: TnSectionProps) => {
    const [sectionEdit, setSectionEdit] = useState(false);

    const [content, setContent] = useState(section.content);

    const handleSave = () => {
        axios.put(`/api/notes/${noteId}/updateSection/${section.id}/content`, { content });

        onSaveSection?.call(null, content, null);
        setSectionEdit(false);
    }

    const handleDelete = () => {
        if (!window.confirm("Are you sure you want to delete this section? This action cannot be undone.")) return;

        axios.delete(`/api/notes/${noteId}/deleteSection/${section.id}`);

        onDeleteSection?.call(null, section.id);
    }

    return (
        <div className="border border-border rounded-md pb-2 pl-2 pr-2 group hover:border-accent transition-colors">
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
                        <Button variant="ghost" size="sm" onClick={() => setSectionEdit(true)}>
                            <Edit3 className="h-3 w-3" />
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete()} className="text-destructive hover:text-destructive">
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
                    />
                </div>
            ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed cursor-pointer">
                    {section.content || (
                        <span className="text-muted-foreground italic">
                            Blank..
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default TnSection;