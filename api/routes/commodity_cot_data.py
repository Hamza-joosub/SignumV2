from fastapi import APIRouter
import pandas as pd
import numpy as np

import json
import os

router = APIRouter()


@router.get("/commodity_cot/overview")
def cot_overview(lookback: int = 52):
    allowed = {13, 26, 52}
    if lookback not in allowed:
        lookback = 52
    path = f'commodity_cot_overview_{lookback}w.json'
    if not os.path.exists(path):
        return {"instruments": [], "summary": None}
    with open(path, 'r') as f:
        return json.load(f)