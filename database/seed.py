"""
seed.py — Generate synthetic StoreMind data and load it into MySQL.

Requirements:
    pip install faker mysql-connector-python python-dotenv

Usage:
    python database/seed.py
"""

import os
import random
from datetime import date, timedelta
from dotenv import load_dotenv
from faker import Faker
import mysql.connector

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

DB = mysql.connector.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', 3306)),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', ''),
    database=os.getenv('DB_NAME', 'storemind'),
)
cur = DB.cursor()
fake = Faker('en_AU')
random.seed(42)

# ─────────────────────────────────────────
# Products (one per category variant)
# ─────────────────────────────────────────
PRODUCTS = [
    ('AIRism Cotton T-Shirt',    'AIR-001', 'AIRism',   29.90),
    ('AIRism Boxer Briefs',      'AIR-002', 'AIRism',   19.90),
    ('AIRism V-Neck T-Shirt',    'AIR-003', 'AIRism',   34.90),
    ('Heattech Extra Warm Tee',  'HTC-001', 'Heattech', 39.90),
    ('Heattech Leggings',        'HTC-002', 'Heattech', 44.90),
    ('Heattech Turtleneck',      'HTC-003', 'Heattech', 49.90),
    ('Fleece Jacket',            'OUT-001', 'Outerwear', 79.90),
    ('Puffer Vest',              'OUT-002', 'Outerwear', 89.90),
    ('Ultra Light Down Jacket',  'OUT-003', 'Outerwear',199.90),
    ('Linen Blend Shirt',        'TOP-001', 'Tops',      49.90),
    ('Crew-Neck Sweatshirt',     'TOP-002', 'Tops',      59.90),
    ('Striped Border Tee',       'TOP-003', 'Tops',      29.90),
]

print('Inserting products...')
product_ids = []
for name, sku, category, price in PRODUCTS:
    cur.execute(
        'INSERT IGNORE INTO products (name, sku, category, unit_price) VALUES (%s,%s,%s,%s)',
        (name, sku, category, price),
    )
    cur.execute('SELECT id FROM products WHERE sku=%s', (sku,))
    product_ids.append(cur.fetchone()[0])

# ─────────────────────────────────────────
# Inventory
# ─────────────────────────────────────────
print('Inserting inventory...')
for pid in product_ids:
    qty = random.randint(30, 200)
    cur.execute(
        'INSERT IGNORE INTO inventory (product_id, quantity_on_hand, reorder_point) VALUES (%s,%s,%s)',
        (pid, qty, 20),
    )

# ─────────────────────────────────────────
# 1 year of daily sales
# ─────────────────────────────────────────
CATEGORY_SEASONAL = {
    'AIRism':   [0.6,0.7,0.8,1.0,1.2,1.5,1.8,1.8,1.5,1.0,0.7,0.6],  # peaks in summer
    'Heattech': [1.8,1.6,1.2,0.8,0.5,0.3,0.3,0.4,0.6,1.0,1.5,1.8],  # peaks in winter
    'Outerwear':[1.5,1.3,1.0,0.7,0.5,0.3,0.3,0.4,0.7,1.0,1.3,1.5],
    'Tops':     [1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0],  # relatively flat
}

print('Generating 1 year of sales...')
start = date(2025, 1, 1)
sales_rows = []
for day_offset in range(365):
    d = start + timedelta(days=day_offset)
    month_idx = d.month - 1
    for pid, (_, _, category, unit_price) in zip(product_ids, PRODUCTS):
        seasonal = CATEGORY_SEASONAL[category][month_idx]
        base_qty = random.randint(5, 30)
        qty = max(1, int(base_qty * seasonal * random.uniform(0.8, 1.2)))
        total = round(qty * unit_price, 2)
        sales_rows.append((pid, qty, total, d))

cur.executemany(
    'INSERT INTO sales (product_id, quantity_sold, total_amount, sale_date) VALUES (%s,%s,%s,%s)',
    sales_rows,
)
print(f'  → {len(sales_rows)} sales records inserted')

# ─────────────────────────────────────────
# Skills
# ─────────────────────────────────────────
SKILL_NAMES = ['Cashier', 'Fitting Room', 'Sales Floor', 'Stock Room', 'Online Fulfilment', 'Folding']
print('Inserting skills...')
skill_ids = []
for sn in SKILL_NAMES:
    cur.execute('INSERT IGNORE INTO skills (skill_name) VALUES (%s)', (sn,))
    cur.execute('SELECT id FROM skills WHERE skill_name=%s', (sn,))
    skill_ids.append(cur.fetchone()[0])

# ─────────────────────────────────────────
# Tasks (mapped to skills + priority)
# ─────────────────────────────────────────
TASKS = [
    ('Cashier (POS)',              1, 'Cashier'),
    ('Sales Floor Service',        1, 'Sales Floor'),
    ('Fitting Room Supervision',   1, 'Fitting Room'),
    ('Stock Room Replenishment',   2, 'Stock Room'),
    ('Online Order Fulfilment',    2, 'Online Fulfilment'),
    ('Folding & Tidying',          3, 'Folding'),
    ('General Cleaning',           3, None),
]
print('Inserting tasks...')
for task_name, priority, skill_name in TASKS:
    skill_id = None
    if skill_name:
        cur.execute('SELECT id FROM skills WHERE skill_name=%s', (skill_name,))
        row = cur.fetchone()
        skill_id = row[0] if row else None
    cur.execute(
        'INSERT IGNORE INTO tasks (task_name, priority_level, required_skill_id) VALUES (%s,%s,%s)',
        (task_name, priority, skill_id),
    )

# ─────────────────────────────────────────
# 20 Employees + skills
# ─────────────────────────────────────────
print('Inserting 20 employees...')
emp_ids = []
for _ in range(20):
    name  = fake.name()
    email = fake.unique.email()
    etype = random.choice(['FT', 'PT'])
    # Random availability: at least 4 days a week
    avail = ['0'] * 7
    days  = random.sample(range(7), random.randint(4, 7))
    for d in days:
        avail[d] = '1'
    availability_mask = ''.join(avail)
    cur.execute(
        'INSERT INTO employees (name, email, type, availability_mask) VALUES (%s,%s,%s,%s)',
        (name, email, etype, availability_mask),
    )
    emp_ids.append(cur.lastrowid)

print('Assigning skills to employees...')
for eid in emp_ids:
    # Every employee gets 2–4 random skills
    chosen = random.sample(skill_ids, random.randint(2, 4))
    for sid in chosen:
        proficiency = random.randint(1, 5)
        cur.execute(
            'INSERT IGNORE INTO employee_skills (employee_id, skill_id, proficiency_level) VALUES (%s,%s,%s)',
            (eid, sid, proficiency),
        )

DB.commit()
cur.close()
DB.close()
print('\nDone! Database seeded successfully.')
