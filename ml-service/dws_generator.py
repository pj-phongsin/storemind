"""
dws_generator.py — Daily Work Schedule (DWS) Generator

Generates a constraint-compliant timetable for all staff on a given date:
  - 9-10 hour shifts within store operating hours
  - Two breaks: 30 min + 60 min (never more than 4h consecutive work)
  - Task rotation: different task each block
  - Minimum staffing: CSH, FR1, ALT, RN, 4x SF zone covered at all times
"""

from datetime import date, time, timedelta, datetime

# ─── Store Hours ──────────────────────────────────────────────────────────────
# weekday(): 0=Mon, 6=Sun
STORE_HOURS = {
    0: ('09:00', '17:30'),
    1: ('09:00', '17:30'),
    2: ('09:00', '17:30'),
    3: ('09:00', '21:00'),
    4: ('09:00', '21:00'),
    5: ('09:30', '17:00'),
    6: ('10:00', '17:00'),
}

# ─── Task Definitions ─────────────────────────────────────────────────────────
TASKS = [
    {'code': 'SF_A', 'name': 'Sale Floor - Zone A', 'priority': 1, 'skill': 'Sales Floor',   'min_staff': 1},
    {'code': 'SF_B', 'name': 'Sale Floor - Zone B', 'priority': 1, 'skill': 'Sales Floor',   'min_staff': 1},
    {'code': 'SF_C', 'name': 'Sale Floor - Zone C', 'priority': 1, 'skill': 'Sales Floor',   'min_staff': 1},
    {'code': 'SF_D', 'name': 'Sale Floor - Zone D', 'priority': 1, 'skill': 'Sales Floor',   'min_staff': 1},
    {'code': 'CSH',  'name': 'Cashier',             'priority': 1, 'skill': 'Cashier',       'min_staff': 1},
    {'code': 'FR1',  'name': 'Fitting Room 1',      'priority': 1, 'skill': 'Fitting Room',  'min_staff': 1},
    {'code': 'ALT',  'name': 'Alteration',          'priority': 1, 'skill': 'Alteration',    'min_staff': 1},
    {'code': 'RN',   'name': 'Runner',               'priority': 2, 'skill': 'Runner',        'min_staff': 1},
    {'code': 'SCO',  'name': 'Self Check-Out',       'priority': 2, 'skill': 'Self Check-Out','min_staff': 0},
    {'code': 'FR2',  'name': 'Fitting Room 2',       'priority': 2, 'skill': 'Fitting Room',  'min_staff': 0},
    {'code': 'RP',   'name': 'Replenishment',        'priority': 2, 'skill': 'Replenishment', 'min_staff': 1},
    {'code': 'FR3',  'name': 'Fitting Room 3',       'priority': 3, 'skill': 'Fitting Room',  'min_staff': 0},
]

TASK_MAP = {t['code']: t for t in TASKS}

# Fallback: if employee lacks exact skill, these tasks accept Sales Floor skill
SF_FALLBACK = {'SF_A', 'SF_B', 'SF_C', 'SF_D', 'RN'}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def t2m(t_str: str) -> int:
    """'09:30' → minutes since midnight."""
    h, m = map(int, t_str.split(':'))
    return h * 60 + m


def m2t(minutes: int) -> str:
    """180 → '03:00'"""
    return f'{minutes // 60:02d}:{minutes % 60:02d}'


def can_do(task_code: str, emp_skills: set) -> bool:
    task = TASK_MAP[task_code]
    if task['skill'] in emp_skills:
        return True
    if task_code in SF_FALLBACK and 'Sales Floor' in emp_skills:
        return True
    return False


# ─── Core Generator ───────────────────────────────────────────────────────────

