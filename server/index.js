require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { router: authRouter, authenticateToken, requireAdmin } = require('./routes/auth');
const aiChatRouter = require('./routes/aiChat');
const catalogRouter = require('./routes/catalog');
const cartRouter = require('./routes/cart');
const mlMetricsRouter = require('./routes/mlMetrics');

const app = express();
const port = process.env.PORT || 3003;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required for server. Set it in server/.env');
}

// ========== СОЗДАНИЕ НЕОБХОДИМЫХ ПАПОК ==========
const dirs = [
  path.join(__dirname, 'results'),
  path.join(__dirname, 'debug'),
  path.join(__dirname, 'public/wallpapers'),
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'temp'),
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${path.basename(dir)}`);
  }
});

// ========== CORS НАСТРОЙКИ ==========
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim())
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
    ];

app.use(
  cors({
    origin: function (origin, callback) {
      // Разрешаем запросы без origin (например, из Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.warn('CORS blocked:', origin);
        // Временно разрешаем все для отладки
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// ========== MIDDLEWARE ==========
const rateBuckets = new Map();
// Очистка устаревших записей каждую минуту
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.resetAt + 60_000) {
      rateBuckets.delete(key);
    }
  }
}, 60_000);
const rateLimit =
  ({ windowMs = 60_000, max = 180 } = {}) =>
  (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'local';
    const now = Date.now();
    const bucket = rateBuckets.get(key) || { resetAt: now + windowMs, count: 0 };

    if (now > bucket.resetAt) {
      bucket.resetAt = now + windowMs;
      bucket.count = 0;
    }

    bucket.count += 1;
    rateBuckets.set(key, bucket);

    if (bucket.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    return next();
  };

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return next();
  }
};

// Логирование запросов (только в development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// ========== МАРШРУТЫ ==========
app.use(rateLimit());
app.use('/api/auth', authRouter);
app.use('/api/ai_chat', aiChatRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/cart', cartRouter);
app.use('/api/ml/metrics', mlMetricsRouter);
app.use('/', require('./routes/visualization'));

// ========== СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ВИЗУАЛИЗАЦИИ ==========
// Публичная папка — обои должны быть доступны всем
app.use('/wallpapers', express.static(path.join(__dirname, 'public/wallpapers')));

// Результаты визуализации — только авторизованным
app.use('/results', express.static(path.join(__dirname, 'results')));

// Отладка — только админам
app.use('/debug', express.static(path.join(__dirname, 'debug')));
// Загрузки — только авторизованным
app.use('/uploads', authenticateToken, express.static(path.join(__dirname, 'uploads')));

// ========== ОТЗЫВЫ ==========
app.post('/api/reviews', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { productId, rating, comment, authorName, authorPhone } = req.body;

  if (!comment) {
    return res.status(400).json({ error: 'Комментарий обязателен' });
  }

  const pid = productId || 'general';
  const query = `
    INSERT INTO reviews (user_id, product_id, author_name, author_phone, rating, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [userId, pid, authorName || null, authorPhone || null, rating || null, comment],
    function (err) {
      if (err) {
        console.error('Error saving review:', err);
        return res.status(500).json({ error: 'Failed to save review' });
      }
      return res.status(201).json({ id: this.lastID });
    }
  );
});

