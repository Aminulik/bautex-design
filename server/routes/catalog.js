const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('./auth');

const router = express.Router();
const uploadsDir = path.join(__dirname, '../uploads/catalog');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `product-${Date.now()}-${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPG, PNG and WEBP images are allowed'));
  },
});

// Больше не нужна — цвета приходят из product_colors через JOIN
// function parseColors(value) { ... }  — удалена

function normalizeProduct(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    collection: row.collection || 'basic',
    collectionId: row.collection_id || null,
    colorHint: row.color_hint || '',
    image: row.image_url || '',
    price: Number(row.price || 0),
    rollSize: row.roll_size || '1.06 x 10 м',
    density: row.density || '',
    colors: [], // заполняется отдельно из product_colors
    active: Boolean(row.active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ========== КОЛЛЕКЦИИ ==========

router.get('/collections', (_req, res) => {
  db.all('SELECT * FROM collections ORDER BY title COLLATE NOCASE', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch collections' });
    return res.json(rows);
  });
});

router.put('/collections/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, subtitle, description } = req.body;
  if (!id || !title) return res.status(400).json({ error: 'Collection id and title are required' });

  db.run(
    `INSERT INTO collections (id, title, subtitle, description, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
                                subtitle = excluded.subtitle,
                                description = excluded.description,
                                updated_at = CURRENT_TIMESTAMP`,
    [id, title.trim(), subtitle || null, description || null],
    (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save collection' });
      return res.json({ success: true });
    }
  );
});

// ========== ТОВАРЫ ==========

router.get('/products', (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const query = `SELECT * FROM products ${
    includeInactive ? '' : 'WHERE active = 1'
  } ORDER BY created_at DESC`;

  db.all(query, [], (err, products) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch products' });
    if (products.length === 0) return res.json([]);

    const ids = products.map((p) => p.id);
    const placeholders = ids.map(() => '?').join(',');

    // Одним запросом получаем все цвета для всех товаров
    db.all(
      `SELECT product_id, color FROM product_colors WHERE product_id IN (${placeholders}) ORDER BY id`,
      ids,
      (err2, colorRows) => {
        if (err2) return res.status(500).json({ error: 'Failed to fetch product colors' });

        const colorsMap = {};
        colorRows.forEach((row) => {
          if (!colorsMap[row.product_id]) colorsMap[row.product_id] = [];
          colorsMap[row.product_id].push(row.color);
        });

        const result = products.map((product) => ({
          ...normalizeProduct(product),
          colors: colorsMap[product.id] || [],
        }));

        return res.json(result);
      }
    );
  });
});

router.post('/products', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  const body = req.body;
  const id =
    body.id || `${String(body.code || 'product').replace(/[^a-zA-Z0-9_-]/g, '-')}-${Date.now()}`;
  const imageUrl = req.file ? `/uploads/catalog/${req.file.filename}` : body.image || '';

  if (!body.code || !body.name) {
    return res.status(400).json({ error: 'Product code and name are required' });
  }

  // Парсим цвета: поддерживаем и новый colors (массив), и старый colorsJson (строка JSON)
  let colors = [];
  if (body.colors !== undefined) {
    try {
      colors = typeof body.colors === 'string' ? JSON.parse(body.colors) : body.colors;
    } catch {
      colors = [];
    }
  } else if (body.colorsJson !== undefined) {
    try {
      colors = JSON.parse(body.colorsJson);
    } catch {
      colors = [];
    }
  }

  db.serialize(() => {
    db.run(
      `INSERT INTO products (
        id, code, name, description, collection, collection_id, color_hint, image_url,
        price, roll_size, density, colors_json, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.code,
        body.name,
        body.description || '',
        body.collection || 'basic',
        body.collectionId || null,
        body.colorHint || '',
        imageUrl,
        Number(body.price || 0),
        body.rollSize || '1.06 x 10 м',
        body.density || '',
        JSON.stringify(colors),
        body.active === 'false' ? 0 : 1,
      ],
      function (err) {
        if (err) return res.status(500).json({ error: 'Failed to create product' });

        // Сохраняем цвета в product_colors
        if (colors.length > 0) {
          const stmt = db.prepare(
            'INSERT OR IGNORE INTO product_colors (product_id, color) VALUES (?, ?)'
          );
          colors.forEach((color) => {
            if (color && typeof color === 'string') {
              stmt.run([id, color.trim()]);
            }
          });
          stmt.finalize(() => res.status(201).json({ success: true, id }));
        } else {
          return res.status(201).json({ success: true, id });
        }
      }
    );
  });
});

router.patch(
  '/products/:id',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  (req, res) => {
    const body = req.body;
    const imageUrl = req.file ? `/uploads/catalog/${req.file.filename}` : body.image;

    // Парсим цвета из любого источника
    let colors = undefined; // undefined = не передавали, не обновляем
    if (body.colors !== undefined) {
      try {
        colors = typeof body.colors === 'string' ? JSON.parse(body.colors) : body.colors;
      } catch {
        colors = [];
      }
    } else if (body.colorsJson !== undefined) {
      try {
        colors = JSON.parse(body.colorsJson);
      } catch {
        colors = [];
      }
    }

    db.serialize(() => {
      db.run(
        `UPDATE products SET
        code = COALESCE(?, code),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        collection = COALESCE(?, collection),
        collection_id = COALESCE(?, collection_id),
        color_hint = COALESCE(?, color_hint),
        image_url = COALESCE(?, image_url),
        price = COALESCE(?, price),
        roll_size = COALESCE(?, roll_size),
        density = COALESCE(?, density),
        colors_json = COALESCE(?, colors_json),
        active = COALESCE(?, active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
        [
          body.code || null,
          body.name || null,
          body.description ?? null,
          body.collection || null,
          body.collectionId || null,
          body.colorHint ?? null,
          imageUrl || null,
          body.price !== undefined ? Number(body.price) : null,
          body.rollSize || null,
          body.density ?? null,
          colors !== undefined ? JSON.stringify(colors) : null,
          body.active !== undefined ? (body.active === 'false' ? 0 : 1) : null,
          req.params.id,
        ],
        function (err) {
          if (err) return res.status(500).json({ error: 'Failed to update product' });
          if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });

          // Если передали цвета — перезаписываем product_colors
          if (colors !== undefined) {
            db.run('DELETE FROM product_colors WHERE product_id = ?', [req.params.id], () => {
              if (colors.length > 0) {
                const stmt = db.prepare(
                  'INSERT OR IGNORE INTO product_colors (product_id, color) VALUES (?, ?)'
                );
                colors.forEach((color) => {
                  if (color && typeof color === 'string') {
                    stmt.run([req.params.id, color.trim()]);
                  }
                });
                stmt.finalize(() => res.json({ success: true }));
              } else {
                res.json({ success: true });
              }
            });
          } else {
            res.json({ success: true });
          }
        }
      );
    });
  }
);

router.delete('/products/:id', authenticateToken, requireAdmin, (req, res) => {
  db.run(
    'UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to archive product' });
      if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
      return res.json({ success: true });
    }
  );
});

module.exports = router;
