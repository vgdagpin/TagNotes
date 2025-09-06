import TnNoteViewer from "@/components/ui/tn-note-viewer";
import TnSettings from "@/components/ui/tn-settings";
import { createNote, getPersistedDirectoryHandle, isLocalMode } from "@/lib/notesClient";
import { Note } from "@/shared/models";
import { useEffect, useState } from "react";

export default function NewNote() {

    const [isDirLoaded, setIsDirLoaded] = useState<boolean | undefined>(undefined);

    const [note, setNote] = useState<Note>({
        id: '',
        title: "",
        tags: [],
        sections: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    useEffect(() => {
        const createNewNote = async () => {
            try {
                if (!isDirLoaded) return;

                const newNote = await createNote({});                

                setNote(newNote);
            } catch { }
        };
        createNewNote();
    }, [isDirLoaded]);

    useEffect(() => {
        let localMode = isLocalMode();

        const tryGetPersistedDirectoryHandle = async () => {
            const dir = await getPersistedDirectoryHandle();

            setIsDirLoaded(!!dir);
        }

        if (!localMode) {
            tryGetPersistedDirectoryHandle();
        } else {
            setIsDirLoaded(true);
        }
    }, []);

    if (isDirLoaded === undefined) {
        return (<div className="h-screen bg-background flex">
            <div className="flex-1 min-w-0">
                <p>Loading...</p>
            </div>
        </div>);
    } else if (isDirLoaded === false) {
        return (<TnSettings />);
    } else {
        return (<TnNoteViewer noteId={note.id} directoryLoaded={isDirLoaded} />);
    }
}
