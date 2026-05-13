# **📋 Procedure Log: StoreMind DWS & Roster**

This document records the implementation decisions, fixes, and procedures applied
to the StoreMind DWS (Daily Work Schedule) generator and Roster module.

---

## **1. Spec-v2 Migration — Skills & Tasks**

### Problem
`database/seed.py` was seeding old skills (`Stock Room`, `Online Fulfilment`, `Folding`)
that didn't match the spec-v2 task definitions. The DWS generator couldn't find
qualified staff for tasks like `Runner`, `Replenishment`, `Alteration`, and `Self Check-Out`.

### Fix
Updated `database/seed.py`:

- **SKILL_NAMES** changed to spec-v2 set:
  `Sales Floor`, `Cashier`, `Fitting Room`, `Alteration`, `Runner`, `Self Check-Out`, `Replenishment`

- **TASKS** updated to spec-v2 task codes with `task_code` column:
  `SF_A–SF_D`, `CSH`, `FR1–FR3`, `ALT`, `RN`, `SCO`, `RP`, `TIDY`

- **Guaranteed skill distribution** added so the DWS generator always finds
  qualified staff. Minimum employees per skill:

  | Skill | Min employees |
  |-------|--------------|
  | Sales Floor | 8 |
  | Cashier | 4 |
  | Fitting Room | 4 |
  | Runner | 4 |
  | Replenishment | 4 |
  | Alteration | 3 |
  | Self Check-Out | 3 |

- **Cleanup on re-seed**: added `DELETE FROM employee_skills / shifts / employees / skills / tasks`
  at the start so re-running seed.py starts fresh.

### How to re-seed
```bash
python database/seed.py
python database/seed_shifts.py
```

---

## **2. DWS Generator — Architecture**

File: `ml-service/dws_generator.py`

### Store Hours (customer-facing window, spec-v2)
| Day | Open | Close |
|-----|------|-------|
| Mon–Wed | 09:00 | 17:30 |
| Thu–Fri | 09:00 | 21:00 |
| Sat | 09:30 | 17:00 |
| Sun | 10:00 | 17:00 |

### Shift Structure
Employees are assigned shift templates **round-robin** per day.

| Shift Type | Times | Days |
|------------|-------|------|
| Opening | 07:30–16:30, 08:30–18:30 | All days |
| Opening (Sat) | 07:30–16:30, 08:30–18:00 | Saturday only (capped at 18:00) |
| Mid | 10:00–18:30, 11:00–20:00, 12:30–21:00 | Thu / Fri |
| Closing Thu | 10:00–18:30, 13:30–22:00 | Thursday |
| Closing Sat | 10:00–18:00 | Saturday |
| Sunday | 09:00–18:00, 09:30–18:00 | Sunday only |

### Tidy Task (Store Preparation)
Any staff time **before store open** or **after store close** is automatically
assigned the `TIDY` task (tidying the sales floor, preparing the store).

Example — Monday (store 09:00–17:30):
- `07:30–09:00` → **TIDY** (pre-open)
- `09:00–17:30` → regular task assignment
- `17:30–18:30` → **TIDY** (post-close, for 08:30–18:30 shift only)

### Break Patterns
Each shift template has 3 staggered break patterns (lunch 60 min first, short break 30 min second).
Employees on the same template cycle through patterns so no two break simultaneously.

Example for `07:30–16:30`:
| Pattern | Lunch | Short break |
|---------|-------|-------------|
| P0 | 11:00–12:00 | 14:00–14:30 |
| P1 | 11:30–12:30 | 14:30–15:00 |
| P2 | 12:00–13:00 | 15:00–15:30 |

### Task Assignment Algorithm (Period-First)
1. Collect all time boundaries (shift starts/ends, break edges, store open/close, every 2h)
2. For each period, determine available employees (on shift, not on break)
3. Sort available employees: **sticky employees first** (those with a current preferred task)
4. Assign tasks using priority sort key: `(mandatory_uncovered, priority, coverage_count, is_preferred)`
5. Stickiness rules:
   - Employees stay on current task until `MAX_BLOCK_MIN = 120 min`
   - Only rotate when period length ≥ `MIN_BLOCK_MIN = 60 min`
   - Hard rotate after `FORCE_ROTATE_MIN = 240 min` (4-hour rule)
6. Merge consecutive same-task slots into clean blocks

### Task Definitions
| Code | Name | Min Staff | Max Staff | Priority |
|------|------|-----------|-----------|----------|
| SF_A–SF_D | Sale Floor Zones | 1 each | 1 each | P1 |
| CSH | Cashier | 1 | 1 | P1 |
| FR1 | Fitting Room 1 | 1 | 1 | P1 |
| ALT | Alteration | 1 | 1 | P1 |
| RN | Runner | 1 | 2 | P2 |
| SCO | Self Check-Out | 0 | 1 | P2 |
| FR2 | Fitting Room 2 | 0 | 1 | P2 |
| RP | Replenishment | 1 | 2 | P2 |
| FR3 | Fitting Room 3 | 0 | 1 | P3 |
| TIDY | Store Preparation | — | — | — |

---

## **3. DWS API — Auto-Create Shifts for Future Dates**

File: `backend/src/routes/dws.js`

### Problem
`POST /api/dws/generate` required pre-seeded shifts in the DB. Requesting a
date beyond `seed_shifts.py`'s ±7 day window returned:
> "No active shifts found for this date. Run seed_shifts.py first."

### Fix
If no shifts exist for the requested date, the API now:
1. Reads each employee's `availability_mask` for that day of week
2. Auto-inserts shift rows using store open/close as placeholder times
3. Proceeds with DWS generation as normal

The DWS now works for **any future date** without needing `seed_shifts.py`.

---

## **4. Frontend DWS Page Fixes**

File: `frontend/src/pages/DWSPage.jsx`

| Issue | Fix |
|-------|-----|
| Store Hours not showing | Added `STORE_HOURS_BY_DAY` fallback lookup (GET route doesn't return store_hours) |
| Day name not showing | Added `DAY_NAMES` array derived from date |
| Break ☕ hidden in 30-min blocks | Lowered render threshold from `width > 6` to `width > 2` |
| Task code hidden in 30-min blocks | Lowered threshold to `width > 2.5` |
| Staff not sorted by start time | Sort schedules by `shift_start` or first slot start, then name |
| TIDY not in legend/colours | Added `TIDY` to colour map (`bg-slate-400`) |

---

## **5. Roster Page — Spec-v2 Skill Colours**

File: `frontend/src/pages/RosterPage.jsx`

Updated `SKILL_COLORS` and the skill filter dropdown to match spec-v2 skill names:

| Skill | Colour |
|-------|--------|
| Sales Floor | Emerald |
| Cashier | Indigo |
| Fitting Room | Pink |
| Alteration | Purple |
| Runner | Amber |
| Self Check-Out | Sky |
| Replenishment | Orange |

---

## **6. Branch Strategy**

| Branch | Purpose |
|--------|---------|
| `main` | Full app — Sales, Inventory, Forecast, Roster, DWS, Agent |
| `roster-dws-only` | Stripped build — Roster, DWS, Agent only |

### To update both branches with a doc/config change:
```bash
# 1. Commit change on main
git checkout main
git add <file> && git commit -m "..." && git push

# 2. Merge into roster-dws-only
git checkout roster-dws-only
git merge main
git push
```

Merging is safe — the only differences between branches are the deleted page
files (`SalesPage`, `InventoryPage`, `ForecastPage`) and the trimmed
`App.jsx` / `Sidebar.jsx`.
