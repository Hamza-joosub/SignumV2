# /api/models/dcf, /api/models/garch etc

from fastapi import APIRouter
from models.dcf import run_dcf
from models.garch import run_garch

router = APIRouter()

@router.post("/models/dcf")
def dcf_endpoint(ticker: str, growth_rate: float = 0.08):
    return run_dcf(ticker, growth_rate)

@router.post("/models/garch")
def garch_endpoint(ticker: str, lookback: int = 252):
    return run_garch(ticker, lookback)