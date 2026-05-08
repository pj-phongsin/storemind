const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/shifts?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { date } = req.query;
  const target = date || new Date().toISOString().slice(0, 10);

  try {
    const [rows] = await db.query(
      `SELECT
         s.id, s.start_time, s.end_time, s.status,
         e.id   AS employee_id, e.name AS employee_name, e.type AS employee_type,
         t.id   AS task_id,    t.task_name, t.priority_level
       FROM shifts s
       JOIN employees e ON e.id = s.employee_id
       LEFT JOIN tasks t ON t.id = s.current_task_id
       WHERE DATE(s.start_time) = ?
       ORDER BY s.start_time, e.name`,
      [target]
    );
    res.json({ data: rows, date: target, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/shifts/:id  — update task assignment or status
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { current_task_id, status } = req.body;

  const fields = [];
  const params = [];

  if (current_task_id !== undefined) { fields.push('current_task_id = ?'); params.push(current_task_id); }
  if (status !== undefined)          { fields.push('status = ?');           params.push(status); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(id);

  try {
    await db.query(`UPDATE shifts SET ${fields.join(', ')} WHERE id = ?`, params);
    const [[updated]] = await db.query(
      `SELECT s.id, s.status, t.id AS task_id, t.task_name, t.priority_level
       FROM shifts s LEFT JOIN tasks t ON t.id = s.current_task_id WHERE s.id = ?`,
      [id]
    );
    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
