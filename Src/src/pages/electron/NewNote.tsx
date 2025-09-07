import TnNoteViewer from "@/components/ui/tn-note-viewer";
import TnSettings from "@/components/ui/tn-settings";
import { useTagNotesContext } from "@/contexts/TagNotesContextProvider";
import { Note } from "@/shared/models";
import { useEffect, useState } from "react";

export default function NewNote() {
    const [isDirLoaded, setIsDirLoaded] = useState<boolean | undefined>(undefined);
    const [note, setNote] = useState<Note | undefined>(undefined);

    const tagNotesContext = useTagNotesContext();

    const tryCheckIfDirectoryIsLoaded = async () => {
        try {
            const hasDir = await tagNotesContext.hasSelectedDirectory();

            if (hasDir) {
                const newNote = await tagNotesContext.createNote({});

                setNote(newNote);
            }

            console.log('localMode persisted', hasDir);
            setIsDirLoaded(hasDir);
        } catch {
            console.log('Error getting persisted directory handle');
            setIsDirLoaded(false);
        }
    }

    useEffect(() => {
        tryCheckIfDirectoryIsLoaded();
    }, [tagNotesContext]);

    const handleDirectorySelected = async () => {
        const newNote = await tagNotesContext.createNote({});

        setNote(newNote);

        setIsDirLoaded(true);
    }

    return (<>
        {isDirLoaded === undefined && <></>}
        {isDirLoaded === false && <TnSettings onDirectorySelected={handleDirectorySelected} />}
        {isDirLoaded === true && note && <TnNoteViewer note={note} directoryLoaded={isDirLoaded} />}

    </>)
}
