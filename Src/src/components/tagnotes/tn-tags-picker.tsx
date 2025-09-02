import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
    isLocalMode,
} from "@/lib/notesClient";

import { Plus, X, Hash } from '@/components/tn-icons';
import { Note } from "@/shared/models";

type TnTagsPickerProps = {
    note: Note;
    onAddTag?: (tag: string) => void;
    onRemoveTag?: (tag: string) => void;
};

const TnTagsPicker = ({ note, onAddTag, onRemoveTag }: TnTagsPickerProps) => {
    // Add tag to note
    const addTagToNote = async (tag: string) => {
        const trimmedTag = tag.trim().toLowerCase();
        if (!trimmedTag) return;
        if (!isLocalMode()) return;

        onAddTag?.(trimmedTag);
    };

    // Remove tag from note
    const removeTagFromNote = async (tagToRemove: string) => {
        if (!window.confirm(`Remove tag \"${tagToRemove}\" from this note?`)) return;
        if (!isLocalMode()) return;

        onRemoveTag?.(tagToRemove);
    };

    return (
        <div className="space-y-2">


            <div className="space-y-2">
                {/* Tag Input */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Add tag..."
                        className="flex-1"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                const input = e.target as HTMLInputElement;
                                addTagToNote(input.value);
                                input.value = "";
                            }
                        }}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                            const input = (e.target as HTMLElement)
                                .closest(".flex")
                                ?.querySelector("input") as HTMLInputElement;
                            if (input) {
                                addTagToNote(input.value);
                                input.value = "";
                            }
                        }}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Display Tags */}
                <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                        <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-1"
                        >
                            <Hash className="h-3 w-3" />
                            {tag}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => removeTagFromNote(tag)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    ))}
                    {note.tags.length === 0 && (
                        <span className="text-muted-foreground italic text-sm">
                            No tags yet
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TnTagsPicker;