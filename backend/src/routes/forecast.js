const express = require('express');
const router = express.Router();

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// GET /api/forecast?category=all&days=7
router.get('/', async (req, res) => {
  const { category = 'all', days = 7 } = req.query;
  try {
    const r = await fetch(`${ML_URL}/forecast?category=${category}&days=${days}`);
    if (!r.ok) throw new Error(`ML service error: ${r.status}`);
    res.json(await r.json());
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'ML service unavailable', detail: err.message });
  }
});

// POST /api/task-allocation
router.post('/task-allocation', async (req, res) => {
  const { predicted_revenue, available_staff, event_type = 'Normal' } = req.body;
  if (predicted_revenue == null || available_staff == null) {
    return res.status(400).json({ error: 'predicted_revenue and available_staff are required' });
  }
  try {
    const r = await fetch(`${ML_URL}/task-allocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predicted_revenue, available_staff, event_type }),
    });
    if (!r.ok) throw new Error(`ML service error: ${r.status}`);
    res.json(await r.json());
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'ML service unavailable', detail: err.message });
  }
});

module.exports = router;
