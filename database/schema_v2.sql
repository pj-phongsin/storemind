-- schema_v2.sql — Migration from v1 to v2 (MySQL 5.7+ compatible)
-- Run ONCE on an existing storemind database.

USE storemind;

SET FOREIGN_KEY_CHECKS = 0;

-- ─── 1. Add task_code to tasks ───────────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN task_code    VARCHAR(10)    DEFAULT NULL FIRST,
  ADD COLUMN min_staff    TINYINT        NOT NULL DEFAULT 1;

-- ─── 2. Add min_staff_required to daily_requirements ─────────────────────────
ALTER TABLE daily_requirements
  ADD COLUMN min_staff_required TINYINT NOT NULL DEFAULT 1;

-- ─── 3. Add shift_date + total_hours to shifts ───────────────────────────────
ALTER TABLE shifts
  ADD COLUMN shift_date  DATE           DEFAULT NULL AFTER employee_id,
  ADD COLUMN total_hours DECIMAL(4,2)   DEFAULT NULL;

UPDATE shifts SET shift_date = DATE(start_time) WHERE shift_date IS NULL;

-- ─── 4. New table: dws_assignments ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dws_assignments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  shift_id   INT          NOT NULL,
  task_id    INT          DEFAULT NULL,
  task_code  VARCHAR(10)  NOT NULL,
  task_name  VARCHAR(255) NOT NULL,
  slot_start TIME         NOT NULL,
  slot_end   TIME         NOT NULL,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id)  REFERENCES tasks(id)  ON DELETE SET NULL
);

-- ─── 5. New table: breaks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS breaks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  shift_id    INT  NOT NULL,
  break_start TIME NOT NULL,
  break_end   TIME NOT NULL,
  break_type  ENUM('30min','60min') NOT NULL,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
);

-- ─── 6. New skills ───────────────────────────────────────────────────────────
INSERT IGNORE INTO skills (skill_name) VALUES
  ('Runner'),
  ('Replenishment'),
  ('Alteration'),
  ('Self Check-Out');

-- ─── 7. Replace tasks with spec-v2 task codes ────────────────────────────────
DELETE FROM tasks;

INSERT INTO tasks (task_code, task_name, priority_level, min_staff, required_skill_id) VALUES
  ('SF_A', 'Sale Floor - Zone A', 1, 1, (SELECT id FROM skills WHERE skill_name = 'Sales Floor')),
  ('SF_B', 'Sale Floor - Zone B', 1, 1, (SELECT id FROM skills WHERE skill_name = 'Sales Floor')),
  ('SF_C', 'Sale Floor - Zone C', 1, 1, (SELECT id FROM skills WHERE skill_name = 'Sales Floor')),
  ('SF_D', 'Sale Floor - Zone D', 1, 1, (SELECT id FROM skills WHERE skill_name = 'Sales Floor')),
  ('CSH',  'Cashier',             1, 1, (SELECT id FROM skills WHERE skill_name = 'Cashier')),
  ('FR1',  'Fitting Room 1',      1, 1, (SELECT id FROM skills WHERE skill_name = 'Fitting Room')),
  ('ALT',  'Alteration',          1, 1, (SELECT id FROM skills WHERE skill_name = 'Alteration')),
  ('RN',   'Runner',              2, 1, (SELECT id FROM skills WHERE skill_name = 'Runner')),
  ('SCO',  'Self Check-Out',      2, 0, (SELECT id FROM skills WHERE skill_name = 'Self Check-Out')),
  ('FR2',  'Fitting Room 2',      2, 0, (SELECT id FROM skills WHERE skill_name = 'Fitting Room')),
  ('RP',   'Replenishment',       2, 1, (SELECT id FROM skills WHERE skill_name = 'Replenishment')),
  ('FR3',  'Fitting Room 3',      3, 0, (SELECT id FROM skills WHERE skill_name = 'Fitting Room'));

SET FOREIGN_KEY_CHECKS = 1;
