from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from db import create_connection
from models import Expense
from typing import List
import datetime
from collections import defaultdict
import re  # Needed for cleaning merchant text

app = FastAPI()

# ✅ Enable CORS so React frontend can access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Can restrict to ["http://localhost:3000"] later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Root health check
@app.get("/")
def read_root():
    return {"status": "ok"}

# ✅ Get all expenses, clean up merchant text
@app.get("/expenses", response_model=List[Expense])
def get_expenses():
    conn = create_connection()
    c = conn.cursor()
    c.execute("SELECT date, amount, merchant FROM expenses ORDER BY date DESC")
    rows = c.fetchall()
    conn.close()

    cleaned = []
    for row in rows:
        date, amount, merchant = row
        merchant = re.sub(
            r"If unauthorised.*?digibank\.", "", merchant, flags=re.IGNORECASE
        ).strip()
        cleaned.append(Expense(date=date, amount=amount, merchant=merchant))

    return cleaned

# ✅ Monthly summary
@app.get("/expenses/by-month")
def get_expenses_by_month(year: int = Query(...)):
    conn = create_connection()
    c = conn.cursor()
    c.execute("SELECT date, amount FROM expenses")
    rows = c.fetchall()
    conn.close()

    monthly_totals = defaultdict(float)
    for row in rows:
        try:
            dt = datetime.datetime.strptime(row[0], "%d %b %Y")
            if dt.year == year:
                month = dt.strftime("%b")
                monthly_totals[month] += row[1]
        except:
            continue

    month_order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    result = [
        {"month": m, "total": round(monthly_totals[m], 2)} for m in month_order if m in monthly_totals
    ]
    return result
