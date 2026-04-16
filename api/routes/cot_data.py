from fastapi import APIRouter
import pandas as pd
import numpy as np
from api.services.cot_service import TICKER_MAP
import json
import os

router = APIRouter()

COT_CSV = "cot_clean.csv"
COT_INSIGHTS = "cot_insights.json"



@router.get("/cot/instruments")
def list_instruments():
    if not os.path.exists(COT_CSV):
        return {"instruments": []}

    df = pd.read_csv(COT_CSV)
    df['Report_Date_as_MM_DD_YYYY'] = pd.to_datetime(df['Report_Date_as_MM_DD_YYYY'])

    instruments = []
    for inst, group in df.groupby('Instrument'):
        latest = group.iloc[-1]
        instruments.append({
            "instrument": inst,
            "ticker": TICKER_MAP.get(inst, ''),
            "latest_date": latest['Report_Date_as_MM_DD_YYYY'].strftime('%Y-%m-%d'),
            "open_interest": int(latest['Open_Interest_All']),
        })

    return {"instruments": instruments}

import math

def clean_for_json(obj):
    """Replace NaN/Inf with None recursively so JSON serialization works"""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_for_json(v) for v in obj]
    return obj


@router.get("/cot/instrument")
def cot_instrument(instrument: str = "SP500"):
    if not os.path.exists(COT_CSV):
        return {"error": "COT data not loaded yet", "insights": [], "tail": []}

    # ── READ DATA ─────────────────────────────────────────────
    df = pd.read_csv(COT_CSV)
    df['Report_Date_as_MM_DD_YYYY'] = pd.to_datetime(df['Report_Date_as_MM_DD_YYYY'])
    df = df[df['Instrument'] == instrument]

    if df.empty:
        return {"error": f"Instrument '{instrument}' not found", "insights": [], "tail": []}

    latest = df.iloc[-1]
    dates = df['Report_Date_as_MM_DD_YYYY'].dt.strftime('%Y-%m-%d').tolist()

    # ── READ PRE-COMPUTED INSIGHTS ────────────────────────────
    inst_insights = []
    if os.path.exists(COT_INSIGHTS):
        with open(COT_INSIGHTS, 'r') as f:
            all_insights = json.load(f)
        inst_insights = [i for i in all_insights if i['instrument'] == instrument]

    # ── SUMMARY ───────────────────────────────────────────────
    summary = {
        "instrument": instrument,
        "ticker": TICKER_MAP.get(instrument, ''),
        "latest_date": latest['Report_Date_as_MM_DD_YYYY'].strftime('%Y-%m-%d'),
        "open_interest": int(latest['Open_Interest_All']),
        "dealer_net": int(latest['Dealer Net']),
        "am_net": int(latest['Asset Manager Net']),
        "hf_net": int(latest['Levered Net']),
    }

    # ── MAIN CHART: NET POSITIONING ───────────────────────────
    main_chart = {
        "dates": dates,
        "dealer_net": df['Dealer Net'].tolist(),
        "am_net": df['Asset Manager Net'].tolist(),
        "hf_net": df['Levered Net'].tolist(),
        "price": df['Price'].tolist() if 'Price' in df.columns else [],
    }

    # ── PROPORTIONS ───────────────────────────────────────────
    proportions = {
        "dates": dates,
        "dealer_long_prop": df['Dealer Long Proportion'].tolist(),
        "am_long_prop": df['Asset Manager Long Proportion'].tolist(),
        "hf_long_prop": df['Levered Long Proportion'].tolist(),
        "dealer_short_prop": df['Dealer Short Proportion'].tolist(),
        "am_short_prop": df['Asset Manager Short Proportion'].tolist(),
        "hf_short_prop": df['Levered Short Proportion'].tolist(),
    }

    # ── RATIOS ────────────────────────────────────────────────
    df_ratios = df[['Dealer Ratio', 'Asset Manager Ratio', 'Levered Ratio']].replace([np.inf, -np.inf], None)
    ratios = {
        "dates": dates,
        "dealer_ratio": df_ratios['Dealer Ratio'].tolist(),
        "am_ratio": df_ratios['Asset Manager Ratio'].tolist(),
        "hf_ratio": df_ratios['Levered Ratio'].tolist(),
    }

    # ── CROWDING ──────────────────────────────────────────────
    crowding = {
        "dates": dates,
        "dealer_crowding": df['Dealer Crowding'].tolist(),
        "am_crowding": df['Asset Manager Crowding'].tolist(),
        "hf_crowding": df['Levered Manager Crowding'].tolist(),
    }

    # ── RAW TAIL ──────────────────────────────────────────────
    tail_cols = [
        'Report_Date_as_MM_DD_YYYY', 'Open_Interest_All',
        'Dealer Net', 'Asset Manager Net', 'Levered Net',
        'Dealer Ratio', 'Asset Manager Ratio', 'Levered Ratio',
        'Dealer Crowding', 'Asset Manager Crowding', 'Levered Manager Crowding',
    ]
    tail_df = df.tail(5)[tail_cols].copy()
    tail_df['Report_Date_as_MM_DD_YYYY'] = tail_df['Report_Date_as_MM_DD_YYYY'].dt.strftime('%Y-%m-%d')
    tail_df = tail_df.replace([np.inf, -np.inf], None)
    tail = tail_df.to_dict(orient='records')

    # ── OI DECOMPOSITION ──────────────────────────────────────
    decomposition = {
        "dates": dates,
        "dealer_long": df['Dealer_Positions_Long_All'].tolist(),
        "am_long": df['Asset_Mgr_Positions_Long_All'].tolist(),
        "hf_long": df['Lev_Money_Positions_Long_All'].tolist(),
        "other_long": df['Other_Long'].tolist(),
        "dealer_short": df['Dealer_Positions_Short_All'].tolist(),
        "am_short": df['Asset_Mgr_Positions_Short_All'].tolist(),
        "hf_short": df['Lev_Money_Positions_Short_All'].tolist(),
        "other_short": df['Other_Short'].tolist(),
    }


    return clean_for_json({
        "summary": summary,
        "main_chart": main_chart,
        "proportions": proportions,
        "ratios": ratios,
        "crowding": crowding,
        "decomposition": decomposition,    # ← add
        "insights": inst_insights,
        "tail": tail,
    })