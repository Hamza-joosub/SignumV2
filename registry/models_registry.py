# single source of truth for all models
MODELS = [
    {
        "id":           "cot",
        "name":         "COT Positioning",
        "description":  "CFTC Commitments of Traders — positioning, crowding, and divergence signals",
        "endpoint":     "/api/cot/instrument",
        "assetTypes":   ["stock","crypto","bond","fx", "etf"],
        "tags":         ["macro"],
        "defaultTicker":"SP500",
    },
]