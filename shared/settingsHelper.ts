import * as os from "os";
import * as path from "path";

export interface NotesSettings {
  notesDirectory: string;
}

/**
 * Gets the default notes directory path.
 * Returns the user's documents folder with a "TagNotes" subdirectory.
 */
export function getDefaultNotesDirectory(): string {
  try {
    // For Node.js environment (server-side)
    if (typeof window === "undefined" && os && os.homedir) {
      const homeDir = os.homedir();
      // Try to get Documents folder
      const documentsDir = path.join(homeDir, "Documents");
      return path.join(documentsDir, "TagNotes");
    }

    // For browser environment (client-side), return a reasonable default
    return "";
  } catch (error) {
    console.error("Failed to get default directory:", error);
    return "";
  }
}

/**
 * Gets settings from localStorage or returns default settings.
 */
export function getSettings(): NotesSettings {
  try {
    // Only access localStorage in browser environment
    if (typeof window !== "undefined" && window.localStorage) {
      const savedSettings = localStorage.getItem("notesSettings");
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        return {
          notesDirectory: settings.notesDirectory || getDefaultNotesDirectory(),
        };
      }
    }

    // Return default settings if no saved settings found
    return {
      notesDirectory: getDefaultNotesDirectory(),
    };
  } catch (error) {
    console.error("Failed to load settings:", error);
    return {
      notesDirectory: getDefaultNotesDirectory(),
    };
  }
}

/**
 * Saves settings to localStorage.
 */
export function saveSettings(settings: NotesSettings): void {
  try {
    // Only access localStorage in browser environment
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("notesSettings", JSON.stringify(settings));
    }
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
}
