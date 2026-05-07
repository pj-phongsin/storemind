const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/employees
// Query params: ?type=FT|PT&skill=Cashier
router.get('/', async (req, res) => {
  const { type, skill } = req.query;

  let sql = `
    SELECT e.id, e.name, e.email, e.type, e.availability_mask,
           JSON_ARRAYAGG(
             JSON_OBJECT(
               'skill_id',          es.skill_id,
               'skill_name',        sk.skill_name,
               'proficiency_level', es.proficiency_level
             )
           ) AS skills
    FROM employees e
    LEFT JOIN employee_skills es ON es.employee_id = e.id
    LEFT JOIN skills sk ON sk.id = es.skill_id
    WHERE 1=1
  `;
  const params = [];

  if (type) { sql += ' AND e.type = ?'; params.push(type); }
  if (skill) {
    sql += ` AND e.id IN (
      SELECT es2.employee_id FROM employee_skills es2
      JOIN skills sk2 ON sk2.id = es2.skill_id
      WHERE sk2.skill_name = ?
    )`;
    params.push(skill);
  }

  sql += ' GROUP BY e.id ORDER BY e.name';

  try {
    const [rows] = await db.query(sql, params);
    // Parse skills JSON string if mysql2 returns it as a string
    const data = rows.map(r => ({
      ...r,
      skills: typeof r.skills === 'string' ? JSON.parse(r.skills) : r.skills,
    }));
    res.json({ data, count: data.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
