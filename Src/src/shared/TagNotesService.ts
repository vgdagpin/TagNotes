export interface ITagNotesService {
	hasSelectedDirectory(): Promise<boolean>;
	selectedDirectoryName(): Promise<string | null>;

	browseDirectory(): Promise<string>;
}

import { 
	hasSelectedDirectory as ncHasSelectedDirectory, 
	browseDirectory as ncBrowseDirectory,
	getCurrentDirectoryName as ncGetCurrentDirectoryName
 } from "@/lib/notesClient";

export class TagNotesService implements ITagNotesService {
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