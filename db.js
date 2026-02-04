const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'travel.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. 旅程主表 (包含航班、住宿等全域資訊)
    db.run(`CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        title TEXT,
        start_date TEXT,
        end_date TEXT,
        flight_info TEXT, -- JSON 字串
        hotel_info TEXT,  -- JSON 字串
        cover_photo TEXT,
        created_at INTEGER
    )`);

    // 2. 旅伴表 (誰去了這趟旅程)
    db.run(`CREATE TABLE IF NOT EXISTS companions (
        id TEXT PRIMARY KEY,
        trip_id TEXT,
        name TEXT,
        avatar_color TEXT
    )`);

    // 3. 時間軸細項表 (所有類型統一在此)
    db.run(`CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        trip_id TEXT,
        type TEXT,        -- spot, transport, hotel, expense
        date TEXT,        -- YYYY-MM-DD (歸屬哪一天)
        start_time TEXT,
        end_time TEXT,
        title TEXT,
        location TEXT,
        lat REAL,
        lng REAL,
        cost INTEGER,
        currency TEXT DEFAULT 'TWD',
        note TEXT,
        created_by TEXT,  -- 關聯 companion_id
        sort_order INTEGER,
        photos TEXT,      -- JSON 陣列 (圖檔路徑)
        is_synced INTEGER DEFAULT 1
    )`);
});

module.exports = db;