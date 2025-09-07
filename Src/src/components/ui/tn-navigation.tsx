import { useEffect, useState } from "react";

import { NavDrawer, NavDrawerBody, NavDrawerHeader } from "@fluentui/react-components";
import { FileText, Plus, Search, Settings, Trash } from "@/components/tn-icons";
import { Button } from "./button";
import { Input } from "./input";
import { NoteSummary } from "@/shared/models";
import { cn, formatDateTimeShort } from "@/lib/utils";

type TnNavigationProps = {
    openNavigation: boolean;
    directoryLoaded: boolean | undefined;
    notes: NoteSummary[];
    currentActiveView: string | null;

    onOpenSettings?: () => void;
    onOpenNote?: (noteId: string) => void;
    onDeleteNote?: (noteId: string) => void;
    onCreateNote?: () => void;
}

const TnNavigation = ({ openNavigation, directoryLoaded, notes, currentActiveView, onOpenSettings, onOpenNote, onDeleteNote, onCreateNote }: TnNavigationProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [navOpen, setNavOpen] = useState(openNavigation);
    const [isDirectoryLoaded, setIsDirectoryLoaded] = useState<boolean | undefined>(directoryLoaded);
    const [filteredNotes, setFilteredNotes] = useState<NoteSummary[]>(notes);
    const [activeView, setActiveView] = useState<string | null>(currentActiveView); // note id or 'settings'

    useEffect(() => {
        setNavOpen(openNavigation);
    }, [openNavigation]);

    useEffect(() => {
        setIsDirectoryLoaded(directoryLoaded);
    }, [directoryLoaded]);

    useEffect(() => {
        setActiveView(currentActiveView);
    }, [currentActiveView]);

    // Fetch notes from API on mount
    useEffect(() => {
        let active = true;
        const run = async () => {
            // // First attempt silent restore once (only on initial mount or when no local mode yet)
            // if (isDirectoryLoaded === undefined) {
            //     try { await tryRestoreLocalMode(); } catch { /* ignore */ }
            // }

            try {
                if (isDirectoryLoaded) {
                    let list = notes;

                    if (searchQuery && searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        list = list.filter(n => n.title.toLowerCase().includes(q) || n.tags.some(t => t.includes(q)));
                    }
                    // Ensure sorted by createdAt desc (newest first)
                    list = [...list].sort((a, b) => (b.createdAt as any).getTime() - (a.createdAt as any).getTime());
                    if (active) setFilteredNotes(list);
                } else {
                    if (active) setFilteredNotes([]);
                }
            } catch { /* ignore */ }
        };
        const h = setTimeout(run, 300);
        return () => { active = false; clearTimeout(h); };
    }, [searchQuery, isDirectoryLoaded, notes]);

    return (
        <>
            <NavDrawer open={navOpen} type={"inline"}>
                <NavDrawerHeader>
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            TagNotes {isDirectoryLoaded && <span className="text-xs text-green-600 border rounded px-1">Local</span>}
                        </h1>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onOpenSettings?.call(null)}
                            title="Open Settings"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>


                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search notes or tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </NavDrawerHeader>
                <NavDrawerBody>

                    {/* Notes List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredNotes.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                                {searchQuery ? "No notes found" : "No notes yet"}
                            </div>
                        ) : (
                            filteredNotes.map((note) => (
                                <div
                                    key={note.id}
                                    onClick={() => onOpenNote?.call(null, note.id)}
                                    className={cn(
                                        "px-2 py-1 border-b border-border cursor-pointer hover:bg-accent transition-colors group",
                                        activeView === note.id && "bg-accent",
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-normal text-sm text-foreground truncate">
                                                {note.title}
                                            </h3>
                                            <span className="text-xs text-muted-foreground">{formatDateTimeShort(note.createdAt)}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteNote?.call(null, note.id);
                                            }}
                                        >
                                            <Trash className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Create Note Button (only when local mode is active) */}
                    {isDirectoryLoaded && (
                        <div className="p-4 border-t border-border">
                            <Button onClick={() => onCreateNote?.call(null)} className="w-full">
                                <Plus className="h-4 w-4 mr-2" />
                                New Note
                            </Button>
                        </div>
                    )}

                </NavDrawerBody>
            </NavDrawer></>
    )
}

export default TnNavigation;