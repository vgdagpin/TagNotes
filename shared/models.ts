/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */


// Types for our note system
export interface Section {
  id: string;
  type: "markdown" | "text" | "code" | "image";
  content: string;
  language?: string | null | undefined; // for code sections
  imageData?: string; // for image sections (base64)
  createdAt: Date;
}

export interface NoteSummary {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  location: string;
}

export interface Note {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  sections: Section[];
  tags: string[];
}

export interface NotesSettings {
  notesDirectory: string;
}