# /api/instrument/{ticker}
from fastapi import APIRouter, HTTPException
import fastapi
import yfinance as yf
from api.services.instrument_service import get_instrument_info, get_chart_data
# api/routes/instruments.py


router = APIRouter()


@router.get("/instrument/{ticker}")
def instrument_info(ticker: str):
    try:
        return get_instrument_info(ticker)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.get("/chart/{ticker}/daily")
def chart_daily(ticker: str):
    return get_chart_data(ticker, interval="daily")

@router.get("/chart/{ticker}/hourly")
def chart_hourly(ticker: str):
    return get_chart_data(ticker, interval="hourly")

@router.get("/chart/{ticker}/intraday")
def chart_intraday(ticker: str):
    return get_chart_data(ticker, interval="intraday")

