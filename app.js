const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 1936;
const DB_PATH = path.join(__dirname, 'data', 'blog.db');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err.message);
        return reject(err);
      }
      console.log('✅ Connected to SQLite database');

      db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL
      )`, (err2) => {
        if (err2) {
          console.error('❌ Error creating table:', err2.message);
          return reject(err2);
        }
        console.log('✅ Posts table ready');
        resolve(db);
      });
    });
  });
}

let db;
app.get('/', (req, res) => {
    res.send('Hello from Node.js app');
  });

// GET all posts
app.get('/api/posts', (req, res) => {
  db.all('SELECT * FROM posts ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET post by id
app.get('/api/posts/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM posts WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Post not found' });
    res.json(row);
  });
});

// CREATE post
app.post('/api/posts', (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  db.run('INSERT INTO posts (title, content) VALUES (?, ?)', [title, content], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, title, content });
  });
});

// UPDATE post
app.put('/api/posts/:id', (req, res) => {
  const id = req.params.id;
  const { title, content } = req.body;

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  db.run('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ id, title, content });
  });
});

// DELETE post
app.delete('/api/posts/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM posts WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted successfully' });
  });
});

// API 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Optional SPA fallback (only if you have a single-page client)
// If you don't want it, remove this block.
// Express 5 safe fallback (avoid app.get('*') which can break path-to-regexp)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    db = await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Blog MVC REST API Server running on http://localhost:${PORT}`);
      console.log(`📌 API endpoints:`);
      console.log(`   GET    /api/posts`);
      console.log(`   GET    /api/posts/:id`);
      console.log(`   POST   /api/posts`);
      console.log(`   PUT    /api/posts/:id`);
      console.log(`   DELETE /api/posts/:id`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  if (db) {
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      else console.log('📊 Database connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

startServer();
