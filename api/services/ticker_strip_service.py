import yfinance as yf

TICKERS = {
    "NVDA" : "Nvidia",
    "AAPL" : "Apple",
    "BTC-USD" : "Bitcoin",
    "ETH-USD" : "Ethereum",
    "GC=F" : "Gold",
    "CL=F" : "Crude Oil",
        }

df = yf.download(tickers=list(TICKERS.keys()), auto_adjust=True, progress=False)
print(df)
df = yf.pct_change()
df = yf.ffill()
print(df)