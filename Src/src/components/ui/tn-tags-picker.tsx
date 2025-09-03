import { useEffect, useMemo, useState } from "react";

import {
    createTag,
    getTags,
    isLocalMode,
} from "@/lib/notesClient";

import { Note } from "@/shared/models";
import { Tag, TagPicker, TagPickerControl, TagPickerGroup, TagPickerInput, TagPickerList, TagPickerOption, TagPickerProps, useTagPickerFilter } from "@fluentui/react-components";

type TnTagsPickerProps = {
    note: Note;
    onAddTag?: (tag: string) => void;
    onRemoveTag?: (tag: string) => void;
};

const TnTagsPicker = ({ note, onAddTag, onRemoveTag }: TnTagsPickerProps) => {
    const [tagsUpdateFromHere, setTagsUpdateFromHere] = useState(false);

    const [tags, setTags] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const onOptionSelect: TagPickerProps["onOptionSelect"] = (_, data) => {
        if (data.value === "no-matches") {
            return;
        }
        setTagsUpdateFromHere(true);

        setSelectedTags(data.selectedOptions);

        console.log("Option selected:", data.value, data.selectedOptions);

        if (data.selectedOptions.includes(data.value)) {
            addTagToNote(data.value);
        } else {
            removeTagFromNote(data.value);
        }

        setInputValue("");
    };

    const children = useTagPickerFilter({
        query: inputValue,
        options: tags,
        noOptionsElement: (
            <TagPickerOption value="no-matches">{inputValue}</TagPickerOption>
        ),
        renderOption: (option) => (
            <TagPickerOption key={option} value={option}>{option}</TagPickerOption>
        ),

        filter: (option) => !selectedTags.includes(option) && option.toLowerCase().includes(inputValue.toLowerCase()),
    });

    // Locally compute filtered options to control Enter key behavior
    const filteredOptions = useMemo(() => {
        const q = inputValue.toLowerCase();
        return tags.filter(
            (option) => !selectedTags.includes(option) && option.toLowerCase().includes(q)
        );
    }, [tags, selectedTags, inputValue]);

    useEffect(() => {
        const fetchTags = async () => {
            const tags = await getTags();

            setTags(tags);
        };
        fetchTags();
    }, []);

    useEffect(() => {
        if (!tagsUpdateFromHere) {
            setSelectedTags(note.tags || []);

            console.log('tags updated', note.tags);

            setTagsUpdateFromHere(false);
        }


    }, [note.tags, tagsUpdateFromHere]);

    // Add tag to note
    const addTagToNote = async (tag: string) => {
        const trimmedTag = tag.trim().toLowerCase();
        if (!trimmedTag) return;
        if (!isLocalMode()) return;

        const isAdded = await createTag(trimmedTag);

        if (isAdded) {
            setTags(prev => [...prev, trimmedTag]);
        }

        onAddTag?.(trimmedTag);
    };

    // Remove tag from note
    const removeTagFromNote = async (tagToRemove: string) => {
        if (!isLocalMode()) return;

        onRemoveTag?.(tagToRemove);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter" && inputValue) {
            const hasMatches = filteredOptions.length > 0;
            if (hasMatches) {
                // There are suggestions; let the picker handle selection instead of adding a new tag
                return;
            }

            const normalized = inputValue.trim().toLowerCase();
            if (!normalized) return;

            // We're creating a new tag; prevent the default to avoid selecting the option
            event.preventDefault();
            event.stopPropagation();

            setTagsUpdateFromHere(true);
            addTagToNote(normalized);
            setInputValue("");
            setSelectedTags((curr) =>
                curr.includes(normalized) ? curr : [...curr, normalized]
            );
        }
    };

    return (
        <>
            <pre>{JSON.stringify(selectedTags)}</pre>
            <TagPicker
                onOptionSelect={onOptionSelect}
                selectedOptions={selectedTags}
            >
                <TagPickerControl>
                    <TagPickerGroup>
                        {selectedTags.map((option) => (
                            <Tag key={option} shape="rounded" value={option}>{option}</Tag>
                        ))}
                    </TagPickerGroup>

                    <TagPickerInput
                        value={inputValue}
                        placeholder="Add tag..."
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />

                </TagPickerControl>

                <TagPickerList>{children}</TagPickerList>
            </TagPicker>
        </>
    );
};

export default TnTagsPicker;