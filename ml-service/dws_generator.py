"""
dws_generator.py — Daily Work Schedule (DWS) Generator

Architecture: period-first scheduling with preference-weighted single pass.

Shift structure (employees are assigned templates round-robin):
  Opening  (all days)   : 07:30-16:30, 08:30-17:30
  Mid      (Thu/Fri)    : 10:00-18:30, 11:00-20:00, 12:30-21:00
  Closing  (Thu/Sat)    : 10:00-18:30, 13:30-22:00
  Sunday only           : 09:00-18:00, 09:30-18:00

Any staff time before store open or after store close is automatically
assigned 'TIDY' (tidying the sales floor / preparing the store).
"""

from datetime import date as _date

# ─── Store customer-facing hours (spec-v2) ────────────────────────────────────
STORE_HOURS = {
    0: ('09:00', '17:30'),  # Mon
    1: ('09:00', '17:30'),  # Tue
    2: ('09:00', '17:30'),  # Wed
    3: ('09:00', '21:00'),  # Thu
    4: ('09:00', '21:00'),  # Fri
    5: ('09:30', '17:00'),  # Sat
    6: ('10:00', '17:00'),  # Sun
}

# ─── Shift templates available per day of week ────────────────────────────────
_OPENING     = [('07:30', '16:30'), ('08:30', '18:30')]
_OPENING_SAT = [('07:30', '16:30'), ('08:30', '18:00')]   # capped at 18:00 (store close 17:00 + 1h Tidy)
_MID         = [('10:00', '18:30'), ('11:00', '20:00'), ('12:30', '21:00')]
_CLOSING_THU = [('10:00', '18:30'), ('13:30', '22:00')]
_CLOSING_SAT = [('10:00', '18:00')]                        # capped at 18:00
_SUNDAY      = [('09:00', '18:00'), ('09:30', '18:00')]

DAY_SHIFT_TEMPLATES = {
    0: _OPENING,
    1: _OPENING,
    2: _OPENING,
    3: _OPENING + _MID + _CLOSING_THU,
    4: _OPENING + _MID,
    5: _OPENING_SAT + _CLOSING_SAT,
    6: _SUNDAY,
}

# ─── Break patterns per shift template ────────────────────────────────────────
# Three (lunch_offset_min, short_break_offset_min) tuples per template.
# Employees on the same template cycle through them to stagger breaks.
TEMPLATE_BREAKS = {
    ('07:30', '16:30'): [(210, 390), (240, 420), (270, 450)],  # lunch 11:00/11:30/12:00
    ('08:30', '17:30'): [(150, 330), (180, 360), (210, 390)],  # lunch 11:00/11:30/12:00
    ('08:30', '18:00'): [(150, 330), (180, 360), (210, 390)],  # lunch 11:00/11:30/12:00 — Sat (post-close Tidy 17:00-18:00)
    ('08:30', '18:30'): [(150, 330), (180, 360), (210, 390)],  # lunch 11:00/11:30/12:00 — Mon-Fri (post-close Tidy 17:30-18:30)
    ('10:00', '18:00'): [(120, 300), (150, 330), (180, 360)],  # lunch 12:00/12:30/13:00 — Sat closing
    ('10:00', '18:30'): [(120, 300), (150, 330), (180, 360)],  # lunch 12:00/12:30/13:00
    ('11:00', '20:00'): [(120, 300), (150, 330), (180, 360)],  # lunch 13:00/13:30/14:00
    ('12:30', '21:00'): [(90,  270), (120, 300), (150, 330)],  # lunch 14:00/14:30/15:00
    ('13:30', '22:00'): [(90,  270), (120, 300), (150, 330)],  # lunch 15:00/15:30/16:00
    ('09:00', '18:00'): [(150, 330), (180, 360), (210, 390)],  # lunch 11:30/12:00/12:30
    ('09:30', '18:00'): [(120, 300), (150, 330), (180, 360)],  # lunch 11:30/12:00/12:30
}

# ─── Task definitions ─────────────────────────────────────────────────────────
TASKS = [
    {'code': 'SF_A', 'name': 'Sale Floor - Zone A', 'priority': 1, 'skill': 'Sales Floor',    'min_staff': 1, 'max_staff': 1},
    {'code': 'SF_B', 'name': 'Sale Floor - Zone B', 'priority': 1, 'skill': 'Sales Floor',    'min_staff': 1, 'max_staff': 1},
    {'code': 'SF_C', 'name': 'Sale Floor - Zone C', 'priority': 1, 'skill': 'Sales Floor',    'min_staff': 1, 'max_staff': 1},
    {'code': 'SF_D', 'name': 'Sale Floor - Zone D', 'priority': 1, 'skill': 'Sales Floor',    'min_staff': 1, 'max_staff': 1},
    {'code': 'CSH',  'name': 'Cashier',              'priority': 1, 'skill': 'Cashier',        'min_staff': 1, 'max_staff': 1},
    {'code': 'FR1',  'name': 'Fitting Room 1',       'priority': 1, 'skill': 'Fitting Room',   'min_staff': 1, 'max_staff': 1},
    {'code': 'ALT',  'name': 'Alteration',           'priority': 1, 'skill': 'Alteration',     'min_staff': 1, 'max_staff': 1},
    {'code': 'RN',   'name': 'Runner',                'priority': 2, 'skill': 'Runner',         'min_staff': 1, 'max_staff': 2},
    {'code': 'SCO',  'name': 'Self Check-Out',        'priority': 2, 'skill': 'Self Check-Out', 'min_staff': 0, 'max_staff': 1},
    {'code': 'FR2',  'name': 'Fitting Room 2',        'priority': 2, 'skill': 'Fitting Room',   'min_staff': 0, 'max_staff': 1},
    {'code': 'RP',   'name': 'Replenishment',         'priority': 2, 'skill': 'Replenishment',  'min_staff': 1, 'max_staff': 2},
    {'code': 'FR3',  'name': 'Fitting Room 3',        'priority': 3, 'skill': 'Fitting Room',   'min_staff': 0, 'max_staff': 1},
]

