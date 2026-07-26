const ORDER_STATUSES = ['new', 'in_progress', 'approved', 'cancelled', 'completed'];

function safeAddColumn(db, table, column, definition, done) {
  db.all(`PRAGMA table_info(${table})`, [], (err, columns) => {
    if (err) return done(err);
    if (columns.some((item) => item.name === column)) return done();
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, done);
  });
}

function runSeries(tasks, done) {
  const next = (index) => {
    if (index >= tasks.length) return done();
    tasks[index]((err) => {
      if (err) return done(err);
      next(index + 1);
    });
  };
  next(0);
}

module.exports = {
  id: '001_core_schema',
  up(db, done) {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        city TEXT NOT NULL,
        fabricType TEXT,
        color TEXT,
        quantity TEXT,
        comment TEXT,
        subtotal REAL,
        delivery_cost REAL,
        total_amount REAL,
        status TEXT DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id TEXT NOT NULL,
        author_name TEXT,
        author_phone TEXT,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sender TEXT CHECK (sender IN ('user','ai')) NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS call_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        phone_number TEXT NOT NULL,
        question TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        admin_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS visualizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        result_url TEXT NOT NULL,
        wallpaper_id TEXT,
        color_hex TEXT,
        method TEXT,
        quality TEXT,
        duration_ms INTEGER,
        mask_coverage REAL,
        segmentation_mode TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        collection TEXT,
        color_hint TEXT,
        image_url TEXT,
        price REAL DEFAULT 0,
        roll_size TEXT DEFAULT '1.06 x 10 м',
        density TEXT,
        colors_json TEXT DEFAULT '[]',
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id TEXT NOT NULL,
        product_data TEXT,
        color TEXT,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, product_id, color)
      );

      CREATE TABLE IF NOT EXISTS visualization_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        original_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS ml_metric_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_path TEXT,
        images_count INTEGER DEFAULT 0,
        mean_iou REAL,
        mean_dice REAL,
        mean_precision REAL,
        mean_recall REAL,
        report_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    db.exec(sql, (err) => {
      if (err) return done(err);

      runSeries(
        [
          (next) => safeAddColumn(db, 'orders', 'user_id', 'INTEGER', next),
          (next) => safeAddColumn(db, 'orders', 'status', "TEXT DEFAULT 'new'", next),
          (next) => safeAddColumn(db, 'reviews', 'author_name', 'TEXT', next),
          (next) => safeAddColumn(db, 'reviews', 'author_phone', 'TEXT', next),
          (next) => safeAddColumn(db, 'visualizations', 'duration_ms', 'INTEGER', next),
          (next) => safeAddColumn(db, 'visualizations', 'mask_coverage', 'REAL', next),
          (next) => safeAddColumn(db, 'visualizations', 'segmentation_mode', 'TEXT', next),
          (next) => safeAddColumn(db, 'visualizations', 'project_id', 'INTEGER', next),
          (next) => safeAddColumn(db, 'visualizations', 'title', 'TEXT', next),
          (next) => safeAddColumn(db, 'visualizations', 'original_url', 'TEXT', next),
          (next) => safeAddColumn(db, 'visualizations', 'price', 'REAL', next),
          (next) => safeAddColumn(db, 'visualizations', 'room_area', 'REAL', next),
          (next) => safeAddColumn(db, 'visualizations', 'rolls_count', 'INTEGER', next),
          (next) => {
            db.run(
              `UPDATE orders SET status = CASE
                WHEN status = 'processing' THEN 'in_progress'
                WHEN status = 'done' THEN 'completed'
                WHEN status IS NULL OR status = '' THEN 'new'
                WHEN status NOT IN (${ORDER_STATUSES.map(() => '?').join(',')}) THEN 'new'
                ELSE status
              END`,
              ORDER_STATUSES,
              next
            );
          },
        ],
        done
      );
    });
  },
};
