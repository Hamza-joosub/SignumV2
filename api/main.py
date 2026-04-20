# api/main.py
import os
import time
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone as dt_timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import timezone
from api.routes import market_data
from api.services.market_service import download_and_save_csv
from api.services.cot_service import refresh_cot_data

CSV_PATH = "heatmap_data.csv"
COT_CSV = "cot_clean.csv"
COT_OVERVIEWS = ("cot_overview_13w.json", "cot_overview_26w.json", "cot_overview_52w.json")
scheduler = BackgroundScheduler()


def _utc_now_iso():
    return datetime.now(dt_timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _csv_row_count(path):
    try:
        with open(path) as f:
            return max(sum(1 for _ in f) - 1, 0)
    except Exception:
        return -1


def logged_job(name, fn, stats=None):
    def _run():
        start = time.monotonic()
        print(f"[cron] {name} start utc={_utc_now_iso()}", flush=True)
        try:
            fn()
            duration = time.monotonic() - start
            extra = f" {stats()}" if stats else ""
            print(f"[cron] {name} ok utc={_utc_now_iso()} duration_s={duration:.1f}{extra}", flush=True)
        except Exception as e:
            duration = time.monotonic() - start
            print(f"[cron] {name} FAIL utc={_utc_now_iso()} duration_s={duration:.1f} error={type(e).__name__}: {e}", flush=True)
            traceback.print_exc()
    return _run


def _heatmap_stats():
    return f"rows={_csv_row_count(CSV_PATH)} csv={CSV_PATH}"


def _cot_stats():
    present = [f for f in COT_OVERVIEWS if os.path.exists(f)]
    return f"rows={_csv_row_count(COT_CSV)} csv={COT_CSV} overviews={present}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — everything before yield
    if not os.path.exists(CSV_PATH):
        download_and_save_csv()
    if not os.path.exists(COT_CSV):
        refresh_cot_data()
    if not os.path.exists(COT_CSV):
        refresh_cot_data()

    scheduler.add_job(
        logged_job("heatmap.refresh", download_and_save_csv, stats=_heatmap_stats),
        "cron",
        hour=17, minute=0,
        timezone=timezone("America/New_York"),
    )
    scheduler.add_job(
        logged_job("cot.refresh", refresh_cot_data, stats=_cot_stats),
        "cron",
        day_of_week="fri", hour=22, minute=0,
    )
    scheduler.start()

    yield

    # Shutdown — everything after yield
    scheduler.shutdown()
    

app = FastAPI(lifespan=lifespan)

# allows HTTP requests and stuff
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market_data.router, prefix="/api")

from api.routes import news
app.include_router(news.router, prefix="/api")

from api.routes import registry
app.include_router(registry.router, prefix="/api")

from api.routes import instruments
app.include_router(instruments.router, prefix="/api")

from api.routes import cot_data
app.include_router(cot_data.router, prefix="/api")