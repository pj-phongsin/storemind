"""
seed_shifts.py — Generate shift data for today ±14 days.

Run after seed.py:
    python database/seed_shifts.py
"""

import os
import random
from datetime import date, timedelta, datetime
from dotenv import load_dotenv
import mysql.connector

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

DB = mysql.connector.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', 3306)),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', ''),
    database=os.getenv('DB_NAME', 'storemind'),
)
cur = DB.cursor(dictionary=True)
random.seed(99)

# Fetch employees and tasks
cur.execute('SELECT id, availability_mask FROM employees')
employees = cur.fetchall()

cur.execute('SELECT id, task_name, priority_level FROM tasks')
tasks = cur.fetchall()
task_ids = [t['id'] for t in tasks]

# Delete existing shifts to avoid duplicates
cur.execute('DELETE FROM shifts')

# Shift time templates: (start_hour, end_hour)
SHIFT_TEMPLATES = [(8, 16), (10, 18), (12, 20), (9, 17)]

today = date.today()
start_date = today - timedelta(days=7)
end_date   = today + timedelta(days=7)

shifts = []
d = start_date
while d <= end_date:
    day_index = d.weekday()  # 0=Mon, 6=Sun — matches availability_mask order
    for emp in employees:
        mask = emp['availability_mask']
        if len(mask) > day_index and mask[day_index] == '1':
            start_h, end_h = random.choice(SHIFT_TEMPLATES)
            start_dt = datetime(d.year, d.month, d.day, start_h, 0)
            end_dt   = datetime(d.year, d.month, d.day, end_h, 0)
            task_id  = random.choice(task_ids)
            # Past shifts are Completed, today is Active, future is Active
            if d < today:
                status = 'Completed'
            else:
                status = 'Active'
            shifts.append((emp['id'], start_dt, end_dt, task_id, status))
    d += timedelta(days=1)

cur.executemany(
    'INSERT INTO shifts (employee_id, start_time, end_time, current_task_id, status) VALUES (%s,%s,%s,%s,%s)',
    shifts,
)

DB.commit()
cur.close()
DB.close()
print(f'Done! {len(shifts)} shifts inserted across {(end_date - start_date).days + 1} days.')
