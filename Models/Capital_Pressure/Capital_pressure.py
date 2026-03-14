import yfinance as yf
import pandas as pd
import numpy as np
import requests
import zipfile
import io
import plotly.express as px

INSTRUMENT_MAP = {
    # S&P 500 — all variants map to same instrument
    'E-MINI S&P 500 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE': 'SP500',
    'E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE':             'SP500',
    'S&P 500 Consolidated - CHICAGO MERCANTILE EXCHANGE':       'SP500',
    
}

TICKER_MAP = {
    'SP500':   '^GSPC',
    'NASDAQ':  '^NDX',
    'EURUSD':  'EURUSD=X',
    'RAND':    'ZAR=X',
    'BITCOIN': 'BTC-USD',
}

def download_cot_data(years, report_type='combined'):
    """
    Downloads raw CFTC Traders in Financial Futures (TFF) data.

    Args:
        years       : list of int — e.g. [2020, 2021, 2022]
        report_type : 'futures' or 'combined' (futures + options)

    Returns:
        pd.DataFrame — raw unmodified TFF data
    """
    prefix_map = {
        'futures':  'fut_fin_xls',
        'combined': 'com_fin_xls',
    }
    assert report_type in prefix_map, f"report_type must be one of {list(prefix_map.keys())}"
    prefix = prefix_map[report_type]

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer':    'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm',
    }

    dfs = []
    for year in years:
        url = f"https://www.cftc.gov/files/dea/history/{prefix}_{year}.zip"
        print(f"Fetching {report_type} COT {year} from {url}...")
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            zf  = zipfile.ZipFile(io.BytesIO(response.content))
            xls = zf.open(zf.namelist()[0]).read()
            dfs.append(pd.read_excel(io.BytesIO(xls), engine='xlrd'))
            print(f"  ✓ {year} fetched successfully")
        except requests.HTTPError as e:
            print(f"  ✗ HTTP error for {year}: {e}")
        except zipfile.BadZipFile:
            print(f"  ✗ Bad zip file for {year}")
        except Exception as e:
            print(f"  ✗ Unexpected error for {year}: {e}")

    if not dfs:
        raise RuntimeError("No data fetched — check years and network connection")

    return pd.concat(dfs, ignore_index=True)


def find_dominant_contracts(df, instrument_name):
    """
    For a given instrument, shows which contract names exist,
    how many weeks each was dominant, and the date range of dominance.

    Use this BEFORE updating INSTRUMENT_MAP to understand what to include.

    Args:
        df              : raw COT DataFrame
        instrument_name : str — search term e.g. 'EURO FX', 'NASDAQ', 'BITCOIN'
        top_n           : int — how many contracts to show

    Returns:
        pd.DataFrame — contract names, dominance count, date ranges
    """
    # Find all contracts matching the search term and print the variant names
    df_filtered = df[df['Market_and_Exchange_Names'].str.contains(instrument_name)]
    df_filtered = df_filtered[['Market_and_Exchange_Names', 'Report_Date_as_MM_DD_YYYY', 'Open_Interest_All']]
    df_filtered_pivot = df_filtered.pivot_table(
    index='Report_Date_as_MM_DD_YYYY',
    columns='Market_and_Exchange_Names',
    values='Open_Interest_All',
    aggfunc='first' ) # in case of duplicates, take first


    variant_names = (df_filtered_pivot.columns.values.tolist())
    print(f"Variants: For {instrument_name}: ") 
    for i in variant_names:
        print(i)
    if len(variant_names) == 0:
        print('Probably Searched Wrong')

    df_filtered_pivot['Total'] = df_filtered_pivot.sum(axis=1, )

    df_filtered_pivot_proportions = df_filtered_pivot.div(df_filtered_pivot['Total'], axis=0) * 100
    df_filtered_pivot_proportions = df_filtered_pivot_proportions.drop(columns='Total')
    return px.line(df_filtered_pivot_proportions)