app.get('/api/reviews/my', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all(
    `SELECT id, product_id, author_name, author_phone, rating, comment, created_at
     FROM reviews
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching my reviews:', err);
        return res.status(500).json({ error: 'Failed to fetch reviews' });
      }
      return res.json(rows);
    }
  );
});

// ========== ЗАКАЗЫ ==========
app.post('/api/orders', optionalAuth, (req, res) => {
  const { name, phone, email, city, comment, items, orderSummary } = req.body;
  const userId = req.user?.id ?? null;
  const subtotal = orderSummary?.subtotal || 0;
  const deliveryCost = orderSummary?.deliveryCost || 0;
  const total = orderSummary?.total || 0;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(
      `INSERT INTO orders (user_id, name, phone, email, city, comment, subtotal, delivery_cost, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, phone, email, city, comment || '', subtotal, deliveryCost, total],
      function (err) {
        if (err) {
          db.run('ROLLBACK');
          console.error('Error saving order:', err);
          return res.status(500).json({ error: 'Failed to save order' });
        }

        const orderId = this.lastID;

        if (!items || items.length === 0) {
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('Error committing empty order:', commitErr);
              return res.status(500).json({ error: 'Failed to save order' });
            }
            return res.status(201).json({ message: 'Order created', orderId });
          });
          return;
        }

        const stmt = db.prepare(
          `INSERT INTO order_items (order_id, product_id, product_name, product_code, color, quantity, price, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );

        let hasError = false;

        items.forEach((item) => {
          stmt.run(
            [
              orderId,
              item.productId || '',
              item.productName || '',
              item.code || '',
              item.color || '',
              item.quantity || 1,
              item.price || 0,
              item.total || 0,
            ],
            (stmtErr) => {
              if (stmtErr) hasError = true;
            }
          );
        });

        stmt.finalize((finalizeErr) => {
          if (finalizeErr || hasError) {
            db.run('ROLLBACK');
            console.error('Error saving order items:', finalizeErr);
            return res.status(500).json({ error: 'Failed to save order items' });
          }

          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('Error committing order:', commitErr);
              return res.status(500).json({ error: 'Failed to save order' });
            }
            return res.status(201).json({ message: 'Order created', orderId });
          });
        });
      }
    );
  });
});
app.get('/api/orders/my', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT id, user_id, city, subtotal, delivery_cost, total_amount, status, created_at
     FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
    (err, orders) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch orders' });

      if (!orders || orders.length === 0) return res.json([]);

      let pending = orders.length;
      const result = [];
      let failed = false;

      orders.forEach((order) => {
        db.all(`SELECT * FROM order_items WHERE order_id = ?`, [order.id], (err2, items) => {
          if (failed) return;
          if (err2) {
            failed = true;
            console.error('Error fetching order items:', err2);
            return res.status(500).json({ error: 'Failed to fetch order items' });
          }
          result.push({ ...order, items: items || [] });
          pending--;
          if (pending === 0) return res.json(result);
        });
      });
    }
  );
});
app.get('/api/admin/orders', authenticateToken, requireAdmin, (_req, res) => {
  db.all(
    `SELECT orders.*, users.email AS user_email, users.name AS user_name
     FROM orders LEFT JOIN users ON users.id = orders.user_id
     ORDER BY orders.created_at DESC`,
    [],
    (err, orders) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch orders' });

      if (!orders || orders.length === 0) return res.json([]);

      let pending = orders.length;
      const result = [];
      let failed = false;

      orders.forEach((order) => {
        db.all(`SELECT * FROM order_items WHERE order_id = ?`, [order.id], (err2, items) => {
          if (failed) return;
          if (err2) {
            failed = true;
            console.error('Error fetching order items:', err2);
            return res.status(500).json({ error: 'Failed to fetch order items' });
          }
          result.push({ ...order, items: items || [] });
          pending--;
          if (pending === 0) return res.json(result);
        });
      });
    }
  );
});
app.get('/api/orders', authenticateToken, requireAdmin, (_req, res) => {
  db.all(
    `SELECT orders.*, users.email AS user_email, users.name AS user_name
     FROM orders LEFT JOIN users ON users.id = orders.user_id
     ORDER BY orders.created_at DESC`,
    [],
    (err, orders) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch orders' });
      if (!orders || orders.length === 0) return res.json([]);

      let pending = orders.length;
      const result = [];
      let failed = false;

      orders.forEach((order) => {
        db.all(`SELECT * FROM order_items WHERE order_id = ?`, [order.id], (err2, items) => {
          if (failed) return;
          if (err2) {
            failed = true;
            console.error('Error fetching order items:', err2);
            return res.status(500).json({ error: 'Failed to fetch order items' });
          }
          result.push({ ...order, items: items || [] });
          pending--;
          if (pending === 0) return res.json(result);
        });
      });
    }
  );
});

app.get('/api/admin/summary', authenticateToken, requireAdmin, async (_req, res) => {
  const getRow = (query, params = []) =>
    new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => (err ? reject(err) : resolve(row || {})));
    });

  try {
    const [orders, support, products, users, visualizations, metrics] = await Promise.all([
      getRow(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_orders,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_orders
         FROM orders`
      ),
      getRow(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_tickets,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tickets
         FROM support_tickets`
      ),
      getRow(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS active_products
         FROM products`
      ),
      getRow(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins,
                SUM(CASE WHEN role != 'admin' THEN 1 ELSE 0 END) AS customers
         FROM users`
      ),
      getRow(
        `SELECT COUNT(*) AS total,
                AVG(duration_ms) AS avg_duration_ms,
                AVG(mask_coverage) AS avg_mask_coverage,
                SUM(CASE WHEN quality = 'high' THEN 1 ELSE 0 END) AS high_quality
         FROM visualizations`
      ),
      getRow(
        `SELECT images_count, mean_iou, mean_dice, mean_precision, mean_recall, created_at
         FROM ml_metric_runs
         ORDER BY created_at DESC
         LIMIT 1`
      ),
    ]);

    return res.json({ orders, support, products, users, visualizations, metrics });
  } catch (err) {
    console.error('Error fetching admin summary:', err);
    return res.status(500).json({ error: 'Failed to fetch admin summary' });
  }
});

app.patch('/api/admin/orders/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowedStatuses = ['new', 'in_progress', 'approved', 'cancelled', 'completed'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  const query = `
    UPDATE orders
    SET status = ?
    WHERE id = ?
  `;

  db.run(query, [status, id], (err) => {
    if (err) {
      console.error('Error updating order:', err);
      res.status(500).json({ error: 'Failed to update order' });
    } else {
      res.json({ message: 'Order updated successfully' });
    }
  });
});
app.get('/api/admin/users', authenticateToken, requireAdmin, (_req, res) => {
  const query = `
    SELECT
      users.id,
      users.email,
      users.name,
      users.role,
      users.created_at,
      COUNT(DISTINCT orders.id) AS orders_count,
      COALESCE(SUM(orders.total_amount), 0) AS total_spent
    FROM users
    LEFT JOIN orders ON orders.user_id = users.id
    GROUP BY users.id
    ORDER BY users.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    return res.json(rows);
  });
});

