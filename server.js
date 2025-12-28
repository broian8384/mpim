import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDB, getDB } from './electron/db.js';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize DB
await initDB();

// API ROUTES
// These routes mimic the Electron IPC handlers

// --- REQUESTS ---
app.get('/api/requests', async (req, res) => {
    const db = getDB();
    await db.read();
    res.json(db.data.requests || []);
});

app.post('/api/requests', async (req, res) => {
    const db = getDB();
    await db.read();
    const data = req.body;

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const pattern = new RegExp(`^ASS\/(\\d{4})\/${month}\/${year}$`);

    let maxSeq = 0;
    const requests = db.data.requests || [];
    requests.forEach(r => {
        if (r.regNumber) {
            const match = r.regNumber.match(pattern);
            if (match) {
                const seq = parseInt(match[1], 10);
                if (seq > maxSeq) maxSeq = seq;
            }
        }
    });
    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    const regNumber = `ASS/${nextSeq}/${month}/${year}`;

    const newId = requests.length > 0 ? Math.max(...requests.map(r => r.id)) + 1 : 1;

    const newReq = {
        ...data,
        id: newId,
        regNumber,
        createdAt: now.toISOString(),
        history: [{
            date: now.toISOString().split('T')[0],
            status: data.status,
            note: 'Permintaan dibuat baru',
            user: data.receiver,
            timestamp: now.toISOString()
        }]
    };

    if (!db.data.requests) db.data.requests = [];
    db.data.requests.push(newReq);
    await db.write();

    res.json(newReq);
});

app.put('/api/requests/:id', async (req, res) => {
    const db = getDB();
    await db.read();
    const id = parseInt(req.params.id);
    const data = req.body;

    if (!db.data.requests) return res.status(404).send('No data');
    const index = db.data.requests.findIndex(r => r.id === id);

    if (index !== -1) {
        // Safe Update Logic (preserving createdAt)
        const originalCreatedAt = db.data.requests[index].createdAt;
        db.data.requests[index] = { ...db.data.requests[index], ...data, createdAt: originalCreatedAt };
        await db.write();
        res.json(db.data.requests[index]);
    } else {
        res.status(404).send('Request not found');
    }
});

app.delete('/api/requests/:id', async (req, res) => {
    const db = getDB();
    await db.read();
    const id = parseInt(req.params.id);

    if (!db.data.requests) return res.json({ success: true });
    db.data.requests = db.data.requests.filter(r => r.id !== id);
    await db.write();
    res.json({ success: true });
});

app.post('/api/requests/:id/history', async (req, res) => {
    const db = getDB();
    await db.read();
    const id = parseInt(req.params.id);
    const { historyItem } = req.body;

    const index = db.data.requests.findIndex(r => r.id === id);
    if (index !== -1) {
        const reqItem = db.data.requests[index];
        if (!reqItem.history) reqItem.history = [];
        reqItem.history.push(historyItem);
        reqItem.status = historyItem.status;
        await db.write();
        res.json(reqItem);
    } else {
        res.status(404).send('Request not found');
    }
});

// --- AUTH / USERS ---
app.post('/api/auth/login', async (req, res) => {
    const db = getDB();
    await db.read();
    const { email, password } = req.body; // In this system, 'email' is often treated as username
    const user = db.data.users.find(u =>
        (u.email === email || u.username === email) && u.password === password
    );
    res.json(user || null);
});

app.get('/api/users', async (req, res) => {
    const db = getDB();
    await db.read();
    res.json(db.data.users || []);
});

// --- MASTER DATA ---
app.get('/api/master/doctors', async (req, res) => {
    const db = getDB(); await db.read(); res.json(db.data.doctors || []);
});
app.get('/api/master/insurances', async (req, res) => {
    const db = getDB(); await db.read(); res.json(db.data.insurances || []);
});
app.get('/api/master/services', async (req, res) => {
    const db = getDB(); await db.read(); res.json(db.data.services || []);
});
// Master Data Add/Update handlers would be similar...

// --- HANDOVER ---
app.get('/api/handover', async (req, res) => {
    const db = getDB(); await db.read();
    const notes = (db.data.handoverNotes || []).sort((a, b) => {
        if (a.isCompleted === b.isCompleted) return new Date(b.createdAt) - new Date(a.createdAt);
        return a.isCompleted ? 1 : -1;
    });
    res.json(notes);
});

// Serve Static Frontend
// We assumes 'npm run build' has been run and 'dist' exists
// Serve Static Frontend
const distPath = path.join(process.cwd(), 'dist');
console.log('Serving static from:', distPath);

// MANUAL STATIC SERVING (Bypassing Express Static due to env issues)
app.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) return next();

    let filePath = path.join(process.cwd(), 'dist', req.path === '/' ? 'index.html' : req.path);

    // Safety check to ensure we stay within dist
    if (!filePath.startsWith(path.join(process.cwd(), 'dist'))) return res.status(403).send('Forbidden');

    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'text/plain';
        if (ext === '.html') contentType = 'text/html';
        else if (ext === '.js') contentType = 'application/javascript';
        else if (ext === '.css') contentType = 'text/css';
        else if (ext === '.json') contentType = 'application/json';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg') contentType = 'image/jpeg';
        else if (ext === '.svg') contentType = 'image/svg+xml';

        res.setHeader('Content-Type', contentType);
        fs.createReadStream(filePath).pipe(res);
        return;
    }

    // Fallback to index.html for SPA
    // Only if it doesn't look like a file request (no extension) or specifically for html
    if (!path.extname(req.path) || req.path.endsWith('.html')) {
        const indexHtmlPath = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
            res.setHeader('Content-Type', 'text/html');
            fs.createReadStream(indexHtmlPath).pipe(res);
            return;
        }
    }

    next();
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Access this from other computers using your IP Address: http://<YOUR-IP>:3000`);
});
