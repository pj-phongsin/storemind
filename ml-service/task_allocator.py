"""
task_allocator.py — P1/P2/P3 staff allocation logic.

Given predicted revenue and available staff count, determines
how many employees to assign to each priority tier.
"""

# Thresholds (AUD daily revenue) for traffic level classification
LOW_THRESHOLD    = 1500
HIGH_THRESHOLD   = 3500

# Allocation ratios [P1, P2, P3] per traffic level and event type
ALLOCATION_RULES = {
    'low':        {'Normal':     (0.50, 0.30, 0.20),
                   'Delivery':   (0.40, 0.45, 0.15),
                   'Sale':       (0.60, 0.25, 0.15),
                   'HighTraffic':(0.65, 0.25, 0.10)},
    'medium':     {'Normal':     (0.55, 0.30, 0.15),
                   'Delivery':   (0.45, 0.40, 0.15),
                   'Sale':       (0.65, 0.25, 0.10),
                   'HighTraffic':(0.70, 0.20, 0.10)},
    'high':       {'Normal':     (0.65, 0.25, 0.10),
                   'Delivery':   (0.55, 0.35, 0.10),
                   'Sale':       (0.75, 0.20, 0.05),
                   'HighTraffic':(0.80, 0.15, 0.05)},
}

TASK_DETAILS = {
    'P1': [
        {'task': 'Cashier (POS)',            'priority': 1},
        {'task': 'Sales Floor Service',       'priority': 1},
        {'task': 'Fitting Room Supervision',  'priority': 1},
    ],
    'P2': [
        {'task': 'Stock Room Replenishment',  'priority': 2},
        {'task': 'Online Order Fulfilment',   'priority': 2},
    ],
    'P3': [
        {'task': 'Folding & Tidying',         'priority': 3},
        {'task': 'General Cleaning',          'priority': 3},
    ],
}


def classify_traffic(predicted_revenue: float) -> str:
    if predicted_revenue < LOW_THRESHOLD:
        return 'low'
    elif predicted_revenue < HIGH_THRESHOLD:
        return 'medium'
    return 'high'


def allocate(predicted_revenue: float, available_staff: int, event_type: str = 'Normal') -> dict:
    """
    Returns recommended staff allocation across P1/P2/P3 tasks.

    Args:
        predicted_revenue: Total predicted revenue for the day (all categories)
        available_staff:   Number of employees scheduled for that day
        event_type:        One of Normal | Delivery | Sale | HighTraffic

    Returns:
        dict with traffic_level, event_type, and per-priority breakdown
    """
    if event_type not in ('Normal', 'Delivery', 'Sale', 'HighTraffic'):
        event_type = 'Normal'

    traffic = classify_traffic(predicted_revenue)
    ratios  = ALLOCATION_RULES[traffic][event_type]  # (p1, p2, p3)

    # Calculate staff counts — ensure P1 gets at least 1, round down P3
    p1_count = max(1, round(available_staff * ratios[0]))
    p2_count = max(0, round(available_staff * ratios[1]))
    p3_count = max(0, available_staff - p1_count - p2_count)

    return {
        'traffic_level':      traffic,
        'event_type':         event_type,
        'predicted_revenue':  round(predicted_revenue, 2),
        'available_staff':    available_staff,
        'allocation': {
            'P1': {'count': p1_count, 'ratio': ratios[0], 'tasks': TASK_DETAILS['P1']},
            'P2': {'count': p2_count, 'ratio': ratios[1], 'tasks': TASK_DETAILS['P2']},
            'P3': {'count': p3_count, 'ratio': ratios[2], 'tasks': TASK_DETAILS['P3']},
        },
        'recommendation': _recommendation(traffic, event_type),
    }


def _recommendation(traffic: str, event_type: str) -> str:
    msgs = {
        ('high',   'Sale'):       'High traffic + Sale event — maximise cashiers and sales floor.',
        ('high',   'HighTraffic'):'Peak day — all critical stations must be fully staffed.',
        ('high',   'Delivery'):   'High traffic with delivery — balance floor coverage and stock room.',
        ('medium', 'Delivery'):   'Moderate traffic — prioritise stock room replenishment today.',
        ('low',    'Normal'):     'Quiet day — good opportunity to schedule folding and cleaning.',
    }
    return msgs.get((traffic, event_type), f'{traffic.capitalize()} traffic — standard {event_type} allocation applied.')