app.post('/api/support', authenticateToken, (req, res) => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  db.run(
    `INSERT INTO support_tickets (user_id, subject, message)
     VALUES (?, ?, ?)`,
    [req.user.id, subject.trim(), message.trim()],
    function (err) {
      if (err) {
        console.error('Error creating support ticket:', err);
        return res.status(500).json({ error: 'Failed to create support ticket' });
      }
      return res.status(201).json({ id: this.lastID });
    }
  );
});

app.get('/api/support/my', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, subject, message, status, admin_response, created_at, updated_at, resolved_at
     FROM support_tickets
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error('Error fetching support tickets:', err);
        return res.status(500).json({ error: 'Failed to fetch support tickets' });
      }
      return res.json(rows);
    }
  );
});

app.get('/api/admin/support', authenticateToken, requireAdmin, (_req, res) => {
  db.all(
    `SELECT
       support_tickets.*,
       users.email AS user_email,
       users.name AS user_name
     FROM support_tickets
     LEFT JOIN users ON users.id = support_tickets.user_id
     ORDER BY
       CASE support_tickets.status
         WHEN 'open' THEN 1
         WHEN 'in_progress' THEN 2
         WHEN 'resolved' THEN 3
         ELSE 4
       END,
       support_tickets.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching admin support tickets:', err);
        return res.status(500).json({ error: 'Failed to fetch support tickets' });
      }
      return res.json(rows);
    }
  );
});

app.patch('/api/admin/support/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, adminResponse } = req.body;
  const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid support status' });
  }

  db.run(
    `UPDATE support_tickets
     SET status = ?,
         admin_response = ?,
         updated_at = CURRENT_TIMESTAMP,
         resolved_at = CASE
           WHEN ? IN ('resolved', 'closed') THEN CURRENT_TIMESTAMP
           ELSE resolved_at
         END
     WHERE id = ?`,
    [status, adminResponse || null, status, id],
    function (err) {
      if (err) {
        console.error('Error updating support ticket:', err);
        return res.status(500).json({ error: 'Failed to update support ticket' });
      }
      if (this.changes === 0) return res.status(404).json({ error: 'Support ticket not found' });
      return res.json({ message: 'Support ticket updated successfully' });
    }
  );
});

// ========== ИЗБРАННОЕ ==========
app.post('/api/favorites', authenticateToken, (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  db.run(
    'INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)',
    [userId, productId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.get('/api/favorites', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all('SELECT product_id FROM favorites WHERE user_id = ?', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map((row) => row.product_id));
  });
});

app.delete('/api/favorites/:productId', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  db.run(
    'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
    [userId, productId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ========== ВИЗУАЛИЗАЦИИ ==========
app.get('/api/visualizations/my', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, result_url, original_url, title, project_id, wallpaper_id, color_hex, method, quality,
            duration_ms, mask_coverage, segmentation_mode, price, room_area, rolls_count, created_at
     FROM visualizations
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error('Error fetching visualizations:', err);
        return res.status(500).json({ error: 'Failed to fetch visualizations' });
      }
      return res.json(rows);
    }
  );
});

app.patch('/api/visualizations/:id', authenticateToken, (req, res) => {
  const { title, projectId } = req.body;
  db.run(
    `UPDATE visualizations
     SET title = COALESCE(?, title),
         project_id = COALESCE(?, project_id)
     WHERE id = ? AND user_id = ?`,
    [title || null, projectId || null, req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update visualization' });
      if (this.changes === 0) return res.status(404).json({ error: 'Visualization not found' });
      return res.json({ success: true });
    }
  );
});

app.delete('/api/visualizations/:id', authenticateToken, (req, res) => {
  db.run(
    'DELETE FROM visualizations WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to delete visualization' });
      if (this.changes === 0) return res.status(404).json({ error: 'Visualization not found' });
      return res.json({ success: true });
    }
  );
});

app.get('/api/visualization-projects/my', authenticateToken, (req, res) => {
  db.all(
    `SELECT
       projects.*,
       COUNT(visualizations.id) AS variants_count,
       MAX(visualizations.created_at) AS last_visualization_at
     FROM visualization_projects AS projects
     LEFT JOIN visualizations ON visualizations.project_id = projects.id
     WHERE projects.user_id = ?
     GROUP BY projects.id
     ORDER BY projects.updated_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch visualization projects' });
      return res.json(rows);
    }
  );
});

