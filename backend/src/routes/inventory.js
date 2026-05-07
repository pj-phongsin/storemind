const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/inventory
// Query params: ?category=AIRism&low_stock=true
router.get('/', async (req, res) => {
  const { category, low_stock } = req.query;

  let sql = `
    SELECT i.id, i.quantity_on_hand, i.reorder_point,
           p.id AS product_id, p.name, p.sku, p.category, p.unit_price,
           (i.quantity_on_hand <= i.reorder_point) AS needs_reorder
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    WHERE 1=1
  `;
  const params = [];

  if (category) { sql += ' AND p.category = ?'; params.push(category); }
  if (low_stock === 'true') { sql += ' AND i.quantity_on_hand <= i.reorder_point'; }

  sql += ' ORDER BY p.category, p.name';

  try {
    const [rows] = await db.query(sql, params);
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
