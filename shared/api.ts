/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// Types for our note system
export interface Section {
  id: string;
  type: "markdown" | "text" | "code" | "image";
  content: string;
  language?: string; // for code sections
  imageData?: string; // for image sections (base64)
  createdAt: Date;
}

export interface Note {
  id: string;
  title: string;
  sections: Section[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}