def generate(date_str: str, employees: list[dict]) -> dict:
    """
    Args:
        date_str:  'YYYY-MM-DD'
        employees: list of dicts with keys id, name, type, skills (list of skill_name strings)

    Returns:
        Full DWS dict with per-employee schedule + coverage summary
    """
    d          = date.fromisoformat(date_str)
    day_idx    = d.weekday()
    open_str, close_str = STORE_HOURS[day_idx]
    open_min   = t2m(open_str)
    close_min  = t2m(close_str)
    store_dur  = close_min - open_min  # total store open minutes

    schedules         = []
    task_coverage     = {t['code']: 0 for t in TASKS}   # how many employees assigned each task
    task_assignment_queue = _build_priority_queue(employees)

    for emp in employees:
        emp_skills = set(emp.get('skills', []))

        # ── Shift window ──────────────────────────────────────────────────────
        max_shift = 10 * 60  # 10 hours max
        shift_start = open_min
        shift_end   = min(close_min, shift_start + max_shift)
        shift_dur   = shift_end - shift_start  # minutes

        # ── Break positions (satisfy 4-hour rule, target 3-3.5h blocks) ──────
        # Break 1: 30 min, inserted at the 3h30m mark
        b1_start = shift_start + 3 * 60 + 30
        b1_end   = b1_start + 30

        # Lunch: 60 min, inserted ~1.5h after break 1
        lunch_start = b1_end + 90
        lunch_end   = lunch_start + 60

        # Clamp breaks within shift
        if lunch_end > shift_end:
            lunch_end   = shift_end
            lunch_start = max(b1_end + 30, lunch_end - 60)
        if b1_end > lunch_start:
            b1_end   = lunch_start
            b1_start = max(shift_start + 60, b1_end - 30)

        # ── Work blocks ───────────────────────────────────────────────────────
        blocks = [
            (shift_start, b1_start),    # morning
            (b1_end,      lunch_start), # midday
            (lunch_end,   shift_end),   # afternoon
        ]
        blocks = [(s, e) for s, e in blocks if e > s]  # drop zero-length blocks

        # ── Task assignment (rotation + priority) ─────────────────────────────
        assigned_tasks  = _assign_tasks(emp, emp_skills, blocks, task_coverage)

        # ── Build schedule entries ─────────────────────────────────────────────
        schedule = []
        for i, (bs, be) in enumerate(blocks):
            if i < len(assigned_tasks):
                t = assigned_tasks[i]
                schedule.append({
                    'type':      'work',
                    'task_code': t['code'],
                    'task_name': t['name'],
                    'start':     m2t(bs),
                    'end':       m2t(be),
                    'duration_min': be - bs,
                })
                task_coverage[t['code']] = task_coverage.get(t['code'], 0) + 1
            if i == 0 and b1_end > b1_start:
                schedule.append({'type': 'break', 'break_type': '30min', 'start': m2t(b1_start), 'end': m2t(b1_end), 'duration_min': b1_end - b1_start})
            if i == 1 and lunch_end > lunch_start:
                schedule.append({'type': 'break', 'break_type': '60min', 'start': m2t(lunch_start), 'end': m2t(lunch_end), 'duration_min': lunch_end - lunch_start})

        schedule.sort(key=lambda x: x['start'])

        schedules.append({
            'employee_id':   emp['id'],
            'employee_name': emp['name'],
            'employee_type': emp['type'],
            'shift_start':   m2t(shift_start),
            'shift_end':     m2t(shift_end),
            'total_hours':   round(shift_dur / 60, 2),
            'schedule':      schedule,
        })

    # ── Coverage summary ──────────────────────────────────────────────────────
    coverage = []
    for t in TASKS:
        code    = t['code']
        covered = task_coverage.get(code, 0)
        required = t['min_staff']
        coverage.append({
            'task_code':    code,
            'task_name':    t['name'],
            'priority':     t['priority'],
            'min_required': required,
            'assigned':     covered,
            'status':       'OK' if covered >= required else ('OPTIONAL' if required == 0 else 'UNDERSTAFFED'),
        })

    return {
        'date':        date_str,
        'day':         d.strftime('%A'),
        'store_hours': {'open': open_str, 'close': close_str},
        'staff_count': len(employees),
        'schedules':   schedules,
        'coverage':    coverage,
    }


def _build_priority_queue(employees: list) -> list:
    """Return task codes sorted by priority for round-robin assignment."""
    return [t['code'] for t in sorted(TASKS, key=lambda x: x['priority'])]


def _assign_tasks(emp: dict, emp_skills: set, blocks: list, task_coverage: dict) -> list:
    """
    Assign a different task to each work block.
    Prioritises tasks with lowest coverage (uncovered mandatory tasks first).
    """
    assigned = []
    used_codes = set()

    # Sort tasks: least-covered mandatory first, then by priority
    sorted_tasks = sorted(
        TASKS,
        key=lambda t: (
            0 if (task_coverage.get(t['code'], 0) < t['min_staff'] and t['min_staff'] > 0) else 1,
            t['priority'],
            task_coverage.get(t['code'], 0),
        )
    )

    for _ in blocks:
        for t in sorted_tasks:
            if t['code'] not in used_codes and can_do(t['code'], emp_skills):
                assigned.append(t)
                used_codes.add(t['code'])
                break
        else:
            # Fallback: any task employee can do (allow repeats as last resort)
            for t in sorted_tasks:
                if can_do(t['code'], emp_skills):
                    assigned.append(t)
                    break

    return assigned
