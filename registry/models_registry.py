# single source of truth for all models
MODELS = [
    {
        "id":           "dcf",
        "name":         "DCF",
        "description":  "Intrinsic value from discounted future cash flows",
        "endpoint":     "/api/models/dcf",
        "assetTypes":   ["stock"],
        "tags":         ["fundamentals", "equity"],
        "defaultTicker":"NVDA",
    },
    {
        "id":           "garch",
        "name":         "GARCH",
        "description":  "Conditional variance forecasting via GARCH(1,1)",
        "endpoint":     "/api/models/garch",
        "assetTypes":   ["stock","crypto","commodity","bond","fx"],
        "tags":         ["quant"],
        "defaultTicker":"NVDA",
    },
]