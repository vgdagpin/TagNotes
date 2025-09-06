import { 
	hasSelectedDirectory as ncHasSelectedDirectory, 
	browseDirectory as ncBrowseDirectory,
	getCurrentDirectoryName as ncGetCurrentDirectoryName,
	createNote as ncCreateNote
 } from "@/lib/notesClient";

import { ITagNotesService } from "@/shared/ITagNotesService";
import { Note } from "@/shared/models";

export class TagNotesService implements ITagNotesService {
	async createNote(initial?: Partial<Note>): Promise<Note> {
		return await ncCreateNote(initial);
	}
	async selectedDirectoryName(): Promise<string | null> {
		return await ncGetCurrentDirectoryName();
	}
	async hasSelectedDirectory(): Promise<boolean> {
		return await ncHasSelectedDirectory();
	}

	async browseDirectory(): Promise<string> {
		return await ncBrowseDirectory();
	}
}