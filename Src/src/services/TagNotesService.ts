import { 
	hasSelectedDirectory as ncHasSelectedDirectory, 
	browseDirectory as ncBrowseDirectory,
	getCurrentDirectoryName as ncGetCurrentDirectoryName,
	createNote as ncCreateNote
 } from "@/lib/notesClient";

import { ITagNotesService } from "@/shared/ITagNotesService";
import { Note, NoteSummary } from "@/shared/models";

export class TagNotesService implements ITagNotesService {
	listNotes(_search?: string): Promise<NoteSummary[]> {
		throw new Error("Method not implemented.");
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