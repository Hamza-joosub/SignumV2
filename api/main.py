# api/main.py

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from api.routes import market_data
from api.services.market_service import refresh_cache

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    refresh_cache()
    scheduler.add_job(refresh_cache, "interval", minutes=15)
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