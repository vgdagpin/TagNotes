import { Note } from "./models";

export interface ITagNotesService {
	hasSelectedDirectory(): Promise<boolean>;
	selectedDirectoryName(): Promise<string | null>;

	browseDirectory(): Promise<string>;

	createNote(initial?: Partial<Note>): Promise<Note>;
}