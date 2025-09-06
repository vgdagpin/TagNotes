export interface IDirectoryContextService {
	hasSelectedDirectory(): Promise<boolean>;
	browseDirectory(): void;
}

import { hasSelectedDirectory as notesClientHasSelectedDirectory } from "@/lib/notesClient";

export class DirectoryContextService implements IDirectoryContextService {
	async hasSelectedDirectory(): Promise<boolean> {
		return await notesClientHasSelectedDirectory();
	}

	browseDirectory() {
		console.log('browseDirectory called');
	}
}