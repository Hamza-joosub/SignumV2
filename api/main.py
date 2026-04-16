# api/main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from api.routes import market_data
from api.services.market_service import download_and_save_csv
from api.services.cot_service import refresh_cot_data

CSV_PATH = "heatmap_data.csv"
COT_CSV = "cot_clean.csv"
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — everything before yield
    if not os.path.exists(CSV_PATH):
        download_and_save_csv()
    if not os.path.exists(COT_CSV):
        refresh_cot_data()

    scheduler.add_job(download_and_save_csv, "cron", hour=21, minute=30)
    scheduler.add_job(refresh_cot_data, "cron", day_of_week="fri", hour=22, minute=0)
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