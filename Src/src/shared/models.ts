/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */


// Types for our note system
export interface Section {
  id: string;
  type: "markdown" | "text" | "code" | "image";
  title?: string; // optional title for the section
  content: string;
  language?: string | null | undefined; // for code sections
  imageData?: string; // for image sections (base64)
  createdAt: Date;
  // Canvas positioning properties
  x?: number; // X coordinate relative to canvas
  y?: number; // Y coordinate relative to canvas
  width?: number; // Section width
  height?: number; // Section height
}

export interface NoteSummary {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  location: string;
  tags: string[]; // added for search indexing
}

export interface Note {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  location?: string;
  sections: Section[];
  tags: string[];
}

export interface NotesSettings {
  notesDirectory: string;
}