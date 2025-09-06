import { contextBridge, ipcRenderer } from 'electron';

// Expose a minimal, safe API surface. Extend as needed.

contextBridge.exposeInMainWorld('TagNotes', {
  version: () => '0.0.0', // placeholder; could be replaced by reading app.getVersion via ipc
  ipc: {
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (event, ...args) => listener(...args));
    },
  },
});

// In renderer you can: window.TagNotes.version()

// declare global {
//   interface Window {
//     TagNotes: {
//       version: () => string;
//       ipc: {
//         on: (channel: string, listener: (...args: any[]) => void) => void;
//       };
//     };
//   }
// }
