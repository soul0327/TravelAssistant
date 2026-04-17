const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'travel.db');

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    // 1. 旅程表
    db.run(`CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        title TEXT,
        start_date TEXT,
        end_date TEXT,
        created_at INTEGER
    )`);

    // 2. 旅伴表
    db.run(`CREATE TABLE IF NOT EXISTS companions (
        id TEXT PRIMARY KEY,
        trip_id TEXT,
        name TEXT
    )`);

    // 3. 項目表 (新增 location 欄位)
    db.run(`CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        trip_id TEXT,
        type TEXT,
        date TEXT,
        start_time TEXT,
        end_time TEXT,
        title TEXT,           -- 標題 (例如: 吃晚餐)
        location TEXT,        -- 新增: 地點名稱 (例如: 壽司郎)
        cost INTEGER,
        note TEXT,
        address TEXT,         -- 詳細地址 (自動抓取)
        image_url TEXT,
        lat TEXT,
        lng TEXT,
        paid_by TEXT,
        split_by TEXT,
        transport_start TEXT,
        transport_end TEXT,
        transport_line TEXT,
        transport_time TEXT,
        stay_duration TEXT,
        is_individual INTEGER
    )`);
});

// --- API Endpoints ---

app.get('/api/trips', (req, res) => {
    db.all("SELECT * FROM trips ORDER BY start_date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/trips', (req, res) => {
    const { id, title, start_date, end_date } = req.body;
    const sql = `INSERT OR REPLACE INTO trips (id, title, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [id, title, start_date, end_date, Date.now()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/trips/:id', (req, res) => {
    const id = req.params.id;
    db.serialize(() => {
        db.run("DELETE FROM items WHERE trip_id = ?", id);
        db.run("DELETE FROM companions WHERE trip_id = ?", id);
        db.run("DELETE FROM trips WHERE id = ?", id, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

app.get('/api/companions', (req, res) => {
    const tripId = req.query.trip_id;
    db.all("SELECT * FROM companions WHERE trip_id = ?", [tripId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/companions', (req, res) => {
    const { id, trip_id, name } = req.body;
    db.run(`INSERT OR REPLACE INTO companions (id, trip_id, name) VALUES (?, ?, ?)`, [id, trip_id, name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/companions/:id', (req, res) => {
    db.run("DELETE FROM companions WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/items', (req, res) => {
    const tripId = req.query.trip_id;
    db.all("SELECT * FROM items WHERE trip_id = ? ORDER BY date ASC, start_time ASC", [tripId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/items', (req, res) => {
    const { 
        id, trip_id, type, date, start_time, end_time, title, location, cost, note, 
        address, image_url, lat, lng, paid_by, split_by,
        transport_start, transport_end, transport_line, transport_time, stay_duration,
        is_individual 
    } = req.body;

    const sql = `INSERT OR REPLACE INTO items (
        id, trip_id, type, date, start_time, end_time, title, location, cost, note, 
        address, image_url, lat, lng, paid_by, split_by, 
        transport_start, transport_end, transport_line, transport_time, stay_duration, is_individual
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        id, trip_id, type, date, start_time, end_time || '', title, location || '',
        cost || 0, note || '', address || '', image_url || '', lat || '', lng || '',
        paid_by || '', split_by || '[]',
        transport_start || '', transport_end || '', transport_line || '', transport_time || '', stay_duration || '',
        is_individual ? 1 : 0
    ];

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/items/:id', (req, res) => {
    db.run("DELETE FROM items WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(port, () => {
    console.log("http://localhost:3 " + port);
  });