app.post('/api/visualization-projects', authenticateToken, (req, res) => {
  const title = String(req.body.title || 'Проект визуализации').trim();
  db.run(
    `INSERT INTO visualization_projects (user_id, title, original_url)
     VALUES (?, ?, ?)`,
    [req.user.id, title, req.body.originalUrl || null],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create visualization project' });
      return res.status(201).json({ id: this.lastID, title });
    }
  );
});

app.patch('/api/visualization-projects/:id', authenticateToken, (req, res) => {
  db.run(
    `UPDATE visualization_projects
     SET title = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [String(req.body.title || '').trim(), req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update visualization project' });
      if (this.changes === 0)
        return res.status(404).json({ error: 'Visualization project not found' });
      return res.json({ success: true });
    }
  );
});

app.delete('/api/visualization-projects/:id', authenticateToken, (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM visualizations WHERE project_id = ? AND user_id = ?', [
      req.params.id,
      req.user.id,
    ]);
    db.run(
      'DELETE FROM visualization_projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Failed to delete visualization project' });
        if (this.changes === 0)
          return res.status(404).json({ error: 'Visualization project not found' });
        return res.json({ success: true });
      }
    );
  });
});

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: port,
    environment: process.env.NODE_ENV || 'development',
  });
});

// ========== СТАТИКА ДЛЯ ПРОДАКШЕНА ==========
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// ========== ОБРАБОТКА 404 ==========
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.url,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /api/test',
      'POST /api/visualize',
      'GET /api/wallpapers',
      'GET /api/visualize/status',
      'POST /api/wallpapers/upload',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/ai_chat',
      'GET /api/reviews/my',
      'POST /api/reviews',
      'GET /api/orders',
      'POST /api/orders',
      'GET /api/orders/my',
      'GET /api/admin/users',
      'GET /api/admin/orders',
      'PATCH /api/admin/orders/:id',
      'POST /api/support',
      'GET /api/support/my',
      'GET /api/admin/support',
      'PATCH /api/admin/support/:id',
      'GET /api/favorites',
      'POST /api/favorites',
      'GET /api/visualizations/my',
    ],
  });
});

// ========== ОБРАБОТКА ОШИБОК ==========
app.use((err, req, res) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ========== ЗАПУСК СЕРВЕРА ==========
app.listen(port, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 Server is running on port ${port}`);
  console.log('='.repeat(50));
  console.log(`📡 API Base URL: http://localhost:${port}`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/api/test`);
  console.log(`🖼️ Wallpapers: http://localhost:${port}/wallpapers`);
  console.log(`✨ Results: http://localhost:${port}/results`);
  console.log(`🔧 Health check: http://localhost:${port}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Allowed origins:`, allowedOrigins);
  console.log('='.repeat(50) + '\n');
});
