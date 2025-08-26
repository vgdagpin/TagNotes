import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

import {
    Trash2,
    Image,
} from "lucide-react";
import { Section } from "@shared/api";
import axios from "axios";

type TnSectionImageProps = {
    section: Section;
    noteId: string;

    onDeleteSection?: (sectionId: string) => void;
};

const TnSectionImage = ({ section, noteId, onDeleteSection }: TnSectionImageProps) => {
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
                    <Image className="h-4 w-4" />
                    <span className="capitalize">{section.type}</span>
                </div>

                {/* Hover controls */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            {section.imageData && (
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
            )}
        </div>
    );
};

export default TnSectionImage;