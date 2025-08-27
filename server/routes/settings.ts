import { RequestHandler } from "express";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { NotesSettings } from "../../shared/settingsHelper";

// Settings file path
const SETTINGS_DIR = path.join(__dirname, "..", "data");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");

/**
 * Gets the default notes directory path for server environment
 */
function getDefaultNotesDirectory(): string {
  try {
    const homeDir = os.homedir();
    const documentsDir = path.join(homeDir, "Documents");
    return path.join(documentsDir, "TagNotes");
  } catch (error) {
    console.error("Failed to get default directory:", error);
    // Fallback to server data directory
    return path.join(__dirname, "..", "data");
  }
}

/**
 * Ensure settings directory and file exist
 */
function ensureSettingsFile() {
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  }

  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaultSettings: NotesSettings = {
      notesDirectory: getDefaultNotesDirectory(),
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
    console.log(
      "🔧 [SERVER API] Created default settings file:",
      defaultSettings,
    );
  }
}

/**
 * Load settings from file
 */
function loadSettingsFromFile(): NotesSettings {
  ensureSettingsFile();
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const settings = JSON.parse(raw);
    console.log("📁 [SERVER API] Loaded settings from file:", settings);
    return settings;
  } catch (error) {
    console.error("❌ [SERVER API] Failed to load settings from file:", error);
    // Return default settings if file is corrupted
    return {
      notesDirectory: getDefaultNotesDirectory(),
    };
  }
}

/**
 * Save settings to file
 */
function saveSettingsToFile(settings: NotesSettings): void {
  ensureSettingsFile();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log("💾 [SERVER API] Saved settings to file:", settings);
  } catch (error) {
    console.error("❌ [SERVER API] Failed to save settings to file:", error);
    throw error;
  }
}

/**
 * GET /api/settings - Get current settings
 */
export const handleGetSettings: RequestHandler = (req, res) => {
  console.log("🔍 [SERVER API] GET /api/settings called");
  try {
    const settings = loadSettingsFromFile();
    res.status(200).json(settings);
  } catch (error) {
    console.error("❌ [SERVER API] Failed to get settings:", error);
    res.status(500).json({ error: "Failed to retrieve settings" });
  }
};

/**
 * POST /api/settings - Save settings
 */
export const handleSaveSettings: RequestHandler = (req, res) => {
  console.log("💾 [SERVER API] POST /api/settings called with body:", req.body);
  try {
    const { notesDirectory } = req.body;

    if (typeof notesDirectory !== "string") {
      return res.status(400).json({ error: "notesDirectory must be a string" });
    }

    const settings: NotesSettings = {
      notesDirectory: notesDirectory.trim() || getDefaultNotesDirectory(),
    };

    saveSettingsToFile(settings);
    res.status(200).json(settings);
  } catch (error) {
    console.error("❌ [SERVER API] Failed to save settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
};

/**
 * Function to get current settings (for use by other server modules)
 */
export function getCurrentSettings(): NotesSettings {
  return loadSettingsFromFile();
}
