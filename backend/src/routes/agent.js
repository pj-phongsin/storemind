const express = require('express');
const router = express.Router();
const db = require('../db');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agent/sick-leave
// Body: { employee_id, date }
//
// Algorithm:
//   1. Find the employee's shift on that date
//   2. Mark it Sick
//   3. If the task is P1 (Critical) → find a P3 employee on the same day
//      who has the required skill → reassign them to cover the gap
//   4. Return full reassignment report
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sick-leave', async (req, res) => {
  const { employee_id, date } = req.body;
  if (!employee_id || !date) {
    return res.status(400).json({ error: 'employee_id and date are required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Find the sick employee's shift
    const [[sickShift]] = await conn.query(
      `SELECT s.id, s.start_time, s.end_time, s.current_task_id,
              t.task_name, t.priority_level, t.required_skill_id,
              e.name AS employee_name
       FROM shifts s
       JOIN employees e ON e.id = s.employee_id
       LEFT JOIN tasks t ON t.id = s.current_task_id
       WHERE s.employee_id = ? AND DATE(s.start_time) = ? AND s.status = 'Active'
       LIMIT 1`,
      [employee_id, date]
    );

    if (!sickShift) {
      await conn.rollback();
      return res.status(404).json({ error: 'No active shift found for this employee on that date' });
    }

    // 2. Mark the shift as Sick
    await conn.query(`UPDATE shifts SET status = 'Sick' WHERE id = ?`, [sickShift.id]);

    const report = {
      sick_employee:  sickShift.employee_name,
      date,
      affected_task:  sickShift.task_name,
      priority_level: sickShift.priority_level,
      reassignment:   null,
      action:         '',
    };

    // 3. Only attempt internal reallocation for P1 (Critical) tasks
    if (sickShift.priority_level === 1 && sickShift.required_skill_id) {
      // Find P3 staff working the same day who have the required skill
      const [candidates] = await conn.query(
        `SELECT s.id AS shift_id, s.start_time, s.end_time,
                e.id AS employee_id, e.name AS employee_name,
                t.task_name AS current_task,
                es.proficiency_level
         FROM shifts s
         JOIN employees e ON e.id = s.employee_id
         JOIN tasks t ON t.id = s.current_task_id
         JOIN employee_skills es
              ON es.employee_id = e.id AND es.skill_id = ?
         WHERE DATE(s.start_time) = ?
           AND s.status = 'Active'
           AND t.priority_level = 3
           AND s.employee_id != ?
         ORDER BY es.proficiency_level DESC
         LIMIT 1`,
        [sickShift.required_skill_id, date, employee_id]
      );

      if (candidates.length > 0) {
        const best = candidates[0];
        // Reassign the P3 employee to cover the P1 task
        await conn.query(
          `UPDATE shifts SET current_task_id = ? WHERE id = ?`,
          [sickShift.current_task_id, best.shift_id]
        );
        report.reassignment = {
          employee_name:    best.employee_name,
          from_task:        best.current_task,
          to_task:          sickShift.task_name,
          proficiency_level: best.proficiency_level,
        };
        report.action = `Reallocated ${best.employee_name} from "${best.current_task}" (P3) to cover "${sickShift.task_name}" (P1).`;
      } else {
        report.action = 'No suitable P3 staff found with required skill. Consider calling in emergency cover.';
      }
    } else if (sickShift.priority_level === 2) {
      report.action = 'P2 task — remaining staff can absorb the workload. Monitor stock room coverage.';
    } else {
      report.action = 'P3 task — flexible duty. No immediate reassignment needed.';
    }

    await conn.commit();
    res.json({ data: report });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agent/shift-swap
// Body: { shift_id }
//
// Algorithm:
//   1. Find the shift and its required skill
//   2. Mark it Swap_Requested
//   3. Find eligible peers: have the skill + available that day + not already scheduled
//   4. Return candidate list
// ─────────────────────────────────────────────────────────────────────────────
router.post('/shift-swap', async (req, res) => {
  const { shift_id } = req.body;
  if (!shift_id) return res.status(400).json({ error: 'shift_id is required' });

  try {
    // 1. Get the shift details
    const [[shift]] = await db.query(
      `SELECT s.id, s.start_time, s.end_time, s.employee_id,
              e.name AS employee_name,
              t.task_name, t.required_skill_id,
              sk.skill_name AS required_skill
       FROM shifts s
       JOIN employees e ON e.id = s.employee_id
       LEFT JOIN tasks t ON t.id = s.current_task_id
       LEFT JOIN skills sk ON sk.id = t.required_skill_id
       WHERE s.id = ?`,
      [shift_id]
    );

    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    // 2. Mark as Swap_Requested
    await db.query(`UPDATE shifts SET status = 'Swap_Requested' WHERE id = ?`, [shift_id]);

    const shiftDate    = new Date(shift.start_time).toISOString().slice(0, 10);
    const dayOfWeek    = new Date(shift.start_time).getDay(); // 0=Sun … 6=Sat
    // availability_mask is Mon-Sun (index 0-6), JS getDay() is Sun=0 so remap
    const maskIndex    = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // 3. Find eligible peers
    let candidateQuery = `
      SELECT e.id, e.name, e.type, e.availability_mask,
             MAX(es.proficiency_level) AS proficiency_level
      FROM employees e
      JOIN employee_skills es ON es.employee_id = e.id
      WHERE e.id != ?
        AND SUBSTRING(e.availability_mask, ?, 1) = '1'
        AND e.id NOT IN (
          SELECT employee_id FROM shifts
          WHERE DATE(start_time) = ? AND status != 'Sick'
        )
    `;
    const params = [shift.employee_id, maskIndex + 1, shiftDate];

    if (shift.required_skill_id) {
      candidateQuery += ` AND es.skill_id = ?`;
      params.push(shift.required_skill_id);
    }

    candidateQuery += ` GROUP BY e.id, e.name, e.type, e.availability_mask ORDER BY proficiency_level DESC`;

    const [candidates] = await db.query(candidateQuery, params);

    res.json({
      data: {
        shift_id:       shift.id,
        employee_name:  shift.employee_name,
        date:           shiftDate,
        task:           shift.task_name,
        required_skill: shift.required_skill,
        status:         'Swap_Requested',
        eligible_peers: candidates.map(c => ({
          employee_id:       c.id,
          name:              c.name,
          type:              c.type,
          proficiency_level: c.proficiency_level,
        })),
        peer_count: candidates.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
