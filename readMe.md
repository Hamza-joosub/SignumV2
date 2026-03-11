# Why
**Signum Analytics** exists because institutional finance has a dirty secret: the models that move markets aren't actually that complex. A discounted cash flow is arithmetic. A linear regression is a high school formula. GARCH volatility, Monte Carlo simulation, COT analysis — these are all just Python libraries and a bit of logic. The mystique is manufactured, and for too long it's kept retail traders locked out of their own decisions.

The retail trader today is smart. They read the news, they follow the data, they have genuine conviction on markets. What they don't have is five years to master Excel, a Bloomberg terminal, or a finance degree that mostly teaches you to replicate work that Python does in four lines. So they're left making decisions on gut feel, Reddit threads, and charts that tell them nothing about underlying value or structural risk.

Signum closes that gap.

It's a web-based analytical platform that puts a full suite of quantitative and fundamental models — factor scoring, momentum and mean-reversion regimes, volatility forecasting, macro indicators, alternative data signals, valuation frameworks, backtesting tools — directly in the hands of anyone willing to think seriously about a trade. No code. No spreadsheets. No prerequisites. You pick an instrument, you pick a model, and the platform runs the analysis, surfaces the output, and explains what it means.

The interface is intentionally unintimidating but never dumbed down. The complexity is preserved — the Hurst exponent is still a Hurst exponent, a backtest still shows you drawdowns and Sharpe — because the goal isn't to hide the finance. It's to remove the **friction** between a curious trader and a legitimate analytical framework.

The niche is the gap between a retail brokerage app and a professional terminal. One tells you nothing. The other costs $25,000 a year and assumes you already know everything. Signum sits exactly between them — sophisticated enough to be trusted, accessible enough to be actually used.

# Tehcincals
## Backend
Backend — FastAPI + yFinanceThe API is built in FastAPI, deployed on Railway. It's structured around four core route modules:
+ /api/heatmap — fetches a configurable set of instruments across all five asset classes, computes percentage returns for a given timeframe (1D through 5Y), normalises weights for treemap sizing, and returns a ranked instrument list. The same endpoint accepts an asset_class path parameter for the Category view and a ?view=full flag for expanded data.
+ /api/instrument/{ticker} — pulls full quote data for a single instrument via yFinance, detects asset type (stock, crypto, FX, commodity, bond/ETF), and returns typed metadata: market cap, P/E, bid/ask, yield, NAV, circulating supply depending on what's relevant.
+ /api/chart/{ticker}/{interval} — returns OHLCV candle arrays in three pre-fetched resolutions: intraday (5-minute bars), hourly, and daily. The frontend slices the appropriate array client-side based on the selected period, which avoids repeated API calls on period switches.
+ /api/news/{ticker} — fetches and surfaces news articles with title, summary, source, and publication date. The Category page fans this out across up to ten tickers per asset class in parallel using Promise.allSettled, merges and deduplicates by title, and sorts by recency.
APScheduler runs in the background to handle cache warming. CORS is currently open for development; the plan is to lock it to the Vercel domain before any public launch.

## Frontend — React + Vite
The frontend is a React SPA deployed on Vercel, routing via React Router. Environment-based API URLs are injected at build time through Vite's import.meta.env.VITE_API_URL.

The design system is centralised in a single tokens.js file that exports a G object covering every colour, surface, border, and text value. The file contains two complete theme blocks — light and dark — and switching between them is a single line change. Every component across every page imports G directly, so the entire UI responds to the swap with no component-level changes.

+ Markets page uses Recharts Treemap with a fully custom SVG content renderer (HeatCell) — no default Recharts cell styling at all. Cell colour is computed dynamically from return magnitude against a per-timeframe cap, producing a green-red intensity gradient. Tooltip is also a custom component. Heights are fixed pixel values passed as props, which is a deliberate constraint: Recharts ResponsiveContainer breaks if it receives calc() strings or percentage heights.
+ Instrument page uses lightweight-charts for the price chart — a canvas-based library built by TradingView, chosen over Recharts for performance and the quality of financial chart rendering. Three data resolutions are fetched in parallel on mount and stored in state. Period switching just re-slices the already-loaded array, making it instantaneous. The chart instance is managed via refs with a ResizeObserver for responsive width.
+ Category page fetches news for up to ten tickers simultaneously using Promise.allSettled — fulfilled results are flattened, deduplicated by title, and sorted by date. The heatmap uses calc(90vh - 280px) with min and max height constraints, giving it a viewport-fitted feel that adapts to different screen sizes without layout reflow.
+ The nav is consistent across all inner pages — charcoal dark bar, Playfair Display logotype, ticker search input that navigates on Enter. The breadcrumb bar sits below the nav on every page with the timeframe selector right-aligned, keeping the main content area completely clean.
+ Typography is a deliberate three-font system: Playfair Display for all editorial headings, DM Sans for body and UI, DM Mono for all data, numbers, labels and codes — reinforcing a visual hierarchy that separates narrative from data at a glance.


# The Idea
models/      → pure Python logic, no FastAPI, no HTTP
api/routes/  → HTTP layer only, imports from models/ and services/
api/services/→ data fetching (yFinance calls), called by routes
registry/    → config only, no logic

# File System
quantlab/
│
├── models/                        # your existing model .py files
│   ├── dcf.py
│   ├── garch.py
│   ├── multiples.py
│   └── monte_carlo.py
│
├── api/                           # NEW — all FastAPI stuff lives here
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, CORS, mounts all routers
│   ├── routes/                    # one file per domain
│   │   ├── __init__.py
│   │   ├── market_data.py         # /api/returns, /api/chart, /api/strip
│   │   ├── instruments.py         # /api/instrument/{ticker}
│   │   ├── news.py                # /api/news, /api/news/{ticker}, /api/releases
│   │   └── model_routes.py        # /api/models/dcf, /api/models/garch etc
│   └── services/                  # data fetching logic, called by routes
│       ├── __init__.py
│       ├── market_service.py      # calculate_all_returns(), get_strip_data()
│       ├── instrument_service.py  # get_instrument_info(), get_chart_data()
│       └── news_service.py        # get_market_news(), get_economic_releases()
│
├── registry/                      # NEW — models registry lives here
│   ├── __init__.py
│   └── models_registry.py         # single source of truth for all models
│
├── data/                          # optional — cache, CSVs, saved outputs
│
└── frontend/                      # your React app (or separate repo)

# Navigations
### For Models
React           makes a fetch request
    ↓
Routes          receives the HTTP request, validates params
    ↓
Services        fetches/calculates the data (yFinance, cache)
    ↓
Models          only hit when running a model (DCF, GARCH etc)
    ↓
Services        packages the result
    ↓
Routes          returns JSON response
    ↓
React           receives JSON, updates the UI

## For Models
React           makes a fetch request
    ↓
Routes          receives the HTTP request, validates params
    ↓
Services        fetches/calculates the data (yFinance, cache) and packages the result       
    ↓
Routes          returns JSON response
    ↓
React           receives JSON, updates the UI

# terminal Commands
npm install recharts

### Start Front End
conda activate quantlab
cd /Users/hamza/Documents/SideQuests/SignumV2/frontend
npm run dev

### Start Backend
conda activate quantlab
cd /Users/hamza/Documents/SideQuests/SignumV2
uvicorn api.main:app --reload