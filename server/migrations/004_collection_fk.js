module.exports = {
  id: '004_collection_fk',
  up(db, done) {
    db.serialize(() => {
      // 1. Создаём новую таблицу с FK
      db.run(`
          CREATE TABLE IF NOT EXISTS products_new (
                                                      id TEXT PRIMARY KEY,
                                                      code TEXT NOT NULL,
                                                      name TEXT NOT NULL,
                                                      description TEXT,
                                                      collection TEXT,
                                                      collection_id TEXT,
                                                      color_hint TEXT,
                                                      image_url TEXT,
                                                      price REAL DEFAULT 0,
                                                      roll_size TEXT DEFAULT '1.06 x 10 м',
                                                      density TEXT,
                                                      colors_json TEXT DEFAULT '[]',
                                                      active INTEGER DEFAULT 1,
                                                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                      FOREIGN KEY (collection_id) REFERENCES collections(id)
              );
      `);

      // 2. Копируем данные из старой таблицы (явно указываем колонки и NULL для collection_id)
      db.run(`
          INSERT INTO products_new (
              id, code, name, description, collection, collection_id,
              color_hint, image_url, price, roll_size, density,
              colors_json, active, created_at, updated_at
          )
          SELECT
              id, code, name, description, collection, NULL,
              color_hint, image_url, price, roll_size, density,
              colors_json, active, created_at, updated_at
          FROM products;
      `);

      // 3. Подменяем таблицы
      db.run('DROP TABLE products;');
      db.run('ALTER TABLE products_new RENAME TO products;');

      // 4. Заполняем collection_id по совпадению collection ↔ collections.title
      db.all(
        `SELECT DISTINCT collection FROM products
         WHERE collection IS NOT NULL AND collection != '' AND collection_id IS NULL`,
        [],
        (err, rows) => {
          if (err) return done(err);

          if (rows.length === 0) return done();

          const stmt = db.prepare('INSERT OR IGNORE INTO collections (id, title) VALUES (?, ?)');

          rows.forEach((row) => {
            const id = row.collection
              .toLowerCase()
              .replace(/[^a-zа-яё0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .substring(0, 50);

            stmt.run([id, row.collection]);

            db.run(
              `UPDATE products SET collection_id = ? WHERE collection = ? AND collection_id IS NULL`,
              [id, row.collection]
            );
          });

          stmt.finalize(() => done());
        }
      );
    });
  },
};