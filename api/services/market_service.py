# api/services/market_service.py

import yfinance as yf
import pandas as pd
from datetime import datetime

# ONLY CHANGE THISSSSS HAMZAAAAA

GROUPS = {
    "stocks": {
        "overview": ["NVDA","AAPL","MSFT","AMZN","GOOG","AVGO","META","TSLA","BRK-B"],
        "full":     ["NVDA","AAPL","MSFT","AMZN","GOOG","AVGO","META","TSLA","BRK-B",
                     "JPM","V","XOM","UNH","JNJ","WMT","PG","MA","HD","CVX",
                     "MRK","ABBV","PEP","KO","BAC","LLY","PFE","TMO","COST","MCD"],
    },
    "fx": {
        "overview": ["EUR=X","JPY=X","GBP=X","CAD=X","CHF=X"],
        "full":     ["EUR=X","JPY=X","GBP=X","CAD=X","CHF=X"],
    },
    "crypto": {
        "overview": ["BTC-USD","ETH-USD","BNB-USD","XRP-USD","SOL-USD"],
        "full":     ["BTC-USD","ETH-USD","BNB-USD","XRP-USD","SOL-USD",
                     "ADA-USD","AVAX-USD","DOGE-USD","DOT-USD","LINK-USD"],
    },
    "commodities": {
        "overview": ["BZ=F","CL=F","GC=F","HG=F","NG=F","ZC=F","ZS=F","SI=F","KE=F","KC=F"],
        "full":     ["BZ=F","CL=F","GC=F","HG=F","NG=F","ZC=F","ZS=F","SI=F","KE=F","KC=F"],
    },
    "bonds": {
        "overview": ["TLT","IEF","MBB","EMB","SHY","SDEU.L","1482.T","IGLT.L"],
        "full":     ["TLT","IEF","MBB","EMB","SHY","SDEU.L","1482.T","IGLT.L"],
    },
}

PERIODS = {
    "1D": 1,
    "1W": 5,
    "1M": 21,
    "3M": 63,
    "1Y": 252,
    "2Y": 504,
    "5Y": 1260,
}


### LEAVEEEE ALONEEEEEEEE PLEAAAASEEEEE
ALL_TICKERS = list({
    t
    for group in GROUPS.values()
    for view in group.values()
    for t in view
})



# start the cache
_cache: dict = {
    "close_prices": {},   # { "NVDA": {"1D": 3.2, "1W": 8.1, ...} } # idk why i called it close prices, should be returns
    "last_updated": None,
    "status":       "empty",
    "error":        None,
}


def _store_close_prices(close_df: pd.DataFrame) -> dict:
    close_prices = {}

    for ticker in close_df.columns:
        close_prices[ticker] = {}
        
        # use raw series without ffill so we can dropna properly
        series = close_df[ticker].dropna()

        for tf, n in PERIODS.items():
            if len(series) < n + 1:
                close_prices[ticker][tf] = 0.0
                continue

            current  = series.iloc[-1]
            previous = series.iloc[-(n + 1)]
            change   = ((current - previous) / previous) * 100
            close_prices[ticker][tf] = round(float(change), 2)

    return close_prices


# ── REFRESH CACHE ──────────────────────────────────────────────────

def refresh_cache() -> None:
    """
    Single yFinance call → populates close_prices cache.
    Called on startup and every 15 minutes by the scheduler.
    """
    global _cache

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Cache refresh starting — {len(ALL_TICKERS)} tickers...")
    _cache["status"] = "loading"

    try:
        raw = yf.download(
            ALL_TICKERS,
            period="5y",
            interval="1d",
            auto_adjust=True,
            progress=False,
            threads=True,
        )

        if raw.empty:
            raise ValueError("yFinance returned empty DataFrame")

        close_df = raw["Close"]

        new_close_prices = _store_close_prices(close_df)

        _cache["close_prices"] = new_close_prices
        _cache["last_updated"] = pd.Timestamp.now()
        _cache["status"]       = "ready"
        _cache["error"]        = None

        print(f"[{datetime.now().strftime('%H:%M:%S')}] Cache ready — {len(new_close_prices)} tickers loaded")

    except Exception as e:
        _cache["status"] = "error"
        _cache["error"]  = str(e)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Cache refresh FAILED: {e}")
        print("Stale cache preserved — continuing to serve last good data")


# ── GET HEATMAP DATA ───────────────────────────────────────────────
from registry.ticker_config import TICKER_LABELS
def get_heatmap_data(asset_class: str = "all", tf: str = "1D", view: str = "overview") -> dict:
    if _cache["status"] == "empty":
        raise Exception("Cache not ready, retry in a moment")

    if asset_class == "all":
        tickers = [t for g in GROUPS.values() for t in g["overview"]]
    else:
        tickers = GROUPS[asset_class][view]

    instruments = []
    for ticker in tickers:
        info = TICKER_LABELS.get(ticker, {})
        instruments.append({
            "ticker": ticker,
            "label":  info.get("label", ticker),
            "full":   info.get("full",  ticker),
            "weight": info.get("weight", 100),
            "return": _cache["close_prices"].get(ticker, {}).get(tf, 0.0),
        })

    return {
        "assetClass":  asset_class,
        "tf":          tf,
        "instruments": instruments,
        "lastUpdated": str(_cache["last_updated"]),
    }


# ── CACHE STATUS ───────────────────────────────────────────────────

def get_cache_status() -> dict:
    return {
        "status":      _cache["status"],
        "lastUpdated": str(_cache["last_updated"]),
        "tickerCount": len(_cache["close_prices"]),
        "error":       _cache["error"],
    }