import {
	hasSelectedDirectory as ncHasSelectedDirectory,
	browseDirectory as ncBrowseDirectory,
	getCurrentDirectoryName as ncGetCurrentDirectoryName,
	createNote as ncCreateNote,
	listNotes as ncListNotes,
	getNote as ncGetNote,
	addSection as ncAddSection,
	addImageSection as ncAddImageSection,
	updateSectionContent as ncUpdateSectionContent,
	updateSectionTitle as ncUpdateSectionTitle,
	updateTitle as ncUpdateTitle,
	deleteSection as ncDeleteSection,
	deleteNote as ncDeleteNote,
	addTag as ncAddTag,
	removeTag as ncRemoveTag,
	getTags as ncGetTags
} from "@/lib/notesClient";

import { ITagNotesService } from "@/shared/ITagNotesService";
import { Note, NoteSummary, Section } from "@/shared/models";

export class TagNotesService implements ITagNotesService {
	async getTags(): Promise<string[]> {
		return await ncGetTags();
	}
	async updateSectionTitle(_noteId: string, _sectionId: string, _title: string): Promise<void> {
		await ncUpdateSectionTitle(_noteId, _sectionId, _title);
	}
	async updateTitle(_noteId: string, _title: string): Promise<void> {
		await ncUpdateTitle(_noteId, _title);
	}
	async deleteSection(_noteId: string, _sectionId: string): Promise<void> {
		await ncDeleteSection(_noteId, _sectionId);
	}
	async deleteNote(_noteId: string): Promise<void> {
		await ncDeleteNote(_noteId);
	}
	async addTag(_noteId: string, _tag: string): Promise<void> {
		await ncAddTag(_noteId, _tag);
	}
	async removeTag(_noteId: string, _tag: string): Promise<void> {
		await ncRemoveTag(_noteId, _tag);
	}

	async addSection(_noteId: string, _sectionType: Section["type"]): Promise<Section> {
		return await ncAddSection(_noteId, _sectionType);
	}
	async addImageSection(_noteId: string, _imageData: string): Promise<Section> {
		return await ncAddImageSection(_noteId, _imageData);
	}
	async updateSectionContent(_noteId: string, _sectionId: string, _content: string, _language?: string | null | undefined): Promise<void> {
		await ncUpdateSectionContent(_noteId, _sectionId, _content, _language);
	}
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