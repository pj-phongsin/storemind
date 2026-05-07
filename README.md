# StoreMind

Retail management web app combining Demand Forecasting + AI Workforce Scheduling (Uniqlo-style, Australian retail).

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Tailwind CSS + Chart.js |
| Backend | Node.js + Express |
| AI/ML | Python + Scikit-Learn + FastAPI |
| Database | MySQL |
| DevOps | Docker + docker-compose |

## Project Structure

```
storemind/
├── backend/          Node.js + Express API
│   ├── src/
│   │   ├── index.js
│   │   ├── db.js
│   │   └── routes/
│   │       ├── sales.js
│   │       ├── inventory.js
│   │       └── employees.js
│   └── .env.example
├── database/
│   ├── schema.sql    All table definitions
│   └── seed.py       Synthetic data generator
├── frontend/         React app (Week 2)
├── ml-service/       Python FastAPI + ML (Week 3)
└── docs/
```

## Quick Start

### 1. Database

```bash
# Create the schema
mysql -u root -p < database/schema.sql
```

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
python database/seed.py
```

This inserts:
- 12 products across 4 categories (AIRism, Heattech, Outerwear, Tops)
- 1 year of daily sales with seasonal patterns
- 20 employees with random skills and availability
- Pre-defined tasks with P1/P2/P3 priority levels

## API Endpoints

All routes are prefixed with `/api`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sales` | Sales history |
| GET | `/api/inventory` | Current stock levels |
| GET | `/api/employees` | Employee roster with skills |

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

### Example Requests (Postman / curl)

```bash
# All sales for February 2025
curl "http://localhost:3001/api/sales?from=2025-02-01&to=2025-02-28"

# Low-stock items only
curl "http://localhost:3001/api/inventory?low_stock=true"

# Full-time cashier-qualified employees
curl "http://localhost:3001/api/employees?type=FT&skill=Cashier"
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=storemind
PORT=3001
```

## Development Roadmap

- **Week 1** — Database + Backend Foundation (current)
- **Week 2** — React Dashboard + Chart.js visualisations
- **Week 3** — FastAPI ML service (demand forecasting)
- **Week 4** — AI Reschedule Agent + Docker + deployment
