const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'shortener.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS short_urls (
    id TEXT PRIMARY KEY,
    full_article_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    encrypted_payload BLOB NOT NULL,
    expires_at INTEGER NOT NULL,
    created_timestamp INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  // Index for cleanup and lookups
  db.run(`CREATE INDEX IF NOT EXISTS idx_expires_at ON short_urls(expires_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_full_article_id ON short_urls(full_article_id)`);
});

// Generate short ID
function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate unique short ID
function generateUniqueShortId() {
  return new Promise((resolve, reject) => {
    const tryGenerate = () => {
      const shortId = generateShortId();
      db.get('SELECT id FROM short_urls WHERE id = ?', [shortId], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          // ID exists, try again
          setTimeout(tryGenerate, 1);
        } else {
          resolve(shortId);
        }
      });
    };
    tryGenerate();
  });
}

// Simple hash function
function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
}

// Cleanup expired URLs (run periodically)
function cleanupExpiredUrls() {
  const now = Date.now();
  db.run('DELETE FROM short_urls WHERE expires_at < ?', [now], function(err) {
    if (err) {
      console.error('Error cleaning up expired URLs:', err);
    } else if (this.changes > 0) {
      console.log(`Cleaned up ${this.changes} expired URLs`);
    }
  });
}

// Run cleanup every hour
setInterval(cleanupExpiredUrls, 60 * 60 * 1000);

// API Routes

// Create short URL
app.post('/api/short', async (req, res) => {
  try {
    const { articleId, title, author, createdAt, contentHash, encryptedPayload } = req.body;

    if (!articleId || !title || !author || !createdAt || !contentHash || !encryptedPayload) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if URL already exists for this article
    db.get(
      'SELECT id FROM short_urls WHERE full_article_id = ? AND expires_at > ?',
      [articleId, Date.now()],
      async (err, existingRow) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingRow) {
          // Return existing short ID
          return res.json({ shortId: existingRow.id });
        }

        try {
          // Generate new short ID
          const shortId = await generateUniqueShortId();
          const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

          // Store in database
          db.run(
            `INSERT INTO short_urls 
             (id, full_article_id, title, author, created_at, content_hash, encrypted_payload, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [shortId, articleId, title, author, createdAt, contentHash, Buffer.from(new Uint8Array(encryptedPayload)), expiresAt],
            function(err) {
              if (err) {
                console.error('Database insert error:', err);
                return res.status(500).json({ error: 'Failed to create short URL' });
              }

              console.log(`Created short URL: ${shortId} for article: ${articleId}`);
              res.json({ shortId });
            }
          );
        } catch (error) {
          console.error('Error generating short ID:', error);
          res.status(500).json({ error: 'Failed to generate short URL' });
        }
      }
    );
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resolve short URL
app.get('/api/short/:shortId', (req, res) => {
  const { shortId } = req.params;

  if (!/^[a-zA-Z0-9]{8}$/.test(shortId)) {
    return res.status(400).json({ error: 'Invalid short ID format' });
  }

  db.get(
    'SELECT * FROM short_urls WHERE id = ? AND expires_at > ?',
    [shortId, Date.now()],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Short URL not found or expired' });
      }

      // Return metadata and encrypted payload
      res.json({
        articleId: row.full_article_id,
        title: row.title,
        author: row.author,
        createdAt: row.created_at,
        contentHash: row.content_hash,
        encryptedPayload: Array.from(row.encrypted_payload)
      });
    }
  );
});

// Get statistics
app.get('/api/stats', (req, res) => {
  db.all(`
    SELECT 
      COUNT(*) as total_urls,
      COUNT(CASE WHEN expires_at > strftime('%s', 'now') * 1000 THEN 1 END) as active_urls,
      MIN(created_timestamp) as oldest_created,
      MAX(created_timestamp) as newest_created
    FROM short_urls
  `, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const stats = rows[0];
    res.json({
      totalUrls: stats.total_urls,
      activeUrls: stats.active_urls,
      oldestCreated: stats.oldest_created,
      newestCreated: stats.newest_created
    });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Shortener server running on port ${PORT}`);
  console.log(`📊 Stats available at: http://localhost:${PORT}/api/stats`);
  console.log(`❤️  Health check at: http://localhost:${PORT}/api/health`);
  
  // Run initial cleanup
  setTimeout(cleanupExpiredUrls, 1000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('📚 Database connection closed.');
    }
    process.exit(0);
  });
});

module.exports = app;