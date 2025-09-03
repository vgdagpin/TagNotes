import { useEffect, useState } from "react";

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
    const [tags, setTags] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>(note.tags || []);
    const onOptionSelect: TagPickerProps["onOptionSelect"] = (e, data) => {
        if (data.value === "no-matches") {
            return;
        }
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

    useEffect(() => {
        const fetchTags = async () => {
            const tags = await getTags();

            setTags(tags);
        };
        fetchTags();
    }, []);

    useEffect(() => {
        setSelectedTags(note.tags || []);
    }, [note.tags]);

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
            //console.log(inputValue, selectedTags);

            //addTagToNote(inputValue);
            setInputValue("");
            setSelectedTags((curr) =>
                curr.includes(inputValue) ? curr : [...curr, inputValue]
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