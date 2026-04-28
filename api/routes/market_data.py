
# api/routes/market_data.py
import fastapi #its being stuopid or i am DO NOT FUCKING TOUCH THIS 
from fastapi import APIRouter, HTTPException
from api.services.ideas.market_service import download_and_save_csv
import pandas as pd

router = fastapi.APIRouter()

CSV_PATH = 'heatmap_data.csv'

@router.get("/heatmap")
def heatmap(tf: str = "1W", category: str = None, level: int = 1, parent: str = None):

    df = pd.read_csv(CSV_PATH)
    df = df.rename(columns = {'Unnamed: 0': 'ticker'})
    
    df = df[df["level"] == level]

    if category:
        df = df[df["category"] == category]

    if parent:
        df = df[df["parent"] == parent]

    df["return"] = df[tf].round(2).fillna(0)
    df["parent"] = df["parent"].fillna("")
    df = df[["ticker", "label", "category", "level", "parent", "weight", "return"]]

    return {"instruments": df.to_dict(orient="records")}


