import { 
	hasSelectedDirectory as ncHasSelectedDirectory, 
	browseDirectory as ncBrowseDirectory,
	getCurrentDirectoryName as ncGetCurrentDirectoryName,
	createNote as ncCreateNote,
	listNotes as ncListNotes,
	getNote as ncGetNote
 } from "@/lib/notesClient";

import { ITagNotesService } from "@/shared/ITagNotesService";
import { Note, NoteSummary } from "@/shared/models";

export class TagNotesService implements ITagNotesService {
 	async getNote(noteId: string): Promise<Note> {
		return await ncGetNote(noteId);
	}
	async listNotes(_search?: string): Promise<NoteSummary[]> {
		const list = await ncListNotes(_search);
        list.sort((a, b) => (b.createdAt as any).getTime() - (a.createdAt as any).getTime());
		return list;
	}
	async createNote(initial?: Partial<Note>): Promise<Note> {
		return await ncCreateNote(initial);
	}
	async getDirectoryName(): Promise<string | null> {
		return await ncGetCurrentDirectoryName();
	}
	async hasSelectedDirectory(): Promise<boolean> {
		return await ncHasSelectedDirectory();
	}

	async browseDirectory(): Promise<string> {
		return await ncBrowseDirectory();
	}
}