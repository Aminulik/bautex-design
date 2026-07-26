module.exports = {
  id: '003_product_colors',
  up(db, done) {
    db.serialize(() => {
      // 1. Создаём таблицу
      db.run(`
        CREATE TABLE IF NOT EXISTS product_colors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id TEXT NOT NULL,
          color TEXT NOT NULL,
          FOREIGN KEY (product_id) REFERENCES products(id),
          UNIQUE(product_id, color)
        );
      `);

      // 2. Переносим данные из colors_json в product_colors
      db.all(
        "SELECT id, colors_json FROM products WHERE colors_json IS NOT NULL AND colors_json != '[]'",
        [],
        (err, rows) => {
          if (err) return done(err);

          const stmt = db.prepare(
            'INSERT OR IGNORE INTO product_colors (product_id, color) VALUES (?, ?)'
          );

          let pending = rows.length;
          if (pending === 0) return done();

          rows.forEach((row) => {
            try {
              const colors = JSON.parse(row.colors_json);
              if (Array.isArray(colors)) {
                colors.forEach((color) => {
                  if (color && typeof color === 'string') {
                    stmt.run([row.id, color.trim()]);
                  }
                });
              }
            } catch {
              // невалидный JSON — пропускаем
            }

            pending--;
            if (pending === 0) {
              stmt.finalize(() => done());
            }
          });
        }
      );
    });
  },
};
