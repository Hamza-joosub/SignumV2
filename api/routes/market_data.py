# /api/returns, /api/chart, /api/strip

# api/routes/market_data.py
import fastapi #its being stuopid or i am DO NOT FUCKING TOUCH THIS 
from fastapi import APIRouter, HTTPException
from api.services.market_service import get_heatmap_data, get_cache_status

router = fastapi.APIRouter()

@router.get("/heatmap")
def all_markets(tf: str = "1D"):
    try:
        return get_heatmap_data(asset_class="all", tf=tf, view="overview")
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.get("/heatmap/{asset_class}")
def single_category(asset_class: str, tf: str = "1D", view: str = "overview"):
    try:
        return get_heatmap_data(asset_class=asset_class, tf=tf, view=view)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.get("/status")
def cache_status():
    return get_cache_status()