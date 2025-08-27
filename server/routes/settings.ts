import { RequestHandler } from "express";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { NotesSettings } from "@shared/api";

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
    const settings: NotesSettings = JSON.parse(raw);

    if (!settings.notesDirectory || settings.notesDirectory.trim() === "") {
      settings.notesDirectory = getDefaultNotesDirectory();
    }

    return settings;

  } catch (error) {
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
    console.log('save settings', SETTINGS_FILE);

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/settings - Get current settings
 */
export const handleGetSettings: RequestHandler = (req, res) => {
  try {
    const settings = loadSettingsFromFile();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve settings" });
  }
};

/**
 * POST /api/settings - Save settings
 */
export const handleSaveSettings: RequestHandler = (req, res) => {
  try {
    const { notesDirectory } = req.body;

    const settings = loadSettingsFromFile();

    settings.notesDirectory = notesDirectory.trim();

    saveSettingsToFile(settings);
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to save settings" });
  }
};

/**
 * Function to get current settings (for use by other server modules)
 */
export function getCurrentSettings(): NotesSettings {
  return loadSettingsFromFile();
}
