// import TnNoteViewer from "@/components/ui/tn-note-viewer";
// import TnSettings from "@/components/ui/tn-settings";
// import { createNote, hasSelectedDirectory } from "@/lib/notesClient";
// import { Note } from "@/shared/models";
import { useTagNotesContext } from "@/contexts/TagNotesContextProvider";
import { Button } from "@fluentui/react-components";
import { useEffect, useState } from "react";

export default function NewNote() {
    const [isDirLoaded, setIsDirLoaded] = useState<boolean | undefined>(undefined);
    const [dirName, setDirName] = useState<string | null>(null);

    const tagNotesContext = useTagNotesContext();

    useEffect(() => {
        const tryCheckIfDirectoryIsLoaded = async () => {
            try {
                const hasDir = await tagNotesContext.hasSelectedDirectory();

                if (hasDir) {
                    const name = await tagNotesContext.getDirectoryName();
                    setDirName(name);
                }

                console.log('localMode persisted', hasDir);
                setIsDirLoaded(hasDir);
            } catch {
                console.log('Error getting persisted directory handle');
                setIsDirLoaded(false);
            }
        }

        tryCheckIfDirectoryIsLoaded();
    }, [tagNotesContext]);


    console.log('test');

    // const [note, setNote] = useState<Note>({
    //     id: '',
    //     title: "",
    //     tags: [],
    //     sections: [],
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    // });

    // useEffect(() => {
    //     const createNewNote = async () => {
    //         try {
    //             if (!isDirLoaded) return;

    //             const newNote = await createNote({});                

    //             setNote(newNote);
    //         } catch {
    //             console.log('Error creating new note');
    //          }
    //     };
    //     createNewNote();
    // }, [isDirLoaded]);

    // useEffect(() => {
    //     const tryCheckIfDirectoryIsLoaded = async () => {
    //         try {
    //             const hasDir = await hasSelectedDirectory();

    //             console.log('localMode persisted', hasDir);
    //             setIsDirLoaded(hasDir);
    //         } catch {
    //             console.log('Error getting persisted directory handle');
    //             setIsDirLoaded(false);
    //         }
    //     }

    //     tryCheckIfDirectoryIsLoaded();
    // }, []);

    // const handleDirectorySelected = () => {
    //     setIsDirLoaded(true);
    // }

    // useEffect(() => {
    //     const fetchId = async () => {
    //         const elApi = (window as any).electronAPI;

    //         if (elApi) {
    //             const currentId = await elApi.getId();
    //             setTempId(currentId);
    //         }
    //     };

    //     fetchId();

    // }, []);

    const handleSelectDirectory = async () => {
        try {
            const dirName = await tagNotesContext.browseDirectory();
            console.log('Selected directory:', dirName);

            setIsDirLoaded(true);
        } catch (error) {
            console.error('Error selecting directory:', error);
        }
    }

    return (<>
        <Button onClick={handleSelectDirectory}>Select Directory</Button>
        <br />
        { isDirLoaded === undefined && <></> }
        { isDirLoaded === false && <p>No directory selected</p> }
        { isDirLoaded === true && <p>{dirName}</p> }

    </>)

    // if (isDirLoaded === undefined) {
    //     return (<div className="h-screen bg-background flex">
    //         <div className="flex-1 min-w-0">
    //             <p>Loading...</p>
    //         </div>
    //     </div>);
    // } else if (isDirLoaded === false) {
    //     return (<TnSettings onDirectorySelected={handleDirectorySelected} />);
    // } else {
    //     return (<TnNoteViewer noteId={note.id} directoryLoaded={isDirLoaded} />);
    // }
}
