const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

router.use(authenticateToken);

function normalizeCartItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    product: {
      name: row.name,
      code: row.code,
      image_url: row.image_url,
      price: row.price,
      roll_size: row.roll_size,
    },
    color: row.color,
    quantity: row.quantity,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

router.get('/', (req, res) => {
  db.all(
    `SELECT ci.*, p.name, p.code, p.image_url, p.price, p.roll_size
   FROM cart_items ci
   LEFT JOIN products p ON p.id = ci.product_id
   WHERE ci.user_id = ?
   ORDER BY ci.updated_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch cart' });
      return res.json(rows.map(normalizeCartItem));
    }
  );
});

router.post('/', (req, res) => {
  const { productId, color, quantity } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required' });
  const safeQuantity = Math.min(100, Math.max(1, Number(quantity) || 1));
  db.run(
    `INSERT INTO cart_items (user_id, product_id, color, quantity, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, product_id, color) DO UPDATE SET
       quantity = quantity + excluded.quantity,
       updated_at = CURRENT_TIMESTAMP`,
    [req.user.id, productId, color || '', safeQuantity],
    (err) => {
      if (err) return res.status(500).json({ error: 'Failed to add cart item' });
      return res.status(201).json({ success: true });
    }
  );
});

router.patch('/:id', (req, res) => {
  const quantity = Math.min(100, Math.max(1, Number(req.body.quantity) || 1));
  db.run(
    `UPDATE cart_items
     SET quantity = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [quantity, req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update cart item' });
      if (this.changes === 0) return res.status(404).json({ error: 'Cart item not found' });
      return res.json({ success: true });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.run(
    'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to delete cart item' });
      if (this.changes === 0) return res.status(404).json({ error: 'Cart item not found' });
      return res.json({ success: true });
    }
  );
});

module.exports = router;
