const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tasks
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.task_name, t.priority_level, s.skill_name AS required_skill
       FROM tasks t LEFT JOIN skills s ON s.id = t.required_skill_id
       ORDER BY t.priority_level, t.task_name`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