def clean_financial_cot_data(df, instrument_map):
    ''' Dealer — financial institutions/dealers (often on the other side of client trades)
        Asset_Mgr — institutional investors like pension funds, mutual funds
        Lev_Money — leveraged money (hedge funds, CTAs)
        Other_Rept — other reportable traders
        NonRept — non-reportable (small traders below reporting thresholds)
        Traders - it's counting number of traders, knowing 47 dealers are long tells you less than knowing their total position size
        Concentration Report - Shows what % of open interest the top 4 and top 8 traders control'''
    
    # take only the columns we need
    df = df[['Market_and_Exchange_Names', 
    'Report_Date_as_MM_DD_YYYY', 
    'Open_Interest_All', 
    'Dealer_Positions_Long_All', 'Dealer_Positions_Short_All',
    'Asset_Mgr_Positions_Long_All','Asset_Mgr_Positions_Short_All',
    'Lev_Money_Positions_Long_All', 'Lev_Money_Positions_Short_All'
    ]]


    df['Report_Date_as_MM_DD_YYYY'] = pd.to_datetime(df['Report_Date_as_MM_DD_YYYY'])
    df = df.sort_values('Report_Date_as_MM_DD_YYYY')

    df['Instrument'] = df['Market_and_Exchange_Names'].map(instrument_map)
    df = df[df['Instrument'].notna()].copy()

    cols_to_sum = df.columns.values.tolist()
    cols_to_sum.remove('Market_and_Exchange_Names')
    cols_to_sum.remove('Report_Date_as_MM_DD_YYYY')
    cols_to_sum.remove('Instrument')
    df = (
    df.groupby(['Instrument', 'Report_Date_as_MM_DD_YYYY'])[cols_to_sum]
    .sum()
    .reset_index()
    )


    return df
    
def process_COT(df_cot, instrument, start_date, end_date):
    """
    Args:
        df_cot      : cleaned COT dataframe (output of clean_cot_data())
        instrument  : str — e.g. 'SP500'
        start_date  : str — e.g. '2020-01-01'
        end_date    : str — e.g. '2022-12-31'
    """

    df_clean = df_cot[
    (df_cot['Instrument'] == instrument) &
    (df_cot['Report_Date_as_MM_DD_YYYY'] >= start_date) &
    (df_cot['Report_Date_as_MM_DD_YYYY'] <= end_date)
    ].copy()

    df_clean["Dealer Net"] = df_clean['Dealer_Positions_Long_All'] - df_clean['Dealer_Positions_Short_All']
    df_clean["Asset Manager Net"] = df_clean['Asset_Mgr_Positions_Long_All'] - df_clean['Asset_Mgr_Positions_Short_All'] 
    df_clean["Levered Net"] = df_clean['Lev_Money_Positions_Long_All'] - df_clean['Lev_Money_Positions_Short_All']

    df_clean["Dealer Long Proportion"] = df_clean['Dealer_Positions_Long_All']/df_clean['Open_Interest_All']
    df_clean["Asset Manager Long Proportion"] = df_clean['Asset_Mgr_Positions_Long_All']/df_clean['Open_Interest_All']
    df_clean["Levered Long Proportion"] = df_clean['Lev_Money_Positions_Long_All']/df_clean['Open_Interest_All']

    df_clean["Dealer Short Proportion"] = df_clean['Dealer_Positions_Short_All']/df_clean['Open_Interest_All']
    df_clean["Asset Manager Short Proportion"] = df_clean['Asset_Mgr_Positions_Short_All']/df_clean['Open_Interest_All']
    df_clean["Levered Short Proportion"] = df_clean['Lev_Money_Positions_Short_All']/df_clean['Open_Interest_All']


    df_clean["Dealer Crowding"] = (df_clean['Dealer_Positions_Long_All']+df_clean['Dealer_Positions_Short_All'])/df_clean['Open_Interest_All']
    df_clean["Asset Manager Crowding"] = (df_clean['Asset_Mgr_Positions_Long_All']+df_clean['Asset_Mgr_Positions_Short_All'])/df_clean['Open_Interest_All']
    df_clean["Levered Manager Crowding"] = (df_clean['Lev_Money_Positions_Long_All']+df_clean['Lev_Money_Positions_Short_All'])/df_clean['Open_Interest_All']

    ticker = TICKER_MAP[instrument]
    spy = yf.download(tickers=ticker, start=start_date, end=end_date)['Close']

    spy_tuesday = spy[spy.index.dayofweek == 1]
    spy_tuesday.index.name = 'Report_Date_as_MM_DD_YYYY'
    spy_tuesday.name = 'Price_Close'  # rename the Series before merging

    df_clean_merged = df_clean.merge(spy_tuesday, on='Report_Date_as_MM_DD_YYYY', how='inner')
    df_clean_merged = df_clean_merged.rename(columns={ticker: 'Price_Close'})
    df_clean_merged

    return df_clean_merged

cot_raw = download_cot_data([2020, 2021, 2022, 2023, 2024, 2025, 2026])

find_dominant_contracts(cot_raw, 'S&P 500')

cot_clean = clean_financial_cot_data(cot_raw, INSTRUMENT_MAP)
cot_clean

processed_cot_1 = process_COT(cot_clean, 'SP500', '2020-01-01', '2023-01-01')
processed_cot_1




    

















    
