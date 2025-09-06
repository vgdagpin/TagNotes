import { ITagNotesService } from "@/shared/ITagNotesService";
import { Note } from "@/shared/models";

// Electron-specific service that delegates to exposed preload APIs if available.
export class ElectronTagNotesService implements ITagNotesService {
    private api: any;
    constructor(api: any) {
        this.api = api;
    }
    async hasSelectedDirectory(): Promise<boolean> {
        if (this.api?.hasSelectedDirectory !== undefined) {
            // if property boolean, wrap; if function, invoke
            const v = this.api.hasSelectedDirectory;
            if (typeof v === 'function') return await v();
            return !!v;
        }
        return false;
    }
    async selectedDirectoryName(): Promise<string | null> {
        if (this.api?.selectedDirectoryName) return await this.api.selectedDirectoryName();
        return null;
    }
    async browseDirectory(): Promise<string> {
        if (this.api?.browseDirectory) return await this.api.browseDirectory();
        throw new Error('browseDirectory api not available');
    }
    async createNote(initial?: Partial<Note>): Promise<Note> {
        if (this.api?.createNote) return await this.api.createNote(initial);
        throw new Error('createNote api not available');
    }
}
