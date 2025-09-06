import { ITagNotesService } from "@/shared/ITagNotesService";
import { Note } from "@/shared/models";

//import { ipcRenderer } from 'electron';

// Electron-specific service that delegates to exposed preload APIs if available.
export class ElectronTagNotesService implements ITagNotesService {
    private api: any;
    constructor(api: any) {
        this.api = api;
    }
    async hasSelectedDirectory(): Promise<boolean> {
		const getDirHandle = this.api?.getDirectoryHandle;

        if (getDirHandle) {
			const handle:FileSystemDirectoryHandle = await getDirHandle();

			// if no handle stored, or not a directory handle, return null
			if (!handle) {
				console.log('ElectronTagNotesService: No valid directory handle found.', handle);

				return false;
			}

			// Only query permission; do NOT prompt user automatically on load
			const hasPerm = await this.verifyPermission(handle, false, false).catch(() => false);

			if (!hasPerm) {
				console.log('ElectronTagNotesService: No permission for stored directory handle.');
			}

			return hasPerm;
        }

        return false;
    }

    async selectedDirectoryName(): Promise<string | null> {
        const getDirHandle = this.api?.getDirectoryHandle;

		if (getDirHandle === undefined) {
			throw new Error('browseDirectory api not available');
		}

		if (getDirHandle) {
			const handle:FileSystemDirectoryHandle = await getDirHandle();

			// if no handle stored, or not a directory handle, return null
			if (!handle) {
				return null;
			}

			return handle.name;
        }

        return null;
    }

	async browseDirectory(): Promise<string> {
		const setDirHandle = this.api?.browseDirectory;

		if (setDirHandle === undefined) {
			throw new Error('browseDirectory api not available');
		}

		const result = await setDirHandle();

		// if (!(window as any).showDirectoryPicker) {
		// 	throw new Error('File System Access API not supported in this browser.');
		// }

		// const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });

		// // Request write permission explicitly now
		// const granted = await this.verifyPermission(handle, true, true);

		// if (!granted) throw new Error('Permission denied for selected directory.');

		// console.log('browseDirectory: Selected directory', handle.name, handle);

		// await setDirHandle(handle);
		//await ipcRenderer.invoke('set-directory-handle', handle);

		return result;
	}

    async createNote(_initial?: Partial<Note>): Promise<Note> {
        throw new Error('Not implemented exception');
    }


	async verifyPermission(handle: any, requestWrite: boolean, promptIfNeeded: boolean) {
		if (!handle) {
			return false;
		}

		const opts: any = {
			mode: requestWrite ? 'readwrite' : 'read'
		};

		const current = await handle.queryPermission(opts);

		if (current === 'granted') {
			return true;
		}

		if (!promptIfNeeded) {
			return false;
		}

		const req = await handle.requestPermission(opts);

		return req === 'granted';
	}

	isDirectoryHandle(obj: any): obj is FileSystemDirectoryHandle {
		return obj && typeof obj === 'object' && obj.kind === 'directory';
	}
}