TASK_MAP = {t['code']: t for t in TASKS}

SF_FALLBACK   = {'SF_A', 'SF_B', 'SF_C', 'SF_D', 'RN', 'RP'}
MAX_BLOCK_MIN = 120   # target task duration before rotating
MIN_BLOCK_MIN = 60    # minimum period length that qualifies as a rotation point
FORCE_ROTATE_MIN = 4 * 60  # hard 4-hour rule: always rotate after this


# ─── Helpers ──────────────────────────────────────────────────────────────────

def t2m(s: str) -> int:
    h, m = map(int, s.split(':'))
    return h * 60 + m


def m2t(n: int) -> str:
    return f'{n // 60:02d}:{n % 60:02d}'


def can_do(code: str, skills: set) -> bool:
    task = TASK_MAP[code]
    if task['skill'] in skills:
        return True
    if code in SF_FALLBACK and 'Sales Floor' in skills:
        return True
    return False


def _merge_slots(slots: list) -> list:
    """Merge consecutive same-task/prep slots into single blocks."""
    if not slots:
        return []
    out = [dict(slots[0])]
    for s in slots[1:]:
        last = out[-1]
        same_task = (
            s['task_code'] == last['task_code']
            and s['start'] == last['end']
        )
        if same_task:
            last['end'] = s['end']
            last['duration_min'] += s['duration_min']
        else:
            out.append(dict(s))
    return out


# ─── Core Generator ───────────────────────────────────────────────────────────

