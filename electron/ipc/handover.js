import { ipcMain } from 'electron';
import { getDB } from '../db.js';
import { randomUUID } from 'crypto';

export function setupHandoverHandlers() {
    // Get all notes (sorted by date desc)
    ipcMain.handle('handover:list', async () => {
        const db = getDB();
        // Return notes sorted newest first, and put completed items at the bottom
        return (db.data.handoverNotes || [])
            .sort((a, b) => {
                if (a.isCompleted === b.isCompleted) {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                }
                return a.isCompleted ? 1 : -1;
            });
    });

    // Add new note (Enhanced)
    ipcMain.handle('handover:add', async (_event, data) => {
        const db = getDB();
        if (!db.data.handoverNotes) db.data.handoverNotes = [];

        const { content, author, priority, category, relatedRequestId } = data;

        const newNote = {
            id: randomUUID(),
            content,
            author,
            priority: priority || 'normal', // normal, high, critical
            category: category || 'general', // general, patient, facility
            relatedRequestId: relatedRequestId || null, // Linked request ID
            createdAt: new Date().toISOString(),
            isCompleted: false,
            completedBy: null,
            completedAt: null
        };

        db.data.handoverNotes.unshift(newNote); // Add to top
        await db.write();
        return { success: true, note: newNote };
    });

    // Toggle completion status
    ipcMain.handle('handover:toggle', async (_event, { id, by }) => {
        const db = getDB();
        const note = db.data.handoverNotes.find(n => n.id === id);

        if (note) {
            note.isCompleted = !note.isCompleted;
            if (note.isCompleted) {
                note.completedBy = by;
                note.completedAt = new Date().toISOString();
            } else {
                note.completedBy = null;
                note.completedAt = null;
            }
            await db.write();
            return { success: true };
        }
        return { success: false, message: 'Note not found' };
    });

    // Add comment to note
    ipcMain.handle('handover:comment', async (_event, { id, content, author }) => {
        const db = getDB();
        const note = db.data.handoverNotes.find(n => n.id === id);

        if (note) {
            if (!note.comments) note.comments = []; // Ensure array exists

            note.comments.push({
                id: randomUUID(),
                content,
                author,
                createdAt: new Date().toISOString()
            });

            await db.write();
            return { success: true, comments: note.comments };
        }
        return { success: false, message: 'Note not found' };
    });

    // Delete note
    ipcMain.handle('handover:delete', async (_event, id) => {
        const db = getDB();
        const initialLength = db.data.handoverNotes.length;
        db.data.handoverNotes = db.data.handoverNotes.filter(n => n.id !== id);

        if (db.data.handoverNotes.length !== initialLength) {
            await db.write();
            return { success: true };
        }
        return { success: false, message: 'Note not found' };
    });
}
