const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/sales
// Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD&category=AIRism&limit=100
router.get('/', async (req, res) => {
  const { from, to, category, limit = 100 } = req.query;

  let sql = `
    SELECT s.id, s.sale_date, s.quantity_sold, s.total_amount,
           p.name AS product_name, p.category, p.sku
    FROM sales s
    JOIN products p ON p.id = s.product_id
    WHERE 1=1
  `;
  const params = [];

  if (from) { sql += ' AND s.sale_date >= ?'; params.push(from); }
  if (to)   { sql += ' AND s.sale_date <= ?'; params.push(to); }
  if (category) { sql += ' AND p.category = ?'; params.push(category); }

  sql += ' ORDER BY s.sale_date DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  try {
    const [rows] = await db.query(sql, params);
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
