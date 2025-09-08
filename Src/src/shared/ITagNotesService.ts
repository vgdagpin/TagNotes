import { Note, NoteSummary, Section } from "./models";

export interface ITagNotesService {
	hasSelectedDirectory(): Promise<boolean>;
	getDirectoryName(): Promise<string | null>;
	listNotes(search?: string): Promise<NoteSummary[]>;

	browseDirectory(): Promise<string>;

	createNote(initial?: Partial<Note>): Promise<Note>;
	getNote(noteId: string): Promise<Note>;

	addSection(noteId: string, sectionType: Section['type']): Promise<Section>;
	addImageSection(noteId: string, imageData: string): Promise<Section>;

	updateSectionContent(noteId: string, sectionId: string, content: string, language?: string | null | undefined): Promise<void>;
	updateSectionPosition(noteId: string, sectionId: string, x: number, y: number): Promise<void>;
	updateSectionDimensions(noteId: string, sectionId: string, width: number, height: number): Promise<void>;
	convertSectionType(noteId: string, sectionId: string, newType: Section['type']): Promise<void>;
	updateTitle(noteId: string, title: string): Promise<void>;
	deleteSection(noteId: string, sectionId: string): Promise<void>;
	deleteNote(noteId: string): Promise<void>;

	getDefaultTags(): Promise<string[]>;
	addTag(noteId: string, tag: string): Promise<void>;
	removeTag(noteId: string, tag: string): Promise<void>;
}