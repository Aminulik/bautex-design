module.exports = {
  id: '002_order_items',
  up(db, done) {
    db.exec(
      `
        CREATE TABLE IF NOT EXISTS order_items (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   order_id INTEGER NOT NULL,
                                                   product_id TEXT NOT NULL,
                                                   product_name TEXT,
                                                   product_code TEXT,
                                                   color TEXT,
                                                   quantity INTEGER DEFAULT 1,
                                                   price REAL DEFAULT 0,
                                                   total REAL DEFAULT 0,
                                                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                   FOREIGN KEY (order_id) REFERENCES orders (id)
            );
    `,
      done
    );
  },
};
