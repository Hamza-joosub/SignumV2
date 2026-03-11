# get_instrument_info(), get_chart_data()

import yfinance as yf

def get_asset_type(info: dict, ticker: str) -> str:
    quote_type = info.get("quoteType", "").upper()

    if quote_type == "EQUITY":
        return "stock"
    elif quote_type == "CRYPTOCURRENCY":
        return "crypto"
    elif quote_type == "CURRENCY":
        return "fx"
    elif quote_type in ("FUTURE", "COMMODITY"):
        return "commodity"
    elif quote_type == "ETF":
        # could be a bond ETF or equity ETF — check the name
        name = (info.get("longName") or "").lower()
        if any(w in name for w in ["bond","treasury","gilt","bund","yield","fixed income"]):
            return "bond"
        return "etf"
    elif quote_type == "MUTUALFUND":
        return "fund"
    else:
        return "fx"  # fallback



def get_instrument_info(ticker: str) -> dict:
    t    = yf.Ticker(ticker)
    info = t.info
    asset_type = get_asset_type(info, ticker)

    base = {
    "ticker":    ticker,
    "name":      info.get("longName") or info.get("shortName") or ticker,
    "label":     info.get("symbol") or ticker,
    "assetType": asset_type,
}

    if asset_type == "stock":
        price      = info.get("currentPrice") or info.get("regularMarketPrice", 0)
        prev_close = info.get("previousClose", 0)
        change     = price - prev_close if prev_close else 0
        change_pct = (change / prev_close * 100) if prev_close else 0
        return {**base,
            "price":     round(price, 2),
            "change":    round(change, 2),
            "changePct": round(change_pct, 2),
            "volume":    info.get("volume"),
            "avgVolume": info.get("averageVolume"),
            "marketCap": info.get("marketCap"),
            "high52w":   info.get("fiftyTwoWeekHigh"),
            "low52w":    info.get("fiftyTwoWeekLow"),
            "pe":        info.get("trailingPE"),
            "eps":       info.get("trailingEps"),
        }

    elif asset_type == "crypto":
        price      = info.get("currentPrice") or info.get("regularMarketPrice", 0)
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose", 0)
        change     = price - prev_close if prev_close else 0
        change_pct = (change / prev_close * 100) if prev_close else 0
        return {**base,
            "price":        round(price, 4),
            "change":       round(change, 4),
            "changePct":    round(change_pct, 2),
            "volume":       info.get("volume24Hr"),
            "marketCap":    info.get("marketCap"),
            "circulatingSup": info.get("circulatingSupply"),
            "high52w":      info.get("fiftyTwoWeekHigh"),
            "low52w":       info.get("fiftyTwoWeekLow"),
        }

    elif asset_type == "fx":
        price      = info.get("regularMarketPrice", 0)
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose", 0)
        change     = price - prev_close if prev_close else 0
        change_pct = (change / prev_close * 100) if prev_close else 0
        return {**base,
            "price":     round(price, 4),
            "change":    round(change, 4),
            "changePct": round(change_pct, 2),
            "high52w":   info.get("fiftyTwoWeekHigh"),
            "low52w":    info.get("fiftyTwoWeekLow"),
            "ask":       info.get("ask"),
            "bid":       info.get("bid"),
        }

    elif asset_type == "commodity":
        price      = info.get("regularMarketPrice", 0)
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose", 0)
        change     = price - prev_close if prev_close else 0
        change_pct = (change / prev_close * 100) if prev_close else 0
        return {**base,
            "price":     round(price, 4),
            "change":    round(change, 4),
            "changePct": round(change_pct, 2),
            "volume":    info.get("volume"),
            "high52w":   info.get("fiftyTwoWeekHigh"),
            "low52w":    info.get("fiftyTwoWeekLow"),
            "ask":       info.get("ask"),
            "bid":       info.get("bid"),
        }

    elif asset_type == "bond":
        price      = info.get("regularMarketPrice") or info.get("navPrice", 0)
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose", 0)
        change     = price - prev_close if prev_close else 0
        change_pct = (change / prev_close * 100) if prev_close else 0
        return {**base,
            "price":     round(price, 4),
            "change":    round(change, 4),
            "changePct": round(change_pct, 2),
            "volume":    info.get("volume"),
            "yield":     info.get("yield") or info.get("trailingAnnualDividendYield"),
            "high52w":   info.get("fiftyTwoWeekHigh"),
            "low52w":    info.get("fiftyTwoWeekLow"),
            "navPrice":  info.get("navPrice"),
        }


def get_chart_data(ticker: str, interval: str = "daily") -> dict:
    if interval == "intraday":
        hist = yf.Ticker(ticker).history(period="5d", interval="5m")
    else:
        hist = yf.Ticker(ticker).history(period="5y", interval="1d")

    hist.index = hist.index.tz_localize(None) if hist.index.tzinfo else hist.index

    candles = []
    for ts, row in hist.iterrows():
        candles.append({
            # Unix timestamp for intraday, yyyy-mm-dd string for daily
            "date":   int(ts.timestamp()) if interval == "intraday" else ts.strftime("%Y-%m-%d"),
            "open":   round(float(row["Open"]),  4),
            "high":   round(float(row["High"]),  4),
            "low":    round(float(row["Low"]),   4),
            "close":  round(float(row["Close"]), 4),
            "volume": int(row["Volume"]),
        })

    return { "ticker": ticker, "interval": interval, "candles": candles }
