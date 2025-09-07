import { Note, NoteSummary } from "./models";

export interface ITagNotesService {
	hasSelectedDirectory(): Promise<boolean>;
	getDirectoryName(): Promise<string | null>;
	listNotes(search?: string): Promise<NoteSummary[]>;

	browseDirectory(): Promise<string>;

	createNote(initial?: Partial<Note>): Promise<Note>;
	getNote(noteId: string): Promise<Note>;
}