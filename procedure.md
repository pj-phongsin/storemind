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
