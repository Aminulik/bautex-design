const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database(path.join(__dirname, 'orders.db'));

function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort();

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    migrationFiles.forEach((file) => {
      const migration = require(path.join(migrationsDir, file));
      if (!migration?.id || typeof migration.up !== 'function') return;

      db.get('SELECT id FROM schema_migrations WHERE id = ?', [migration.id], (err, row) => {
        if (err || row) return;

        migration.up(db, (migrationErr) => {
          if (migrationErr) {
            console.error(`Migration ${migration.id} failed:`, migrationErr.message);
            return;
          }

          db.run('INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)', [migration.id]);
          console.log(`Migration applied: ${migration.id}`);
        });
      });
    });
  });
}

function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;

  db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, row) => {
    if (err) return;
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    if (!row) {
      db.run('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)', [
        adminEmail,
        hashedPassword,
        'Admin',
        'admin',
      ]);
      return;
    }

    db.run('UPDATE users SET password = ?, role = ? WHERE email = ?', [
      hashedPassword,
      'admin',
      adminEmail,
    ]);
  });
}

runMigrations();
db.serialize(seedAdmin);

module.exports = db;
