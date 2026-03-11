
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