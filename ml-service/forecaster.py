"""
forecaster.py — Demand forecasting using Random Forest.

Loads 1 year of sales from MySQL, trains one model per category,
and predicts total revenue for the next N days.
"""

import os
import numpy as np
import pandas as pd
from datetime import date, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import mysql.connector
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

CATEGORIES = ['AIRism', 'Heattech', 'Outerwear', 'Tops']


def _get_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'storemind'),
    )


def _load_sales_df():
    """Load daily aggregated sales from DB into a DataFrame."""
    conn = _get_connection()
    query = """
        SELECT DATE(s.sale_date) AS sale_date,
               p.category,
               SUM(s.total_amount) AS revenue,
               SUM(s.quantity_sold) AS units
        FROM sales s
        JOIN products p ON p.id = s.product_id
        GROUP BY DATE(s.sale_date), p.category
        ORDER BY sale_date
    """
    df = pd.read_sql(query, conn)
    conn.close()
    df['sale_date'] = pd.to_datetime(df['sale_date'])
    return df


def _build_features(df):
    """Engineer time-based features for the model."""
    df = df.copy()
    df['day_of_week'] = df['sale_date'].dt.dayofweek      # 0=Mon
    df['day_of_year'] = df['sale_date'].dt.dayofyear
    df['month']       = df['sale_date'].dt.month
    df['week']        = df['sale_date'].dt.isocalendar().week.astype(int)
    # 7-day rolling average of revenue (lag to avoid leakage)
    df['rolling_7d']  = df['revenue'].shift(1).rolling(7, min_periods=1).mean()
    df = df.dropna()
    return df


FEATURE_COLS = ['day_of_week', 'day_of_year', 'month', 'week', 'rolling_7d']

# Cache trained models so we don't retrain on every request
_models: dict[str, RandomForestRegressor] = {}


def train_models():
    """Train one Random Forest per category. Called once at startup."""
    global _models
    df = _load_sales_df()
    for cat in CATEGORIES:
        cat_df = df[df['category'] == cat].copy().reset_index(drop=True)
        cat_df = _build_features(cat_df)
        X = cat_df[FEATURE_COLS]
        y = cat_df['revenue']
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        _models[cat] = {'model': model, 'last_row': cat_df.iloc[-1]}
    print(f'[forecaster] Models trained for: {list(_models.keys())}')


def predict_next_days(category: str, days: int = 7) -> list[dict]:
    """Return predicted daily revenue for the next `days` days."""
    if category not in _models:
        raise ValueError(f'Unknown category: {category}')

    entry   = _models[category]
    model   = entry['model']
    rolling = float(entry['last_row']['rolling_7d'])

    predictions = []
    today = date.today()

    for i in range(1, days + 1):
        target = today + timedelta(days=i)
        row = {
            'day_of_week': target.weekday(),
            'day_of_year': target.timetuple().tm_yday,
            'month':       target.month,
            'week':        int(target.strftime('%V')),
            'rolling_7d':  rolling,
        }
        X = pd.DataFrame([row])[FEATURE_COLS]
        pred = float(model.predict(X)[0])
        rolling = (rolling * 6 + pred) / 7  # update rolling average
        predictions.append({
            'date':     target.isoformat(),
            'category': category,
            'predicted_revenue': round(pred, 2),
        })

    return predictions


def predict_all_categories(days: int = 7) -> list[dict]:
    """Return predictions for all categories combined."""
    results = []
    for cat in CATEGORIES:
        results.extend(predict_next_days(cat, days))
    return results