def generate(date_str: str, employees: list[dict]) -> dict:
    d = _date.fromisoformat(date_str)
    day_idx              = d.weekday()
    open_str, close_str  = STORE_HOURS[day_idx]
    open_min             = t2m(open_str)
    close_min            = t2m(close_str)

    templates = DAY_SHIFT_TEMPLATES[day_idx]

    # ── Step 1: build per-employee state ──────────────────────────────────────
    template_counts: dict[tuple, int] = {}
    emp_states: list[dict] = []

    for i, emp in enumerate(employees):
        tmpl    = templates[i % len(templates)]
        s_start = t2m(tmpl[0])
        s_end   = t2m(tmpl[1])

        idx     = template_counts.get(tmpl, 0)
        template_counts[tmpl] = idx + 1
        ln_off, sh_off = TEMPLATE_BREAKS[tmpl][idx % len(TEMPLATE_BREAKS[tmpl])]

        ln_s = s_start + ln_off;  ln_e = ln_s + 60
        sh_s = s_start + sh_off;  sh_e = sh_s + 30

        if ln_e > s_end:
            ln_e = s_end;  ln_s = max(s_start + 60, ln_e - 60)
        if sh_e > s_end:
            sh_e = s_end;  sh_s = max(ln_e + 30, sh_e - 30)
        if sh_s < ln_e:
            sh_s = ln_e + 30;  sh_e = sh_s + 30
        if sh_e > s_end:
            sh_e = s_end

        emp_states.append({
            'emp':         emp,
            'shift_start': s_start,
            'shift_end':   s_end,
            'breaks':      [(ln_s, ln_e, '60min'), (sh_s, sh_e, '30min')],
            'work_slots':  [],
            'cur_code':    None,
            'cur_mins':    0,
            'recent':      [],
        })

    # ── Step 2: time-period boundaries ────────────────────────────────────────
    bounds: set[int] = {open_min, close_min}
    for es in emp_states:
        bounds.add(es['shift_start']);  bounds.add(es['shift_end'])
        for bs, be, _ in es['breaks']:
            bounds.add(bs);  bounds.add(be)
    cur = open_min
    while cur <= close_min:
        bounds.add(cur);  cur += MAX_BLOCK_MIN
    sorted_bounds = sorted(bounds)

    # ── Step 3: period-by-period assignment ───────────────────────────────────
    for idx in range(len(sorted_bounds) - 1):
        p_s   = sorted_bounds[idx]
        p_e   = sorted_bounds[idx + 1]
        p_len = p_e - p_s
        if p_len <= 0:
            continue

        # Determine which employees are active (not on break) this period
        available: list[dict] = []
        for es in emp_states:
            if es['shift_start'] > p_s or es['shift_end'] < p_e:
                continue
            on_break = any(bs <= p_s and be >= p_e for bs, be, _ in es['breaks'])
            if on_break:
                es['cur_code'] = None;  es['cur_mins'] = 0
            else:
                available.append(es)

        if not available:
            continue

        # ── PREP period: before store open or after store close ────────────
        is_prep = p_e <= open_min or p_s >= close_min
        if is_prep:
            for es in available:
                es['work_slots'].append({
                    'type': 'work', 'task_code': 'TIDY',
                    'task_name': 'Tidy',
                    'start': m2t(p_s), 'end': m2t(p_e),
                    'duration_min': p_len,
                })
                # Reset stickiness so first real period starts fresh
                es['cur_code'] = None
                es['cur_mins'] = 0
            continue

        # ── Regular period: assign tasks ───────────────────────────────────
        period_cov: dict[str, int] = {}

        # Employees with an active preferred task go first so they can claim
        # their slot before free employees take it.
        available.sort(key=lambda es: (0 if es['cur_code'] else 1))

        for es in available:
            skills = set(es['emp'].get('skills', []))
            recent = set(es['recent'][-4:])

            # Only rotate when the current period is long enough to start a
            # meaningful new block (MIN_BLOCK_MIN), or when the 4-hour hard
            # limit is hit. On short filler periods keep the current task.
            at_rotation_point = (
                es['cur_mins'] >= FORCE_ROTATE_MIN
                or (es['cur_mins'] >= MAX_BLOCK_MIN and p_len >= MIN_BLOCK_MIN)
            )
            preferred = None if at_rotation_point else es['cur_code']

            def _key(t: dict) -> tuple:
                mand_uncov = int(not (
                    t['min_staff'] > 0
                    and period_cov.get(t['code'], 0) < t['min_staff']
                ))
                is_pref = 0 if t['code'] == preferred else 1
                return (mand_uncov, t['priority'], period_cov.get(t['code'], 0), is_pref)

            def _pick(allow_recent: bool, ignore_cap: bool):
                for t in sorted(TASKS, key=_key):
                    if not can_do(t['code'], skills):
                        continue
                    if not ignore_cap and period_cov.get(t['code'], 0) >= t['max_staff']:
                        continue
                    if t['code'] != preferred and not allow_recent and t['code'] in recent:
                        continue
                    return t
                return None

            chosen = (
                _pick(False, False)
                or _pick(True,  False)
                or _pick(False, True)
                or _pick(True,  True)
            )

            if chosen:
                period_cov[chosen['code']] = period_cov.get(chosen['code'], 0) + 1
                if chosen['code'] == es['cur_code']:
                    es['cur_mins'] += p_len
                else:
                    es['cur_code'] = chosen['code']
                    es['cur_mins'] = p_len
                es['work_slots'].append({
                    'type': 'work', 'task_code': chosen['code'],
                    'task_name': chosen['name'],
                    'start': m2t(p_s), 'end': m2t(p_e),
                    'duration_min': p_len,
                })
                es['recent'].append(chosen['code'])

    # ── Step 4: assemble final schedule ───────────────────────────────────────
    schedules = []
    task_coverage: dict[str, int] = {t['code']: 0 for t in TASKS}

    for es in emp_states:
        merged = _merge_slots(es['work_slots'])
        for slot in merged:
            if slot['task_code'] != 'TIDY':
                task_coverage[slot['task_code']] = task_coverage.get(slot['task_code'], 0) + 1

        schedule = list(merged)
        for bs, be, btype in es['breaks']:
            if be > bs:
                schedule.append({
                    'type': 'break', 'break_type': btype,
                    'start': m2t(bs), 'end': m2t(be),
                    'duration_min': be - bs,
                })
        schedule.sort(key=lambda x: x['start'])

        emp   = es['emp']
        s_dur = es['shift_end'] - es['shift_start']
        schedules.append({
            'employee_id':   emp['id'],
            'employee_name': emp['name'],
            'employee_type': emp['type'],
            'shift_start':   m2t(es['shift_start']),
            'shift_end':     m2t(es['shift_end']),
            'total_hours':   round(s_dur / 60, 2),
            'schedule':      schedule,
        })

    # ── Step 5: coverage summary ──────────────────────────────────────────────
    coverage = []
    for t in TASKS:
        code    = t['code']
        covered = task_coverage.get(code, 0)
        req     = t['min_staff']
        coverage.append({
            'task_code':    code,
            'task_name':    t['name'],
            'priority':     t['priority'],
            'min_required': req,
            'assigned':     covered,
            'status': (
                'OK'           if covered >= req else
                'OPTIONAL'     if req == 0       else
                'UNDERSTAFFED'
            ),
        })

    return {
        'date':        date_str,
        'day':         d.strftime('%A'),
        'store_hours': {'open': open_str, 'close': close_str},
        'staff_count': len(employees),
        'schedules':   schedules,
        'coverage':    coverage,
        'generated':   True,
    }
