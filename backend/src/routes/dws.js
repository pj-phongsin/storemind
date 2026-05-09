const express = require('express');
const router = express.Router();
const db = require('../db');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/dws/generate?date=YYYY-MM-DD
//
// 1. Fetches employees scheduled for that date (from shifts table)
// 2. Sends them to the ML service DWS generator
// 3. Saves dws_assignments + breaks back to DB
// 4. Returns the full DWS
// ─────────────────────────────────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  try {
    // Get scheduled employees for the date with their skills
    const [rows] = await db.query(
      `SELECT e.id, e.name, e.type,
              GROUP_CONCAT(sk.skill_name ORDER BY sk.skill_name SEPARATOR ',') AS skills
       FROM shifts s
       JOIN employees e ON e.id = s.employee_id
       LEFT JOIN employee_skills es ON es.employee_id = e.id
       LEFT JOIN skills sk ON sk.id = es.skill_id
       WHERE s.shift_date = ? AND s.status = 'Active'
       GROUP BY e.id, e.name, e.type`,
      [date]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No active shifts found for this date. Run seed_shifts.py first.' });
    }

    const employees = rows.map(r => ({
      id:     r.id,
      name:   r.name,
      type:   r.type,
      skills: r.skills ? r.skills.split(',') : [],
    }));

    // Call ML service to generate DWS
    const mlRes = await fetch(`${ML_URL}/dws/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ date, employees }),
    });
    if (!mlRes.ok) {
      const err = await mlRes.json();
      return res.status(502).json({ error: 'ML service error', detail: err.detail });
    }
    const dws = await mlRes.json();

    // Persist to DB — clear old assignments for this date, then insert fresh
    const shiftIds = (await db.query(
      `SELECT id FROM shifts WHERE shift_date = ? AND status = 'Active'`, [date]
    ))[0].map(r => r.id);

    if (shiftIds.length > 0) {
      await db.query(`DELETE FROM dws_assignments WHERE shift_id IN (?)`, [shiftIds]);
      await db.query(`DELETE FROM breaks WHERE shift_id IN (?)`, [shiftIds]);
    }

    // Fetch task_id map
    const [taskRows] = await db.query(`SELECT id, task_code FROM tasks`);
    const taskIdMap = Object.fromEntries(taskRows.map(t => [t.task_code, t.id]));

    // Fetch shift_id per employee
    const [shiftRows] = await db.query(
      `SELECT id, employee_id FROM shifts WHERE shift_date = ? AND status = 'Active'`, [date]
    );
    const empShiftMap = Object.fromEntries(shiftRows.map(s => [s.employee_id, s.id]));

    // Insert assignments and breaks
    const assignInserts = [];
    const breakInserts  = [];

    for (const sched of dws.schedules) {
      const shiftId = empShiftMap[sched.employee_id];
      if (!shiftId) continue;

      for (const slot of sched.schedule) {
        if (slot.type === 'work') {
          assignInserts.push([shiftId, taskIdMap[slot.task_code] || null, slot.task_code, slot.task_name, slot.start, slot.end]);
        } else {
          breakInserts.push([shiftId, slot.start, slot.end, slot.break_type]);
        }
      }
    }

    if (assignInserts.length > 0) {
      await db.query(
        `INSERT INTO dws_assignments (shift_id, task_id, task_code, task_name, slot_start, slot_end) VALUES ?`,
        [assignInserts]
      );
    }
    if (breakInserts.length > 0) {
      await db.query(
        `INSERT INTO breaks (shift_id, break_start, break_end, break_type) VALUES ?`,
        [breakInserts]
      );
    }

    res.json(dws);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dws?date=YYYY-MM-DD
// Returns saved DWS from DB (if already generated)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  try {
    const [assignments] = await db.query(
      `SELECT da.id, da.task_code, da.task_name, da.slot_start, da.slot_end,
              s.employee_id, e.name AS employee_name, e.type AS employee_type,
              s.id AS shift_id, s.start_time, s.end_time
       FROM dws_assignments da
       JOIN shifts s ON s.id = da.shift_id
       JOIN employees e ON e.id = s.employee_id
       WHERE s.shift_date = ?
       ORDER BY e.name, da.slot_start`,
      [date]
    );

    const [breaks] = await db.query(
      `SELECT b.shift_id, b.break_start, b.break_end, b.break_type
       FROM breaks b
       JOIN shifts s ON s.id = b.shift_id
       WHERE s.shift_date = ?`,
      [date]
    );

    // Group by employee
    const empMap = {};
    for (const row of assignments) {
      if (!empMap[row.employee_id]) {
        empMap[row.employee_id] = {
          employee_id:   row.employee_id,
          employee_name: row.employee_name,
          employee_type: row.employee_type,
          shift_id:      row.shift_id,
          schedule:      [],
        };
      }
      empMap[row.employee_id].schedule.push({
        type:      'work',
        task_code: row.task_code,
        task_name: row.task_name,
        start:     row.slot_start.slice(0, 5),
        end:       row.slot_end.slice(0, 5),
      });
    }

    for (const b of breaks) {
      for (const emp of Object.values(empMap)) {
        if (emp.shift_id === b.shift_id) {
          emp.schedule.push({
            type:       'break',
            break_type: b.break_type,
            start:      b.break_start.slice(0, 5),
            end:        b.break_end.slice(0, 5),
          });
        }
      }
    }

    // Sort each employee's schedule by start time
    for (const emp of Object.values(empMap)) {
      emp.schedule.sort((a, b) => a.start.localeCompare(b.start));
    }

    const schedules = Object.values(empMap);
    res.json({ date, schedules, generated: schedules.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
