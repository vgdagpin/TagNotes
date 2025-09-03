import { useEffect, useMemo, useState } from "react";

import {
    addTag as addTagLocal,
    removeTag as removeTagLocal,
    createTag,
    getTags,
} from "@/lib/notesClient";

import { Tag, TagPicker, TagPickerControl, TagPickerGroup, TagPickerInput, TagPickerList, TagPickerOption, TagPickerProps, useTagPickerFilter } from "@fluentui/react-components";

type TnTagsPickerProps = {
    noteId: string;
    noteTags: string[];
    directoryLoaded: boolean | undefined;
};

const TnTagsPicker = ({ noteId, noteTags, directoryLoaded }: TnTagsPickerProps) => {
    const [isDirLoaded, setIsDirLoaded] = useState<boolean | undefined>(directoryLoaded);

    const [tags, setTags] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>(noteTags);
    const onOptionSelect: TagPickerProps["onOptionSelect"] = async (_, data) => {
        if (data.value === "no-matches") {
            return;
        }

        setSelectedTags(data.selectedOptions);

        console.log("Option selected:", data.value, data.selectedOptions);

        setInputValue("");

        if (data.selectedOptions.includes(data.value)) {
            await addTagLocal(noteId, data.value);
        } else {
            removeTagFromNote(data.value);
        }        
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
        setIsDirLoaded(directoryLoaded);
    }, [directoryLoaded]);

    useEffect(() => {
        const fetchTags = async () => {
            const tags = await getTags();

            setTags(tags);
        };
        fetchTags();
    }, []);

    // Remove tag from note
    const removeTagFromNote = async (tagToRemove: string) => {
        if (!isDirLoaded) return;

        await removeTagLocal(noteId, tagToRemove);
    };

    useEffect(() => {
        setSelectedTags(noteTags);
    }, [noteTags]);

    const handleKeyDown = async (event: React.KeyboardEvent) => {
        if (event.key === "Enter" && inputValue) {
            const normalized = inputValue.trim().toLowerCase();
            if (!normalized) return;

            if (normalized.length < 3 || normalized.length > 15) {
                setInputValue("");
                return;
            }


            const hasMatches = filteredOptions.length > 0;
            if (hasMatches) {
                // There are suggestions; let the picker handle selection instead of adding a new tag
                return;
            }

            // // We're creating a new tag; prevent the default to avoid selecting the option
            // event.preventDefault();
            // event.stopPropagation();

            const isAdded = await createTag(normalized);

            if (isAdded) {
                setTags(prev => [...prev, normalized]);
            }

            setSelectedTags((curr) =>
                curr.includes(normalized) ? curr : [...curr, normalized]
            );

            setInputValue("");

            await addTagLocal(noteId, normalized);            
        }
    };

    return (
        <>
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