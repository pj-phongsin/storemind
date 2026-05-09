# StoreMind

Retail management web app combining Demand Forecasting + AI Workforce Scheduling (Uniqlo-style, Australian retail).

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS + Chart.js |
| Backend | Node.js + Express |
| AI/ML | Python + Scikit-Learn + FastAPI |
| Database | MySQL |
| DevOps | Docker + docker-compose |

## Project Structure

```
storemind/
├── backend/                Node.js + Express API
│   ├── src/
│   │   ├── index.js
│   │   ├── db.js
│   │   └── routes/
│   │       ├── sales.js
│   │       ├── inventory.js
│   │       ├── employees.js
│   │       ├── shifts.js
│   │       └── tasks.js
│   └── .env.example
├── database/
│   ├── schema.sql          All table definitions
│   ├── seed.py             Products, employees, 1-year sales data
│   └── seed_shifts.py      Shift schedule data (today ±7 days)
├── frontend/               React dashboard
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SalesPage.jsx
│   │   │   ├── InventoryPage.jsx
│   │   │   ├── RosterPage.jsx
│   │   │   ├── ForecastPage.jsx
│   │   │   └── AgentPage.jsx
│   │   ├── components/
│   │   │   └── Sidebar.jsx
│   │   └── hooks/
│   │       └── useFetch.js
│   └── Dockerfile
├── ml-service/             Python FastAPI + ML
│   ├── main.py
│   ├── forecaster.py
│   ├── task_allocator.py
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
└── docs/
```

## Quick Start

### 1. Database

Open MySQL Workbench, run `database/schema.sql` to create all tables.

### 2. Backend

```bash
cd backend
cp .env.example .env          # Fill in your DB credentials
npm install
npm run dev                    # Runs on http://localhost:3001
```

### 3. Seed Data

```bash
# From project root
pip install faker mysql-connector-python python-dotenv
python database/seed.py         # Products, employees, sales
python database/seed_shifts.py  # Shift schedule (today ±7 days)
```

`seed.py` inserts:
- 12 products across 4 categories (AIRism, Heattech, Outerwear, Tops)
- 1 year of daily sales with Australian seasonal patterns
- 20 employees with random skills and availability
- 7 tasks with P1/P2/P3 priority levels

`seed_shifts.py` inserts:
- 239 shifts across 15 days based on employee availability masks
- Past shifts marked `Completed`, today/future marked `Active`

### 4. ML Service

```bash
cd ml-service
cp ../backend/.env .env        # Same DB credentials
pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload   # Runs on http://localhost:8000
```

Models train automatically at startup. Check `http://localhost:8000/health` to confirm.

### 5. Frontend

```bash
cd frontend
npm install
npm run dev                    # Runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Docker (Run Everything at Once)

```bash
# Copy and fill in the root env file
cp .env.example .env           # Set DB_PASSWORD and DB_NAME

# Build and start all 4 services
docker-compose up --build

# Seed the database (first time only — run while containers are up)
python database/seed.py
python database/seed_shifts.py
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:3001 |
| ML Service | http://localhost:8000 |
| ML API Docs | http://localhost:8000/docs |

```bash
docker-compose down      # Stop all containers (data preserved)
docker-compose down -v   # Stop and delete database volume
```

---

## API Endpoints

All routes are prefixed with `/api`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sales` | Sales history |
| GET | `/api/inventory` | Current stock levels |
| GET | `/api/employees` | Employee roster with skills |
| GET | `/api/shifts` | Shifts for a given date |
| PUT | `/api/shifts/:id` | Update task or status of a shift |
| GET | `/api/tasks` | All tasks with priority levels |
| GET | `/api/forecast` | 7–30 day demand forecast (proxies to ML service) |
| POST | `/api/forecast/task-allocation` | Auto P1/P2/P3 staff allocation |
| POST | `/api/agent/sick-leave` | Report absence → auto reschedule |
| POST | `/api/agent/shift-swap` | Find eligible shift swap peers |

### Query Parameters

**GET /api/sales**
- `from` — start date `YYYY-MM-DD`
- `to` — end date `YYYY-MM-DD`
- `category` — `AIRism` / `Heattech` / `Outerwear` / `Tops`
- `limit` — max rows (default 100)

**GET /api/inventory**
- `category` — filter by product category
- `low_stock=true` — only items at or below reorder point

**GET /api/employees**
- `type` — `FT` (full-time) or `PT` (part-time)
- `skill` — filter by skill name (e.g. `Cashier`)

**GET /api/shifts**
- `date` — `YYYY-MM-DD` (defaults to today)

### Example Requests

```bash
# Sales & inventory
curl "http://localhost:3001/api/sales?from=2025-06-01&to=2025-06-30&category=Heattech"
curl "http://localhost:3001/api/inventory?low_stock=true"
curl "http://localhost:3001/api/employees?type=FT&skill=Cashier"

# Roster
curl "http://localhost:3001/api/shifts?date=2026-05-10"
curl -X PUT http://localhost:3001/api/shifts/115 \
  -H "Content-Type: application/json" \
  -d '{"current_task_id": 1}'

# Forecast
curl "http://localhost:3001/api/forecast?category=Heattech&days=7"
curl -X POST http://localhost:3001/api/forecast/task-allocation \
  -H "Content-Type: application/json" \
  -d '{"predicted_revenue": 4000, "available_staff": 12, "event_type": "Sale"}'

# AI Agent — sick leave
curl -X POST http://localhost:3001/api/agent/sick-leave \
  -H "Content-Type: application/json" \
  -d '{"employee_id": 3, "date": "2026-05-10"}'

# AI Agent — shift swap
curl -X POST http://localhost:3001/api/agent/shift-swap \
  -H "Content-Type: application/json" \
  -d '{"shift_id": 116}'
```

## Dashboard Features

| Page | Features |
|------|---------|
| **Sales** | Weekly revenue line chart, category donut chart, KPI cards, category filter |
| **Inventory** | Stock table, low-stock toggle, category filter, reorder status badges |
| **Roster → Daily Schedule** | Date picker, shift grid, editable task/status dropdowns (Active/Sick/Swap/Completed) |
| **Roster → Employees** | Employee list with availability grid and skill badges, filter by type and skill |
| **AI Forecast** | 7/14/30-day predicted revenue chart per category + Generate Auto-Task allocation panel |
| **AI Agent** | Sick leave reporter with auto P3→P1 reallocation + Shift Swap Marketplace peer finder |

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=storemind
PORT=3001
ML_SERVICE_URL=http://localhost:8000
```

For Docker, copy `.env.example` to `.env` at the project root:
```
DB_PASSWORD=your_password_here
DB_NAME=storemind
```

## Development Roadmap

- **Week 1** ✅ — Database schema + Node.js backend API
- **Week 2** ✅ — React dashboard (Sales, Inventory, Digital Roster)
- **Week 3** ✅ — Python FastAPI ML service (demand forecasting + task prioritisation)
- **Week 4** ✅ — AI Reschedule Agent + Shift Swap + Docker containerisation
