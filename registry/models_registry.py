# single source of truth for all models
MODELS = [
    {
        "id":           "cot",
        "name":         "Financial COT Positioning",
        "description":  "CFTC Traders in Financial Futures — Dealer, Asset Manager, and Hedge Fund positioning across equity indices, rates, FX, and crypto. Percentile ranks, concentration, and 1W / 1M change.",
        "endpoint":     "/api/cot/overview",
        "assetTypes":   ["stock","crypto","bond","fx","etf"],
        "tags":         ["macro"],
        "defaultTicker":"SP500",
    },
    {
        "id":           "cot-commodity",
        "name":         "Commodity COT Positioning",
        "description":  "CFTC Disaggregated Commitments of Traders — Money Manager, Producer/Merchant, Swap Dealer, and Other Reportable positioning across 19 physical commodities (energy, metals, grains, softs, livestock). Percentile ranks, spread-activity flags, and open interest context.",
        "endpoint":     "/api/commodity_cot/overview",
        "assetTypes":   ["commodity"],
        "tags":         ["macro"],
        "defaultTicker":"Gold",
    },
]