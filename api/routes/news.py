# /api/news, /api/news/{ticker}, /api/releases
from fastapi import APIRouter, HTTPException
from api.services.news_service import get_news
import fastapi
from fastapi import APIRouter, HTTPException
from urllib.parse import unquote
from api.services.news_service import get_news, get_ticker_news

router = APIRouter()

MARKET_MAP_NEWS_SOURCES = {
    "general":     ["SPY", "QQQ"],
    "crypto":      ["BTC-USD"],
    "commodities": ["GC=F", "CL=F"],
    "bonds":       ["TLT"],
    "fx":          ["EUR=X"],
    "stocks":      ["SPY"],
}

@router.get("/news")
def market_news(num_aricles: int = 1):
    try:
        return get_news(MARKET_MAP_NEWS_SOURCES, num_aricles)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))



from urllib.parse import unquote

@router.get("/news/{ticker:path}")
def ticker_news(ticker: str, num_articles: int = 5):
    from urllib.parse import unquote
    ticker = unquote(ticker)
    print(f"Fetching news for: {ticker}")  # add this
    try:
        result = get_ticker_news(ticker, num_articles)
        print(f"Result: {result}")          # add this
        return result
    except Exception as e:
        print(f"ERROR: {e}")               # add this
        raise HTTPException(status_code=503, detail=str(e))
