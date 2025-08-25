import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleGetNotes, handleFindNote, handleAddNoteSection, handleDeleteNoteSection, handleUpdateSectionContent, handleCreateNote, handleAddNoteTag, handleRemoveNoteTag, handleDeleteNote } from "./routes/notes";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  app.get('/api/notes', handleGetNotes);
  app.get('/api/notes/:noteId', handleFindNote);
  app.delete('/api/notes/:noteId', handleDeleteNote);

  app.post('/api/notes', handleCreateNote);

  app.post('/api/notes/:noteId/addSection', handleAddNoteSection);
  app.post('/api/notes/:noteId/tags', handleAddNoteTag);
  app.delete('/api/notes/:noteId/tags/:tag', handleRemoveNoteTag);

  app.delete('/api/notes/:noteId/deleteSection/:sectionId', handleDeleteNoteSection);

  app.put('/api/notes/:noteId/updateSection/:sectionId/content', handleUpdateSectionContent);

  return app;
}
