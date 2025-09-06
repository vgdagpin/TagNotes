import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TnNoteViewer from "@/components/ui/tn-note-viewer";
import { createNote as createLocalNote, isLocalMode, hasSelectedDirectory } from "@/lib/notesClient";

export default function Viewer() {
    const { noteId } = useParams();
    const navigate = useNavigate();
    const [isDirectoryLoaded, setIsDirectoryLoaded] = useState<boolean | undefined>(undefined);
    const [currentId, setCurrentId] = useState<string | null>(null);

    console.log('test', useLocation());

    // Ensure directory status is known
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            const local = isLocalMode();
            if (!local) {
                const dir = await hasSelectedDirectory();
                if (!mounted) return;
                setIsDirectoryLoaded(!!dir);
            } else {
                setIsDirectoryLoaded(true);
            }
        };
        init();
        return () => { mounted = false; };
    }, []);

    // Create new note if route is /viewer/new
    useEffect(() => {
        console.log('noteId', noteId);

        if (noteId == null) {
            navigate('/viewer/new', { replace: true });
        }

        let active = true;
        const maybeCreate = async () => {
            if (noteId !== 'new') { setCurrentId(noteId || null); return; }
            try {
                console.log('eh');
                const note = await createLocalNote({});
                if (!active) return;
                setCurrentId(note.id);
                navigate(`/viewer/${note.id}`, { replace: true });
            } catch (err) {
                // Likely no directory selected
                alert('Please select a notes folder in the main window before creating a note.');
            }
        };
        maybeCreate();
        return () => { active = false; };
    }, [noteId]);

    if (!currentId) return null;

    if (isDirectoryLoaded === undefined) {
        return (<>Loading..</>);
    }

    return (
        <div className="h-screen bg-background flex">
            <div className="flex-1 min-w-0"> Test
                <TnNoteViewer noteId={currentId} directoryLoaded={isDirectoryLoaded} />
            </div>
        </div>
    );
}
