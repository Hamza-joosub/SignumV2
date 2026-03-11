import yfinance as yf
import pandas as pd
import numpy as np
import requests
import zipfile
import io

COT_MAP = {
    # Maps ETF tickers to their CFTC futures contract names.
    # None = no clean futures equivalent.
    'SPY':  'E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE',
    'TLT':  'UST BOND - CHICAGO BOARD OF TRADE',
    'EEM':  'MSCI EM INDEX - ICE FUTURES U.S.',
    'VGK':  'MSCI EAFE  - ICE FUTURES U.S.',
    'DJP':  'BBG COMMODITY - CHICAGO BOARD OF TRADE',
    'GBTC': 'BITCOIN - CHICAGO MERCANTILE EXCHANGE',
    'UUP':  'USD INDEX - ICE FUTURES U.S.',
    'FXY':  'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE',
    'GLD':  'GOLD - COMMODITY EXCHANGE INC.',
    'USO':  'CRUDE OIL, LIGHT SWEET-WTI - ICE FUTURES EUROPE',
    'SHV':  None,
    'BIL':  None,
    'EMB':  None,
    'EZA': [
        'SOUTH AFRICAN RAND - CHICAGO MERCANTILE EXCHANGE',  # 2020-01-07 → 2022-02-01
        'SO AFRICAN RAND - CHICAGO MERCANTILE EXCHANGE',],
    'EMLC':None
}

def get_financial_cot_data(years=[2023, 2024, 2025]):
    """
    Downloads CFTC financial futures COT data for the given years
    and returns a single concatenated DataFrame.

    Source: fut_fin_xls_{year}.zip from cftc.gov
    Contains: equities, bonds, FX, crypto futures positioning.

    Deduplicates on (market name, date) to handle year-boundary overlaps.

    Args:
        years : list of int

    Returns:
        pd.DataFrame — raw financial COT data
    """
    dfs = []
    for year in years:
        print(f"Fetching financial COT {year}...")
        url = f"https://www.cftc.gov/files/dea/history/fut_fin_xls_{year}.zip"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer':    'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm',
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        zf  = zipfile.ZipFile(io.BytesIO(response.content))
        xls = zf.open(zf.namelist()[0]).read()
        dfs.append(pd.read_excel(io.BytesIO(xls), engine='xlrd'))

    combined = pd.concat(dfs, ignore_index=True)
    combined = combined.drop_duplicates(subset=['Market_and_Exchange_Names', 'Report_Date_as_MM_DD_YYYY'])
    combined = combined.sort_values('Report_Date_as_MM_DD_YYYY').reset_index(drop=True)
    return combined

def get_commodities_cot_data(years=[2023, 2024, 2025]):
    """
    Downloads CFTC disaggregated (commodity) COT data for the given years.

    Source: fut_disagg_xls_{year}.zip from cftc.gov
    Contains: gold, crude oil, broad commodity futures positioning.

    Args:
        years : list of int

    Returns:
        pd.DataFrame — raw commodity COT data
    """
    dfs = []
    for year in years:
        print(f"Fetching commodity COT {year}...")
        url = f"https://www.cftc.gov/files/dea/history/fut_disagg_xls_{year}.zip"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer':    'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm',
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        zf  = zipfile.ZipFile(io.BytesIO(response.content))
        xls = zf.open(zf.namelist()[0]).read()
        dfs.append(pd.read_excel(io.BytesIO(xls), engine='xlrd'))

    combined = pd.concat(dfs, ignore_index=True)
    combined = combined.drop_duplicates(subset=['Market_and_Exchange_Names', 'Report_Date_as_MM_DD_YYYY'])
    combined = combined.sort_values('Report_Date_as_MM_DD_YYYY').reset_index(drop=True)
    return combined















    
