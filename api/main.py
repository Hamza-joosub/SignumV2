# api/main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from api.routes import market_data
from api.services.market_service import download_and_save_csv

CSV_PATH = "heatmap_data.csv"
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.path.exists(CSV_PATH):
        download_and_save_csv()
    scheduler.add_job(download_and_save_csv, "cron", hour=21, minute=30)
    scheduler.start()
    yield
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