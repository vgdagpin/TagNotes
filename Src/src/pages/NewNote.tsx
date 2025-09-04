import { getNote, getPersistedDirectoryHandle, isLocalMode } from "@/lib/notesClient";
import { Note } from "@/shared/models";
import { useEffect, useState } from "react";

export default function NewNote() {

    const [isDirLoaded, setIsDirLoaded] = useState<boolean | undefined>(undefined);
    const [noteTags, setNoteTags] = useState<string[]>([]);

    const [note, setNote] = useState<Note>({
        id: '85f6330c-05aa-4beb-9841-0fac893f573f',
        title: "",
        tags: [],
        sections: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    useEffect(() => {
        let active = true;
        const fetchNote = async () => {
            try {
                if (!isDirLoaded) return;
                const data = await getNote('85f6330c-05aa-4beb-9841-0fac893f573f');
                if (!active) return;
                console.log('setNote from useEffect');

                setNote(data);

                setNoteTags(data.tags);
            } catch { }
        };
        fetchNote();
        return () => { active = false; };
    }, [isDirLoaded]);

    useEffect(() => {
        let localMode = isLocalMode();

        const tryGetPersistedDirectoryHandle = async () => {
            const dir = await getPersistedDirectoryHandle();

            setIsDirLoaded(!!dir);
        }

        if (!localMode) {
            tryGetPersistedDirectoryHandle();
        }

        setIsDirLoaded(localMode);

        // Listen for directory selection changes -> refresh list immediately
        const onDirChanged = async () => {
            setIsDirLoaded(true);
        };

        window.addEventListener('tagnotes:directoryChanged', onDirChanged as any);
    }, []);

    return (
        <div className="h-screen bg-background flex">
            <div className="flex-1 min-w-0">
                {!isDirLoaded && <p>Directory is not loaded</p>}
                {isDirLoaded && (<><pre>{JSON.stringify(noteTags, null, 2)}</pre>
                    <pre>{JSON.stringify(note, null, 2)}</pre></>)}
            </div>
        </div>
    );
}
