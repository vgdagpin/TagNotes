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
 * Makes an API call to get settings (client-side only)
 */
async function getSettingsFromAPI(): Promise<NotesSettings | null> {
  try {
    console.log("🌐 [SHARED] Attempting to fetch settings from API...");
    const response = await fetch('/api/settings');
    if (response.ok) {
      const settings = await response.json();
      console.log("✅ [SHARED] Successfully fetched settings from API:", settings);
      return settings;
    } else {
      console.warn("⚠️ [SHARED] API returned non-OK status:", response.status);
      return null;
    }
  } catch (error) {
    console.warn("❌ [SHARED] Failed to fetch settings from API:", error);
    return null;
  }
}

/**
 * Makes an API call to save settings (client-side only)
 */
async function saveSettingsToAPI(settings: NotesSettings): Promise<boolean> {
  try {
    console.log("🌐 [SHARED] Attempting to save settings to API:", settings);
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (response.ok) {
      const savedSettings = await response.json();
      console.log("✅ [SHARED] Successfully saved settings to API:", savedSettings);
      return true;
    } else {
      console.warn("⚠️ [SHARED] API save returned non-OK status:", response.status);
      return false;
    }
  } catch (error) {
    console.warn("❌ [SHARED] Failed to save settings to API:", error);
    return false;
  }
}

/**
 * Gets settings from localStorage or returns default settings.
 */
export function getSettings(): NotesSettings {
  const isServer = typeof window === "undefined";
  console.log(
    `📦 [SHARED] getSettings() called from ${isServer ? "SERVER" : "CLIENT"} environment`,
  );

  try {
    // Only access localStorage in browser environment
    if (typeof window !== "undefined" && window.localStorage) {
      console.log(
        "🌐 [SHARED] Browser environment detected, checking localStorage...",
      );
      const savedSettings = localStorage.getItem("notesSettings");
      console.log("🌐 [SHARED] localStorage contents:", savedSettings);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        console.log("✅ [SHARED] Parsed settings from localStorage:", settings);
        return {
          notesDirectory: settings.notesDirectory || getDefaultNotesDirectory(),
        };
      } else {
        console.log("⚠️ [SHARED] No settings found in localStorage");
      }
    } else {
      console.log(
        "🖥️ [SHARED] Server environment detected, localStorage not available",
      );
    }

    // Return default settings if no saved settings found
    const defaultDir = getDefaultNotesDirectory();
    console.log(
      "🔄 [SHARED] Returning default settings with directory:",
      defaultDir,
    );
    return {
      notesDirectory: defaultDir,
    };
  } catch (error) {
    console.error("❌ [SHARED] Failed to load settings:", error);
    return {
      notesDirectory: getDefaultNotesDirectory(),
    };
  }
}

/**
 * Saves settings to localStorage.
 */
export function saveSettings(settings: NotesSettings): void {
  console.log("💾 [SHARED] saveSettings() called with:", settings);
  try {
    // Only access localStorage in browser environment
    if (typeof window !== "undefined" && window.localStorage) {
      console.log(
        "🌐 [SHARED] Browser environment detected, saving to localStorage...",
      );
      localStorage.setItem("notesSettings", JSON.stringify(settings));
      console.log("✅ [SHARED] Settings saved to localStorage successfully");
    } else {
      console.log(
        "🖥️ [SHARED] Server environment detected, cannot save to localStorage",
      );
    }
  } catch (error) {
    console.error("❌ [SHARED] Failed to save settings:", error);
    throw error;
  }
}
