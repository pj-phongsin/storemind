# StoreMind — Development Procedure & Learning Reference

This file documents every step taken to build StoreMind from scratch.
Use it as a reference to understand **what each command does and why we run it**.

---

## Table of Contents
1. [Project Structure](#1-project-structure)
2. [Week 1 — Database Setup](#2-week-1--database-setup)
3. [Week 1 — Backend Setup](#3-week-1--backend-setup)
4. [Week 1 — Seed Data](#4-week-1--seed-data)
5. [Week 1 — Testing the API](#5-week-1--testing-the-api)
6. [Week 2 — Frontend Setup](#6-week-2--frontend-setup)
7. [Week 2 — Dashboard Pages](#7-week-2--dashboard-pages)
8. [Week 2 — Digital Roster & Schedule](#8-week-2--digital-roster--schedule)
9. [Week 3 — ML Service Setup](#9-week-3--ml-service-setup)
10. [Week 3 — Demand Forecasting Model](#10-week-3--demand-forecasting-model)
11. [Week 3 — Task Priority Logic](#11-week-3--task-priority-logic)
12. [Week 3 — Connecting ML to Backend & Frontend](#12-week-3--connecting-ml-to-backend--frontend)
13. [Week 4 — AI Reschedule Agent](#13-week-4--ai-reschedule-agent)
14. [Week 4 — Shift Swap Marketplace](#14-week-4--shift-swap-marketplace)
15. [Week 4 — Docker & Containerisation](#15-week-4--docker--containerisation)

---

## 1. Project Structure

Before writing any code, we create a clear folder structure so each part of the system lives in its own place.

```
storemind/
├── backend/       → Node.js API server (the "brain" that talks to the database)
├── database/      → SQL schema + Python seed script
├── frontend/      → React web app (built in Week 2)
├── ml-service/    → Python AI/ML service (built in Week 3)
└── docs/          → Spec, sprint plan, and guide documents
```

**Why separate folders?**
Each folder is an independent service. This is called a **microservices pattern** — it means you can update the frontend without touching the backend, or swap the database without rewriting the UI.

---

## 2. Week 1 — Database Setup

### What is a Database Schema?
A schema is a blueprint for your database. It defines what **tables** exist and what **columns** each table has — like designing the structure of a spreadsheet before entering any data.

### Step 1 — Open MySQL Workbench
MySQL Workbench is a visual tool to manage your MySQL database. Think of it like Excel, but for databases.

1. Open **MySQL Workbench**
2. Click your local connection (`Local instance 3306`)
3. Enter your root password → Connect

### Step 2 — Run the Schema Script
1. Click **File → Open SQL Script**
2. Select `storemind/database/schema.sql`
3. Click the **⚡ Execute All** button (lightning bolt)

This creates the `storemind` database and all 8 tables:

| Table | Purpose |
|-------|---------|
| `products` | Stores product info (name, SKU, category, price) |
| `inventory` | Tracks how much stock is on hand per product |
| `sales` | Records every daily sale transaction |
| `employees` | Stores employee info (name, full-time/part-time, availability) |
| `skills` | List of skills (Cashier, Folding, Fitting Room, etc.) |
| `employee_skills` | Links employees to their skills + proficiency level |
| `tasks` | Defines store tasks with P1/P2/P3 priority levels |
| `daily_requirements` | Tracks what type of day it is (Delivery, Sale, etc.) |
| `shifts` | Records who is working, when, and on what task |

### Understanding the SQL Commands in schema.sql

```sql
CREATE DATABASE IF NOT EXISTS storemind;
```
Creates the database. `IF NOT EXISTS` means it won't crash if you run it twice.

```sql
USE storemind;
```
Tells MySQL "use this database for all the commands below."

```sql
CREATE TABLE IF NOT EXISTS products (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  sku        VARCHAR(100) NOT NULL UNIQUE,
  category   ENUM('AIRism','Heattech','Outerwear','Tops') NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
);
```
- `INT AUTO_INCREMENT PRIMARY KEY` — a number that automatically increases for each new row (1, 2, 3...). Every row gets a unique ID.
- `VARCHAR(255)` — a text field up to 255 characters long.
- `NOT NULL` — this field is required, can't be left empty.
- `UNIQUE` — no two rows can have the same value (e.g. no duplicate SKUs).
- `ENUM(...)` — only allows one of the listed values.
- `DECIMAL(10,2)` — a number with up to 2 decimal places (for prices like 29.90).

```sql
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
```
This links one table to another. `inventory.product_id` must match a real `products.id`. `ON DELETE CASCADE` means if you delete a product, its inventory row is automatically deleted too.

---

## 3. Week 1 — Backend Setup

### What is a Backend?
The backend is the **server** — a program that runs in the background, listens for requests (e.g. "give me the sales data"), fetches data from the database, and sends it back as JSON.

We use **Node.js** (runtime to run JavaScript outside a browser) and **Express.js** (a framework that makes building APIs easy).

### Step 1 — Initialise the Node.js Project

```bash
cd backend
npm init -y
```

- `cd backend` — move into the backend folder
- `npm init -y` — creates a `package.json` file, which is like a "recipe card" for your project. It records the project name, version, and all dependencies.
- `-y` — automatically says "yes" to all setup questions (uses default values)

### Step 2 — Install Dependencies

```bash
npm install express mysql2 dotenv cors
```

This downloads and installs 4 packages into the `node_modules/` folder:

| Package | Purpose |
|---------|---------|
| `express` | Web framework — handles incoming HTTP requests and routes them to the right function |
| `mysql2` | Driver that lets Node.js talk to MySQL database |
| `dotenv` | Loads secret config (like DB passwords) from a `.env` file |
| `cors` | Allows the frontend (on a different port) to call this backend without being blocked by the browser |

All installed packages are recorded in `package.json` under `"dependencies"`.

### Step 3 — Understanding the File Structure

```
backend/
├── src/
│   ├── index.js          → Entry point — starts the server
│   ├── db.js             → Database connection pool
│   └── routes/
│       ├── sales.js      → GET /api/sales
│       ├── inventory.js  → GET /api/inventory
│       └── employees.js  → GET /api/employees
├── .env                  → Your real credentials (never commit this to Git)
├── .env.example          → Template showing what variables are needed (safe to commit)
└── package.json          → Project metadata and dependency list
```

### Step 4 — Understanding Key Files

#### `db.js` — Database Connection Pool
```js
const pool = mysql.createPool({ host, user, password, database });
```
Instead of opening a new database connection for every request (slow), a **connection pool** keeps a set of connections open and reuses them. Much faster.

#### `index.js` — The Server Entry Point
```js
app.use('/api/sales', salesRouter);
```
This tells Express: "when someone visits `/api/sales`, hand the request to the sales router."

#### A Route File (e.g. `routes/sales.js`)
```js
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT ...', params);
  res.json({ data: rows });
});
```
- `router.get('/')` — listen for GET requests
- `async/await` — modern JavaScript way to handle operations that take time (like database queries)
- `res.json(...)` — send the result back to the caller as JSON

### Step 5 — The .env File

```bash
cp backend/.env.example backend/.env
```

- `cp` — copy a file
- We copy `.env.example` to `.env` and fill in real credentials

**Why two files?**
- `.env.example` — a blank template, committed to Git so teammates know what's needed
- `.env` — your actual secrets, **never** committed to Git (add it to `.gitignore`)

```
DB_HOST=localhost       ← where MySQL is running
DB_PORT=3306            ← MySQL's default port number
DB_USER=root            ← MySQL username
DB_PASSWORD=yourpass    ← MySQL password
DB_NAME=storemind       ← which database to use
PORT=3001               ← which port the Node.js server runs on
```

---

## 4. Week 1 — Seed Data

### What is Seed Data?
Real apps need realistic data to develop and test against. "Seeding" is the process of populating your database with **fake but realistic data** so you can build features before real users exist.

### Step 1 — Install Python Dependencies

```bash
pip install faker mysql-connector-python python-dotenv
```

- `pip` — Python's package manager (like `npm` but for Python)
- `faker` — generates fake names, emails, dates, etc.
- `mysql-connector-python` — lets Python talk to MySQL
- `python-dotenv` — reads the `.env` file so the script uses the same credentials as the backend

### Step 2 — Run the Seed Script

```bash
python database/seed.py
```

**What this script generates:**
- **12 products** across 4 Uniqlo-style categories (AIRism, Heattech, Outerwear, Tops)
- **365 days of sales** with realistic seasonal patterns:
  - AIRism sells more in summer (Nov–Feb in Australia)
  - Heattech sells more in winter (May–Aug)
- **20 employees** with random names, emails, FT/PT status, and weekly availability
- **2–4 random skills** per employee with proficiency levels 1–5
- **6 skills** (Cashier, Fitting Room, Sales Floor, Stock Room, Online Fulfilment, Folding)
- **7 tasks** with P1/P2/P3 priority levels

---

## 5. Week 1 — Testing the API

### Step 1 — Start the Backend Server

```bash
cd backend
npm run dev
```

- `npm run dev` — runs the `dev` script defined in `package.json`, which is `node --watch src/index.js`
- `--watch` — automatically restarts the server whenever you save a file (great for development)
- You should see: `StoreMind backend running on port 3001`

**Leave this terminal open** — the server runs continuously until you press `Ctrl + C` to stop it.

### Step 2 — Test with Your Browser

Open your browser and visit these URLs:

| URL | What it returns |
|-----|----------------|
| `http://localhost:3001/api/health` | `{"status":"ok"}` — confirms server is alive |
| `http://localhost:3001/api/sales?limit=5` | Last 5 sales records |
| `http://localhost:3001/api/inventory` | All products with stock levels |
| `http://localhost:3001/api/employees` | All employees with their skills |

### Step 3 — Using Query Parameters

Query parameters let you **filter** the data. They go after a `?` in the URL.

```
http://localhost:3001/api/sales?from=2025-06-01&to=2025-06-30&category=Heattech
```

- `?` — starts the query parameters
- `from=2025-06-01` — filter sales from this date
- `&` — separates multiple parameters
- `to=2025-06-30` — filter sales up to this date
- `category=Heattech` — only show Heattech products

Other examples:
```
/api/inventory?low_stock=true        → only items that need reordering
/api/employees?type=FT               → only full-time employees
/api/employees?skill=Cashier         → only cashier-qualified employees
```

### Step 4 — Understanding a JSON Response

```json
{
  "data": [
    {
      "id": 1,
      "sale_date": "2025-06-15",
      "quantity_sold": 12,
      "total_amount": "358.80",
      "product_name": "Heattech Extra Warm Tee",
      "category": "Heattech",
      "sku": "HTC-001"
    }
  ],
  "count": 1
}
```

- `data` — array containing the actual results
- `count` — how many records were returned
- Each object inside `data` is one row from the database

### What is an API?
**API (Application Programming Interface)** is a way for programs to talk to each other. In this project:
- The **frontend** (React) calls the API to get data
- The **backend** (Express) receives the request, queries the database, and returns JSON
- JSON is a text format that both JavaScript and Python can read and write easily

---

---

## 6. Week 2 — Frontend Setup

### What is a Frontend?
The frontend is everything the user sees in the browser — buttons, charts, tables. We use **React** (a JavaScript library for building UIs) with **Tailwind CSS** (a utility-first CSS framework for styling) and **Chart.js** (a charting library).

### Step 1 — Scaffold the React App with Vite

```bash
cd frontend
npm create vite@5 . -- --template react
```

- `vite` — a modern build tool that starts a dev server and bundles your code. Much faster than the older Create React App.
- `--template react` — tells Vite to set up a React project
- `.` — scaffold inside the current folder (frontend/)
- We use `vite@5` specifically because our Node.js version (v21) isn't supported by the latest Vite 6

### Step 2 — Install All Dependencies

```bash
npm install
npm install chart.js react-chartjs-2 react-router-dom
npm install -D tailwindcss@3 postcss autoprefixer
```

| Package | Purpose |
|---------|---------|
| `chart.js` | The charting engine — draws line charts, donut charts, etc. |
| `react-chartjs-2` | React wrapper for Chart.js so you can use charts as React components |
| `react-router-dom` | Handles navigation between pages (Sales / Inventory / Roster) without reloading the page |
| `tailwindcss` | CSS framework — lets you style elements with class names like `bg-gray-900` or `text-white` |
| `postcss` + `autoprefixer` | Tools Tailwind needs to process and inject CSS |
| `-D` flag | Installs as a "dev dependency" — only needed during development, not in production |

### Step 3 — Initialise Tailwind

```bash
npx tailwindcss init -p
```

- Creates `tailwind.config.js` — tells Tailwind which files to scan for class names
- Creates `postcss.config.js` — wires Tailwind into the CSS build pipeline
- `-p` — also generates the PostCSS config file in one step

Then update `tailwind.config.js` to tell Tailwind where your files are:
```js
content: ['./index.html', './src/**/*.{js,jsx}'],
```
This is important — without it, Tailwind won't know which CSS classes to include in the final build.

### Step 4 — Add Tailwind to CSS

Replace the contents of `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

These three lines import Tailwind's full style system into your app.

### Step 5 — Understanding the Frontend File Structure

```
frontend/
├── src/
│   ├── main.jsx              → Entry point — mounts the React app into index.html
│   ├── App.jsx               → Root component — defines the layout and routes
│   ├── index.css             → Global styles (Tailwind directives)
│   ├── components/
│   │   └── Sidebar.jsx       → Dark sidebar with navigation links
│   ├── hooks/
│   │   └── useFetch.js       → Reusable hook to fetch data from the backend
│   └── pages/
│       ├── SalesPage.jsx     → Sales charts + KPI cards
│       ├── InventoryPage.jsx → Stock level table
│       └── RosterPage.jsx    → Employee list + daily schedule
└── tailwind.config.js
```

### Step 6 — Start the Frontend Dev Server

```bash
cd frontend
npm run dev
```

- Starts Vite's development server on `http://localhost:5173`
- **Hot Module Replacement (HMR)** — the browser automatically updates when you save a file, without a full page reload

**Important:** You need both servers running at the same time:
- Backend on `http://localhost:3001` (Node.js — provides the data)
- Frontend on `http://localhost:5173` (Vite — serves the UI)

Open two separate terminal windows, one for each.

### Key Concepts

#### What is a React Component?
A component is a reusable piece of UI — like a Lego brick. Each `.jsx` file exports one component. You combine components to build pages.

```jsx
export default function Sidebar() {
  return <aside>...</aside>
}
```

#### What is a React Hook?
A hook is a special function that gives components extra powers. Common ones:
- `useState` — stores a value that can change (e.g. selected category)
- `useEffect` — runs code when something changes (e.g. fetch data when date changes)
- Custom hooks (like our `useFetch`) — reusable logic you write yourself

#### What is React Router?
React Router lets you build a **Single Page Application (SPA)** — the URL changes and the correct page component renders, but the browser never actually reloads the page.

```jsx
<Routes>
  <Route path="/sales"     element={<SalesPage />} />
  <Route path="/inventory" element={<InventoryPage />} />
  <Route path="/roster"    element={<RosterPage />} />
</Routes>
```

#### What is `useFetch`?
Our custom hook that fetches data from the backend:
```js
const { data, loading, error } = useFetch('/api/sales?limit=5')
```
- `data` — the result array from the API
- `loading` — `true` while waiting for the response (show a spinner)
- `error` — error message if the request failed

---

## 7. Week 2 — Dashboard Pages

### Sales Page (`/sales`)

Displays two Chart.js charts and two KPI cards, with a category filter dropdown.

**Line Chart — Weekly Revenue Trend**
- Takes all daily sales records and groups them into weekly buckets
- Uses `useMemo` to avoid re-calculating every render (performance optimisation)
- `useMemo` only recalculates when `data` changes

**Donut Chart — Sales by Category**
- Aggregates total revenue per category (AIRism, Heattech, Outerwear, Tops)
- Shows the proportion each category contributes to total sales

**Category Filter**
- A `<select>` dropdown that changes the API query:
  - All → `/api/sales?limit=365`
  - Heattech → `/api/sales?limit=365&category=Heattech`
- When the query changes, `useFetch` re-fetches automatically

### Inventory Page (`/inventory`)

A filterable table showing all products with stock levels.

- **Low Stock toggle** — checkbox that adds `?low_stock=true` to the query, showing only items at or below their reorder point
- **Status badge** — green "OK" or red "Reorder" based on `needs_reorder` field from the API
- **Category filter** — same dropdown pattern as the Sales page

### Roster Page (`/roster`)

Two tabs — see Section 8 below.

---

## 8. Week 2 — Digital Roster & Schedule

### Why We Added This
The sprint required: *"a schedule interface showing who is performing what task during which time slot"* and *"manual schedule adjustments."* The employee list alone didn't satisfy this.

### New Backend Routes Added

**`GET /api/shifts?date=YYYY-MM-DD`**
Returns all shifts for a given day, joined with employee name and task info.

**`PUT /api/shifts/:id`**
Updates a single shift — used when the manager reassigns a task or changes a status.

**`GET /api/tasks`**
Returns all tasks with their priority level — used to populate the task dropdown.

### Seed Shifts Script

```bash
python database/seed_shifts.py
```

Generates shifts for today ±7 days based on each employee's `availability_mask`.
- If `availability_mask[weekday] === '1'` → employee works that day
- Assigns a random task and shift time (8–16, 9–17, 10–18, or 12–20)
- Past shifts → status `Completed`, today/future → `Active`

### Daily Schedule Tab

The key feature of Week 2. A date picker drives everything:

1. Manager picks a date
2. Frontend fetches `GET /api/shifts?date=YYYY-MM-DD`
3. Each row shows: employee name, type, shift hours, current task, priority, status
4. **Task dropdown** — changing it fires `PUT /api/shifts/:id` with the new `current_task_id`
5. **Status dropdown** — mark as Active / Sick / Swap Requested / Completed

**Optimistic update:** The UI updates instantly when you change a dropdown, then the save happens in the background. This makes the app feel fast even if the network is slow.

**Priority colour coding:**
- P1 (Critical) → Red badge — Cashier, Sales Floor, Fitting Room
- P2 (Supporting) → Amber badge — Stock Room, Online Fulfilment
- P3 (Flexible) → Green badge — Folding, General Cleaning

### How Manual Adjustments Work (Data Flow)

```
Manager clicks task dropdown
  → React state updates immediately (optimistic)
  → fetch PUT /api/shifts/123 { current_task_id: 2 }
    → Express route updates the DB row
    → Returns the updated shift
      → React state syncs with confirmed data
```

---

---

## 9. Week 3 — ML Service Setup

### What is a Machine Learning Service?
A separate Python program that handles AI/ML tasks. We keep it separate from Node.js because Python has the best ML libraries (Scikit-Learn, Pandas, NumPy). Node.js calls Python when it needs a prediction — they talk to each other over HTTP.

### Architecture Overview

```
Browser (React)
    ↕ HTTP
Node.js Backend :3001   ← bridge layer, talks to both DB and ML
    ↕ HTTP
Python ML Service :8000  ← loads data, trains model, returns predictions
    ↕ MySQL
Database :3306
```

### File Structure

```
ml-service/
├── main.py            → FastAPI app — defines the API endpoints
├── forecaster.py      → Loads sales data, trains Random Forest, returns predictions
├── task_allocator.py  → P1/P2/P3 allocation logic
├── requirements.txt   → Python package list (like package.json for Python)
└── .env               → Same DB credentials as backend
```

### Step 1 — Install Python Dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

`requirements.txt` lists all packages and their exact versions:

| Package | Purpose |
|---------|---------|
| `fastapi` | Python web framework for building APIs (like Express but for Python) |
| `uvicorn` | The server that runs FastAPI (like Node.js but for Python ASGI apps) |
| `scikit-learn` | Machine Learning library — contains Random Forest and other models |
| `pandas` | Data manipulation — reads data into tables (DataFrames) for analysis |
| `numpy` | Numerical computing — fast math operations used by scikit-learn |
| `mysql-connector-python` | Connects Python to MySQL |
| `python-dotenv` | Reads the `.env` file for DB credentials |

**Why pin versions?** Specifying exact versions (e.g. `scikit-learn==1.4.2`) ensures the code works the same on every machine — no surprises from an updated library changing its behaviour.

### Step 2 — Copy the .env File

```bash
cp backend/.env ml-service/.env
```

The ML service connects to the same MySQL database as the backend, so it uses the same credentials.

### Step 3 — Start the ML Service

```bash
cd ml-service
python -m uvicorn main:app --port 8000 --reload
```

- `python -m uvicorn` — runs uvicorn using Python's module system (more reliable than calling `uvicorn` directly)
- `main:app` — looks in `main.py` for a variable called `app` (the FastAPI instance)
- `--port 8000` — runs on port 8000 (separate from Node.js on 3001)
- `--reload` — auto-restarts when you save a file (development mode)

At startup, FastAPI automatically trains the ML models — you'll see in the terminal:
```
[startup] Training forecasting models...
[forecaster] Models trained for: ['AIRism', 'Heattech', 'Outerwear', 'Tops']
[startup] Ready.
```

### Step 4 — Test the ML Service

```bash
# Health check
curl http://localhost:8000/health

# Predict Heattech revenue for next 7 days
curl "http://localhost:8000/forecast?category=Heattech&days=7"

# Generate task allocation for a high-traffic day
curl -X POST http://localhost:8000/task-allocation \
  -H "Content-Type: application/json" \
  -d '{"predicted_revenue": 4000, "available_staff": 12, "event_type": "Sale"}'
```

**Running all three services at once:**
You need three separate terminal windows:

| Terminal | Command | Port |
|----------|---------|------|
| 1 | `cd backend && npm run dev` | 3001 |
| 2 | `cd ml-service && python -m uvicorn main:app --port 8000 --reload` | 8000 |
| 3 | `cd frontend && npm run dev` | 5173 |

---

## 10. Week 3 — Demand Forecasting Model

### What is Demand Forecasting?
Predicting how much of something will be sold in the future based on past data. Retailers use this to prepare the right amount of stock and staff.

### What is a Random Forest?
A machine learning model made of many Decision Trees working together.

- A **Decision Tree** asks a series of yes/no questions to reach a prediction (like a flowchart)
- A **Random Forest** builds 100 different trees, each trained on a slightly different random sample of the data, and averages their predictions
- This makes it more accurate and robust than a single tree — less likely to overfit (memorise the training data instead of learning general patterns)

```
Sales data (365 days)
    ↓
Feature Engineering (day of week, month, seasonality, rolling average)
    ↓
Random Forest (100 trees trained per category)
    ↓
Predict revenue for next 7-30 days
```

### Feature Engineering

Raw data (a date and a revenue number) isn't enough for the model — we need to extract useful signals. This is called **feature engineering**:

| Feature | Why it helps |
|---------|-------------|
| `day_of_week` | Sales differ on weekdays vs weekends |
| `month` | Captures seasonal patterns (winter vs summer) |
| `day_of_year` | Fine-grained seasonality signal |
| `week` | ISO week number for weekly patterns |
| `rolling_7d` | 7-day rolling average — the model learns from recent momentum |

### One Model Per Category
We train 4 separate models — one for AIRism, one for Heattech, one for Outerwear, one for Tops. Each category has different seasonal behaviour:
- **AIRism** peaks in Australian summer (Nov–Feb)
- **Heattech** peaks in Australian winter (May–Aug)

Training separate models lets each one learn its own seasonal pattern without confusing the others.

### Model Caching
Training takes a few seconds. We train once at startup and store the models in a Python dictionary (`_models`). Every `/forecast` request reuses the already-trained models — fast responses without re-training.

### Making a Prediction for Future Dates
For future dates we don't have real `rolling_7d` data, so we simulate it:
```python
rolling = (rolling * 6 + predicted) / 7  # update rolling average with each new prediction
```
This carries the momentum forward day by day.

---

## 11. Week 3 — Task Priority Logic

### The Business Problem
When the AI predicts a high-revenue day, the manager needs to know: *how should I deploy my staff?* The task allocator answers this automatically.

### Traffic Classification
First, we classify the predicted daily revenue into a traffic level:

| Revenue | Traffic Level |
|---------|--------------|
| Under $1,500 | Low |
| $1,500 – $3,500 | Medium |
| Over $3,500 | High |

### Allocation Ratios
Each traffic level + event type combination has pre-defined ratios for P1/P2/P3:

| Traffic | Event | P1 | P2 | P3 |
|---------|-------|----|----|-----|
| High | Normal | 65% | 25% | 10% |
| High | Sale | 75% | 20% | 5% |
| High | Delivery | 55% | 35% | 10% |
| Medium | Normal | 55% | 30% | 15% |
| Low | Normal | 50% | 30% | 20% |

**Why these ratios?**
- P1 (Critical) — Cashier, Sales Floor, Fitting Room — customer-facing, always staffed first
- P2 (Supporting) — Stock Room, Online Fulfilment — scales up on Delivery days
- P3 (Flexible) — Folding, Cleaning — gets more staff only when traffic is low

### Example Calculation
- Predicted revenue: $4,000 → **High traffic**
- Event type: Sale
- Available staff: 12
- Ratios: P1=75%, P2=20%, P3=5%
- Result: P1=9 staff, P2=2 staff, P3=1 staff

### Optimistic Update Pattern
The frontend updates the UI immediately when the user clicks "Generate Auto-Task", then waits for the server response. If something goes wrong, it shows an error. This makes the app feel instant.

---

## 12. Week 3 — Connecting ML to Backend & Frontend

### The Bridge Pattern
Node.js doesn't run Python code directly. Instead, the backend acts as a **proxy** — it receives requests from the frontend, forwards them to the Python service, and returns the response.

```
Frontend → GET /api/forecast → Node.js → GET /forecast → Python ML → data → Node.js → data → Frontend
```

**Why use a bridge instead of calling Python directly from the frontend?**
- Security: the ML service URL stays private (server-side only)
- Flexibility: you can add authentication, caching, or logging in the bridge layer
- In production (Week 4), the ML service won't be publicly accessible — only Node.js can reach it

### New Backend Routes

**`GET /api/forecast?category=all&days=7`**
Proxies to `GET http://localhost:8000/forecast`

**`POST /api/forecast/task-allocation`**
Proxies to `POST http://localhost:8000/task-allocation`

If the ML service is not running, the backend returns a `502 Bad Gateway` error with a helpful message.

### Frontend — AI Forecast Page (`/forecast`)

**Forecast Chart:**
- Fetches `/api/forecast?category=all&days=7` (or 14 or 30)
- Groups data by category and date
- Renders a multi-line Chart.js chart — one line per category
- KPI cards show total forecast revenue and predicted peak day

**Generate Auto-Task Panel:**
- Manager inputs: predicted revenue, available staff count, event type
- Clicks "Generate Auto-Task" → `POST /api/forecast/task-allocation`
- Results show as colour-coded progress bars (P1=red, P2=amber, P3=green)
- Each tier lists the tasks that staff should be assigned to
- A plain-English recommendation is shown (e.g. "High traffic + Sale event — maximise cashiers and sales floor.")

### What is `fetch()` with POST?
```js
const r = await fetch('/api/forecast/task-allocation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ predicted_revenue: 3500, available_staff: 12, event_type: 'Normal' }),
})
const result = await r.json()
```
- `method: 'POST'` — sending data to the server, not just reading it
- `headers` — tells the server the body is JSON format
- `body: JSON.stringify(...)` — converts a JavaScript object into a JSON string to send
- `await r.json()` — parses the response JSON back into a JavaScript object

---

---

## 13. Week 4 — AI Reschedule Agent

### What is the AI Reschedule Agent?
An automated backend logic system that handles employee absences without manager involvement. When someone calls in sick, the agent follows a decision tree to find the best internal solution before escalating.

### The Decision Logic (Step by Step)

```
Manager reports sick leave (employee_id + date)
    ↓
Find the employee's shift → get task + priority level
    ↓
Mark shift status = 'Sick'
    ↓
Is the task P1 (Critical)?
  YES → Scan all P3 staff on the same day
         → Filter by required skill
         → Pick highest proficiency
         → Reassign their task to cover the P1 gap
         → Return reassignment report
  NO  → P2/P3 tasks: lower impact, no reassignment needed
         → Return informational action message
```

**Why P3 staff first?**
P3 tasks (Folding, Cleaning) are "Flexible" — they can be paused without immediately harming the customer experience. P1 tasks (Cashier, Sales Floor, Fitting Room) cannot. So the agent takes someone from the least critical duty to cover the most critical one.

### New Backend Route

**`POST /api/agent/sick-leave`**
```json
Request body:  { "employee_id": 3, "date": "2026-05-10" }

Response:
{
  "sick_employee":  "Amber Peterson",
  "affected_task":  "Sales Floor Service",
  "priority_level": 1,
  "reassignment": {
    "employee_name":    "Lauren Wood",
    "from_task":        "Folding & Tidying",
    "to_task":          "Sales Floor Service",
    "proficiency_level": 5
  },
  "action": "Reallocated Lauren Wood from Folding & Tidying (P3) to cover Sales Floor Service (P1)."
}
```

### Database Transaction
The agent uses a **database transaction** to ensure all changes succeed or none do:

```js
await conn.beginTransaction();
// ... mark shift Sick, reassign P3 employee ...
await conn.commit();    // all changes saved together
// if anything fails:
await conn.rollback();  // undo everything, DB stays clean
```

**Why transactions?**
If the server crashes after marking the shift Sick but before reassigning the P3 employee, the store would have two uncovered tasks. A transaction prevents this — either both changes succeed or neither does.

### SQL Used in the Agent
```sql
-- Find the sick employee's shift and task details
SELECT s.id, t.task_name, t.priority_level, t.required_skill_id
FROM shifts s
JOIN tasks t ON t.id = s.current_task_id
WHERE s.employee_id = ? AND DATE(s.start_time) = ? AND s.status = 'Active'

-- Find P3 staff on the same day with the required skill
SELECT e.name, es.proficiency_level
FROM shifts s
JOIN employees e ON e.id = s.employee_id
JOIN tasks t ON t.id = s.current_task_id
JOIN employee_skills es ON es.employee_id = e.id AND es.skill_id = ?
WHERE DATE(s.start_time) = ?
  AND t.priority_level = 3
ORDER BY es.proficiency_level DESC
LIMIT 1
```

### Frontend — AI Agent Page (`/agent`)

Three "how it works" cards explain the agent logic visually (Gap Assessment → Smart Reallocation → Escalation).

**Sick Leave form:**
1. Select the absent employee from a dropdown (populated from `/api/employees`)
2. Pick the date
3. Click "Report Sick Leave"
4. The result shows: who was absent, what task was affected, who was reallocated, and from/to task with proficiency level

Colour coding:
- Green panel = internal reallocation succeeded
- Amber panel = no reallocation possible, escalate

---

## 14. Week 4 — Shift Swap Marketplace

### What is Shift Swap?
Instead of a manager manually calling around to find cover, the system automatically identifies which employees are eligible to swap shifts — removing the manager from the coordination process entirely.

### Eligibility Rules
An employee is eligible to swap if they:
1. **Have the required skill** for the shift's task
2. **Are available that day** — their `availability_mask` shows a `1` for that weekday
3. **Are not already scheduled** — no other Active shift on that date

### Availability Mask to Weekday Mapping
```
availability_mask = "1111100"  (Mon–Fri available, Sat–Sun off)
Index:               0123456   (0=Mon, 6=Sun)

JavaScript Date.getDay() returns: 0=Sun, 1=Mon, ... 6=Sat
So we remap: maskIndex = (getDay() === 0) ? 6 : getDay() - 1
```

### New Backend Route

**`POST /api/agent/shift-swap`**
```json
Request body:  { "shift_id": 116 }

Response:
{
  "employee_name":  "John Castillo",
  "task":           "Stock Room Replenishment",
  "required_skill": "Stock Room",
  "status":         "Swap_Requested",
  "eligible_peers": [
    { "name": "Christine Brooks", "type": "FT", "proficiency_level": 4 },
    { "name": "Jenna Juarez",     "type": "PT", "proficiency_level": 3 }
  ],
  "peer_count": 2
}
```

### Why `GROUP BY` in the SQL?
Without `GROUP BY`, the JOIN between `employees` and `employee_skills` would return one row per skill — causing duplicate employee entries in the results. `GROUP BY e.id` collapses them to one row per employee, using `MAX(proficiency_level)` to keep their best skill rating.

```sql
SELECT e.id, e.name, MAX(es.proficiency_level) AS proficiency_level
FROM employees e
JOIN employee_skills es ON es.employee_id = e.id
WHERE ...
GROUP BY e.id, e.name, e.type, e.availability_mask
ORDER BY proficiency_level DESC
```

### Frontend — Shift Swap Panel
- Dropdown shows all **Active** shifts for today
- Click "Find Swap Peers" → shift is marked `Swap_Requested` in the DB
- Ranked list of eligible candidates appears, sorted by proficiency
- A manager can then contact the top candidate directly

---

## 15. Week 4 — Docker & Containerisation

### What is Docker?
Docker packages your application and all its dependencies into a **container** — a self-contained unit that runs the same way on any machine. No more "it works on my laptop" problems.

**Key concepts:**

| Term | Meaning |
|------|---------|
| **Image** | A blueprint/snapshot of your app — like a recipe |
| **Container** | A running instance of an image — like a dish made from the recipe |
| **Dockerfile** | Instructions to build an image, step by step |
| **docker-compose** | A tool to run multiple containers together as one system |
| **Volume** | Persistent storage that survives container restarts (used for MySQL data) |
| **Health check** | A command Docker runs to verify a container is truly ready before starting dependents |

### Project Dockerfiles

#### `backend/Dockerfile`
```dockerfile
FROM node:20-alpine      # Start from official Node.js image (alpine = small Linux)
WORKDIR /app             # All commands run inside /app
COPY package*.json ./    # Copy dependency list first (Docker cache optimisation)
RUN npm ci --only=production  # Install only production deps
COPY src/ ./src/         # Copy source code
EXPOSE 3001              # Document which port this container uses
CMD ["node", "src/index.js"]  # Command to start the app
```

**Why copy `package.json` before the source code?**
Docker builds in layers. If source code changes but `package.json` doesn't, Docker reuses the cached `npm install` layer — much faster rebuilds.

#### `ml-service/Dockerfile`
```dockerfile
FROM python:3.11-slim    # Official Python image (slim = smaller size)
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt  # --no-cache-dir saves image size
COPY *.py ./
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`--host 0.0.0.0` is required inside Docker — without it, the server only listens on `localhost` inside the container and can't be reached from outside.

#### `frontend/Dockerfile` (Multi-Stage Build)
```dockerfile
# Stage 1 — Build the React app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build        # Produces /app/dist (static HTML/CSS/JS files)

# Stage 2 — Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

**Why two stages?**
Stage 1 needs Node.js, npm, and all dev dependencies to build. Stage 2 only needs nginx to serve static files. The final image only contains Stage 2 — no Node.js, no source code, no node_modules. Result: a tiny, secure production image.

### `docker-compose.yml`

```yaml
services:
  db:           # MySQL — starts first, others wait for its health check
  backend:      # Node.js — depends on db being healthy
  ml-service:   # Python FastAPI — depends on db being healthy
  frontend:     # nginx serving React — depends on backend
```

**Key concepts used:**

`depends_on` with `condition: service_healthy` — ensures the database is fully ready before the backend or ML service tries to connect. Without this, the app would crash on startup because MySQL takes a few seconds to initialise.

`volumes: db_data:/var/lib/mysql` — MySQL stores its data files here. Even if you restart or rebuild the container, your data persists.

`healthcheck` — Docker periodically runs `mysqladmin ping` inside the DB container. Only when it succeeds does Docker start the dependent services.

### Running the Whole Project with Docker

```bash
# 1. Copy the root env file and fill in your password
cp .env.example .env

# 2. Build all images and start all containers
docker-compose up --build

# 3. Seed the database (first time only)
docker exec -it storemind-backend node -e "console.log('ready')"
python database/seed.py
python database/seed_shifts.py

# 4. Open the app
open http://localhost
```

To stop everything:
```bash
docker-compose down          # stops containers but keeps data
docker-compose down -v       # stops containers AND deletes the database volume
```

### Running Locally (Without Docker)
Open 3 terminal windows:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — ML Service
cd ml-service && python -m uvicorn main:app --port 8000 --reload

# Terminal 3 — Frontend
cd frontend && npm run dev
```

---

## Glossary

| Term | Meaning |
|------|---------|
| **Node.js** | Runs JavaScript code on a server (outside the browser) |
| **Express.js** | Framework that makes building APIs in Node.js easy |
| **MySQL** | Relational database — stores data in tables with rows and columns |
| **API** | A set of URLs your server exposes so other apps can request data |
| **JSON** | Text format for sending structured data between systems |
| **npm** | Node Package Manager — installs JavaScript libraries |
| **pip** | Python's package manager — installs Python libraries |
| **Schema** | Blueprint defining the structure of your database tables |
| **Seed data** | Fake but realistic data generated to develop and test with |
| **Port** | A numbered "door" on your computer — 3306 is MySQL, 3001 is our backend |
| **GET request** | The most basic type of HTTP request — "give me this data" |
| **Query parameter** | A filter added to a URL after `?` to narrow down results |
| **.env** | A file storing secret config values like passwords — never share this |
| **Foreign Key** | A column that links to the ID of another table |
| **Connection Pool** | A group of reusable database connections for performance |
| **React** | JavaScript library for building UIs out of reusable components |
| **Vite** | Fast build tool and dev server for modern JavaScript projects |
| **Tailwind CSS** | CSS framework — style elements using utility class names instead of writing CSS files |
| **Component** | A reusable piece of UI in React — each `.jsx` file is usually one component |
| **Hook** | A special React function that gives components powers like state and side effects |
| **useState** | React hook — stores a value that can change and re-renders the UI when it does |
| **useEffect** | React hook — runs code when something changes (e.g. fetch data when the date picker changes) |
| **useMemo** | React hook — caches an expensive calculation so it doesn't re-run on every render |
| **SPA** | Single Page Application — page never fully reloads; React Router swaps components instead |
| **HMR** | Hot Module Replacement — Vite updates the browser instantly when you save a file |
| **Optimistic update** | Update the UI immediately before the server confirms, making the app feel faster |
| **PUT request** | HTTP request type meaning "update this existing resource" |
| **React Router** | Library that maps URL paths to page components without reloading the browser |
| **FastAPI** | Python web framework for building APIs — fast, modern, auto-generates docs at `/docs` |
| **Uvicorn** | The ASGI server that runs FastAPI (equivalent to Node.js for Python async apps) |
| **Machine Learning (ML)** | Programs that learn patterns from data to make predictions, without being explicitly programmed |
| **Random Forest** | An ML model that builds many Decision Trees and averages their predictions for accuracy |
| **Decision Tree** | A model that makes predictions by asking a series of yes/no questions — like a flowchart |
| **Feature Engineering** | Transforming raw data into useful inputs for a model (e.g. extracting month and day-of-week from a date) |
| **Overfitting** | When a model memorises training data instead of learning general patterns — performs badly on new data |
| **Training** | The process of fitting an ML model to historical data so it can make predictions |
| **Prediction** | The output of a trained ML model when given new input data it hasn't seen before |
| **Proxy / Bridge** | A server that forwards requests from one place to another — Node.js bridges frontend ↔ Python ML |
| **502 Bad Gateway** | HTTP error meaning the server got a bad response from an upstream service (e.g. ML service is down) |
| **Pandas DataFrame** | A 2D table-like data structure in Python — rows and columns, like a spreadsheet in code |
| **Rolling Average** | Average of the last N values in a time series — smooths out noise and captures recent trends |
| **Traffic Level** | Our classification of predicted revenue: Low / Medium / High — drives the P1/P2/P3 allocation ratios |
| **POST request** | HTTP request type meaning "send this data to the server to create or compute something" |
| **Docker** | Tool that packages apps into containers — runs identically on any machine |
| **Container** | A running, isolated instance of a Docker image |
| **Image** | A built snapshot of an app used to create containers |
| **Dockerfile** | Step-by-step instructions for building a Docker image |
| **docker-compose** | Tool to define and run multiple containers together as one system |
| **Multi-stage build** | Dockerfile technique using two FROM stages — one to build, one to serve — produces a smaller final image |
| **Volume** | Persistent Docker storage that survives container restarts (used for MySQL data) |
| **Health check** | A command Docker runs to verify a container is truly ready before starting dependent services |
| **`depends_on`** | docker-compose directive that controls startup order between services |
| **Transaction** | A group of DB operations that all succeed or all fail together — prevents partial/corrupt data |
| **Rollback** | Undoing all changes in a transaction if something goes wrong |
| **`--host 0.0.0.0`** | Tells a server to listen on all network interfaces inside Docker, not just localhost |
| **AI Agent** | Autonomous logic that makes decisions and takes actions based on rules — no manual input needed |
| **Escalation** | The fallback path when automated logic can't solve a problem — hands off to a human or next system |
