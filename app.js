const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 1936;

const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'blog.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    ensureDbDir();

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err);

      db.run(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `, (err2) => {
        if (err2) return reject(err2);

        db.run(`ALTER TABLE posts ADD COLUMN created_at TEXT`, () => {});
        db.run(`ALTER TABLE posts ADD COLUMN updated_at TEXT`, () => {});

        db.run(`UPDATE posts SET created_at = COALESCE(created_at, datetime('now'))`);
        db.run(`UPDATE posts SET updated_at = COALESCE(updated_at, created_at)`);

        resolve(db);
      });
    });
  });
}

let db;

/* GET all */
app.get('/api/posts', (req, res) => {
  db.all(
    `SELECT * FROM posts ORDER BY id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/* GET by id */
app.get('/api/posts/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  db.get(`SELECT * FROM posts WHERE id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });

    res.json(row);
  });
});

/* CREATE */
app.post('/api/posts', (req, res) => {
  const { title, content } = req.body;

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'Title and content required' });
  }

  db.run(
    `INSERT INTO posts (title, content) VALUES (?, ?)`,
    [title.trim(), content.trim()],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get(
        `SELECT * FROM posts WHERE id = ?`,
        [this.lastID],
        (e2, row) => {
          if (e2) return res.status(500).json({ error: e2.message });
          res.status(201).json(row);
        }
      );
    }
  );
});

/* UPDATE */
app.put('/api/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, content } = req.body;

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'Title and content required' });
  }

  db.run(
    `
    UPDATE posts
    SET title = ?, content = ?, updated_at = datetime('now')
    WHERE id = ?
    `,
    [title.trim(), content.trim(), id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (!this.changes) return res.status(404).json({ error: 'Not found' });

      db.get(
        `SELECT * FROM posts WHERE id = ?`,
        [id],
        (e2, row) => {
          if (e2) return res.status(500).json({ error: e2.message });
          res.json(row);
        }
      );
    }
  );
});

/* DELETE */
app.delete('/api/posts/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  db.run(`DELETE FROM posts WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Not found' });

    res.json({ success: true });
  });
});

/* API 404 */
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/* SPA */
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    db = await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on :${PORT}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  if (db) db.close();
  process.exit(0);
});

startServer();
