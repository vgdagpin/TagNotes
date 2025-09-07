import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import TnNoteViewer from "@/components/ui/tn-note-viewer";
import { useTagNotesContext } from "@/contexts/TagNotesContextProvider";
import { Note } from "@/shared/models";

export default function Viewer() {
    const { noteId } = useParams();
    const [note, setNote] = useState<Note | undefined>(undefined);

    const [isDirectoryLoaded, setIsDirectoryLoaded] = useState<boolean | undefined>(undefined);

    console.log('test', useLocation());

    const tagNotesContext = useTagNotesContext();

    useEffect(() => {
        const tryCheckIfDirectoryIsLoaded = async () => {
            try {
                const hasDir = await tagNotesContext.hasSelectedDirectory();

                if (hasDir && noteId) {
                    const n = await tagNotesContext.getNote(noteId);
                    setNote(n);
                }


                console.log('localMode persisted', hasDir);
                setIsDirectoryLoaded(hasDir);
            } catch {
                console.log('Error getting persisted directory handle');
                setIsDirectoryLoaded(false);
            }
        }

        tryCheckIfDirectoryIsLoaded();
    }, [tagNotesContext, noteId]);

    // Ensure directory status is known
    // useEffect(() => {
    //     let mounted = true;
    //     const init = async () => {
    //         const local = isLocalMode();
    //         if (!local) {
    //             const dir = await hasSelectedDirectory();
    //             if (!mounted) return;
    //             setIsDirectoryLoaded(!!dir);
    //         } else {
    //             setIsDirectoryLoaded(true);
    //         }
    //     };
    //     init();
    //     return () => { mounted = false; };
    // }, []);


    if (isDirectoryLoaded === undefined) {
        return (<>Loading..</>);
    }

    return (
        <div className="h-screen bg-background flex">
            <div className="flex-1 min-w-0"> Test
                {note && <TnNoteViewer note={note} directoryLoaded={isDirectoryLoaded} />}
            </div>
        </div>
    );
}
