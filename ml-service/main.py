"""
main.py — StoreMind ML Service (FastAPI)

Endpoints:
  GET  /health
  GET  /forecast?category=AIRism&days=7
  POST /task-allocation  { predicted_revenue, available_staff, event_type }
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from forecaster import train_models, predict_next_days, predict_all_categories, CATEGORIES
from task_allocator import allocate


@asynccontextmanager
async def lifespan(app: FastAPI):
    print('[startup] Training forecasting models...')
    train_models()
    print('[startup] Ready.')
    yield


app = FastAPI(title='StoreMind ML Service', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get('/health')
def health():
    return {'status': 'ok', 'models_trained': list(CATEGORIES)}


# ─── Demand Forecast ─────────────────────────────────────────────────────────

@app.get('/forecast')
def forecast(
    category: str = Query(default='all', description='Category name or "all"'),
    days:     int = Query(default=7,    ge=1, le=30),
):
    try:
        if category == 'all':
            data = predict_all_categories(days)
        elif category in CATEGORIES:
            data = predict_next_days(category, days)
        else:
            raise HTTPException(status_code=400, detail=f'Unknown category: {category}. Use one of {CATEGORIES} or "all".')
        return {'data': data, 'count': len(data)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Task Allocation ─────────────────────────────────────────────────────────

class AllocationRequest(BaseModel):
    predicted_revenue: float
    available_staff:   int
    event_type:        str = 'Normal'


@app.post('/task-allocation')
def task_allocation(req: AllocationRequest):
    if req.available_staff < 1:
        raise HTTPException(status_code=400, detail='available_staff must be at least 1')
    result = allocate(req.predicted_revenue, req.available_staff, req.event_type)
    return result
