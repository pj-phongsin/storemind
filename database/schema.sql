CREATE DATABASE IF NOT EXISTS storemind;
USE storemind;

-- ─────────────────────────────────────────
-- Inventory & Sales
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  sku         VARCHAR(100) NOT NULL UNIQUE,
  category    ENUM('AIRism','Heattech','Outerwear','Tops') NOT NULL,
  unit_price  DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  product_id        INT NOT NULL,
  quantity_on_hand  INT NOT NULL DEFAULT 0,
  reorder_point     INT NOT NULL DEFAULT 20,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  product_id     INT NOT NULL,
  quantity_sold  INT NOT NULL,
  total_amount   DECIMAL(10,2) NOT NULL,
  sale_date      DATE NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- Workforce & Skills
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employees (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL UNIQUE,
  type              ENUM('FT','PT') NOT NULL DEFAULT 'PT',
  availability_mask VARCHAR(7) NOT NULL DEFAULT '1111100'  -- Mon–Sun bitmask
);

CREATE TABLE IF NOT EXISTS skills (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  skill_name VARCHAR(100) NOT NULL UNIQUE  -- e.g. Cashier, Fitting Room, Folding
);

CREATE TABLE IF NOT EXISTS employee_skills (
  employee_id       INT NOT NULL,
  skill_id          INT NOT NULL,
  proficiency_level TINYINT NOT NULL DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),
  PRIMARY KEY (employee_id, skill_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)    REFERENCES skills(id)    ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- Tasks & Shifts
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  task_name        VARCHAR(255) NOT NULL,
  priority_level   TINYINT NOT NULL CHECK (priority_level BETWEEN 1 AND 3),  -- 1=P1 Critical, 2=P2 Supporting, 3=P3 Flexible
  required_skill_id INT,
  FOREIGN KEY (required_skill_id) REFERENCES skills(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_requirements (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  date            DATE NOT NULL,
  event_type      ENUM('Normal','Delivery','Sale','HighTraffic') NOT NULL DEFAULT 'Normal',
  targeted_task_id INT,
  notes           VARCHAR(500),
  FOREIGN KEY (targeted_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shifts (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  employee_id      INT NOT NULL,
  start_time       DATETIME NOT NULL,
  end_time         DATETIME NOT NULL,
  current_task_id  INT,
  status           ENUM('Active','Sick','Swap_Requested','Completed') NOT NULL DEFAULT 'Active',
  FOREIGN KEY (employee_id)     REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (current_task_id) REFERENCES tasks(id)    ON DELETE SET NULL
);
