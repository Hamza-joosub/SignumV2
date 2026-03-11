# get_market_news(), get_economic_releases()
import yfinance as yf

NEWS_SOURCES = {
    "crypto":      ["BTC-USD"],
    "commodities": ["GC=F", "CL=F"],
    "bonds":       ["TLT"],
    "fx":          ["EUR=X"],
    "stocks":      ["SPY"],
} #for Market


def get_news(NEWS_SOURCES: dict, num_articles: int) -> dict:
    """
    very unoptimiseedd but works
    needs a dictionary like 
    NEWS_SOURCES = {
    "crypto":      ["BTC-USD"],
    "commodities": ["GC=F", "CL=F"],
    "bonds":       ["TLT"],
    "fx":          ["EUR=X"],
    "stocks":      ["SPY"],
    }
     and outputs a json with eah key being the key in the NEWS_SOURCES dict
     and a list of articles, with each artyicle being a dictioanry 
     if you dont want a category then label it as like Nvidia and the ticker bneing NVDA
    """
    news = {}
    
    for category, tickers in NEWS_SOURCES.items():
        article_list = []
        seen = set()
        
        for ticker in tickers:
            try:
                raw = yf.Ticker(ticker).news
                # cap at available articles to avoid IndexError
                count = min(num_articles, len(raw))
                
                for i in range(count):
                    try:
                        title       = raw[i]['content']['title']
                        pubDate     = raw[i]['content']['pubDate']
                        summary     = raw[i]['content']['summary']
                        displayName = raw[i]['content']['provider']['displayName']
                        
                        # skip duplicates
                        if title in seen:
                            continue
                        seen.add(title)
                        
                        article_list.append({
                            "title":       title,
                            "pubDate":     pubDate,
                            "summary":     summary,
                            "displayName": displayName,
                        })
                    except (KeyError, IndexError) as e:
                        print(f"Article parse error for {ticker}[{i}]: {e}")
                        continue
                        
            except Exception as e:
                print(f"News fetch error for {ticker}: {e}")
                continue
        
        news[category] = article_list
    
    return news


def get_ticker_news(ticker: str, num_articles: int = 5) -> list:
    try:
        raw = yf.Ticker(ticker).news
        count = min(num_articles, len(raw))
        articles = []
        for i in range(count):
            try:
                content     = raw[i]['content']
                provider    = content.get('provider', {})
                articles.append({
                    "title":       content.get('title', ''),
                    "summary":     content.get('summary', ''),
                    "pubDate":     content.get('pubDate', ''),
                    "displayName": provider.get('displayName', ''),
                })
            except (KeyError, IndexError):
                continue
        return articles
    except Exception as e:
        print(f"Ticker news error for {ticker}: {e}")
        return []
