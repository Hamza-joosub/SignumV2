import yfinance as yf
import pandas as pd
import numpy as np
import requests
import zipfile
import io
import plotly.express as px

INSTRUMENT_MAP = {
    # S&P 500 — all variants map to same instrument
    "ADJUSTED INT RATE S&P 500 TOTL - CHICAGO MERCANTILE EXCHANGE" :    "SP500",
    "E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE" :                    "SP500",
    "E-MINI S&P 500 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE" :        "SP500",
    "MICRO E-MINI S&P 500 INDEX - CHICAGO MERCANTILE EXCHANGE" :        "SP500",
    "S&P 500 ANNUAL DIVIDEND INDEX - CHICAGO MERCANTILE EXCHANGE" :     "SP500",
    "S&P 500 Consolidated - CHICAGO MERCANTILE EXCHANGE" :              "SP500",
    "S&P 500 QUARTERLY DIVIDEND IND - CHICAGO MERCANTILE EXCHANGE" :    "SP500",
    "S&P 500 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE" :               "SP500",
    "S&P 500 TOTAL RETURN INDEX - CHICAGO MERCANTILE EXCHANGE" :        "SP500",

    'BITCOIN - CHICAGO MERCANTILE EXCHANGE':                            'BTC',
    'BITCOIN CASH PERP STYLE - COINBASE DERIVATIVES, LLC':              'BTC',
    'MICRO BITCOIN - CHICAGO MERCANTILE EXCHANGE':                      'BTC',
    'NANO BITCOIN PERP STYLE - COINBASE DERIVATIVES, LLC':              'BTC',

    "ULTRA 10-YEAR U.S. T-NOTES - CHICAGO BOARD OF TRADE" :             "US10Y",
    "ULTRA UST 10Y - CHICAGO BOARD OF TRADE" :                          "US10Y",
    "UST 10Y NOTE - CHICAGO BOARD OF TRADE" :                           "US10Y",
    "10-YEAR U.S. TREASURY NOTES - CHICAGO BOARD OF TRADE" :            "US10Y",
    
    '3-MONTH SOFR - CHICAGO MERCANTILE EXCHANGE' :                      "3 Month US",
    'SOFR-3M - CHICAGO MERCANTILE EXCHANGE' :                           "3 Month US",


    'SOFR-1M - CHICAGO MERCANTILE EXCHANGE' :                           '1 Month US',
    '1-MONTH SOFR - CHICAGO MERCANTILE EXCHANGE' :                      '1 Month US',

    "E-MINI RUSSELL 2000 INDEX - CHICAGO MERCANTILE EXCHANGE":          "russel",
    "EMINI RUSSELL 1000 GROWTH - CHICAGO MERCANTILE EXCHANGE":          "russel",
    "EMINI RUSSELL 1000 VALUE INDEX - CHICAGO MERCANTILE EXCHANGE":     "russel",
    "MICRO E-MINI RUSSELL 2000 INDX - CHICAGO MERCANTILE EXCHANGE":     "russel",
    "RUSSELL 1000 VALUE INDEX MINI - ICE FUTURES U.S.":                 "russel",
    "RUSSELL 2000 ANNUAL DIVIDEND  - CHICAGO MERCANTILE EXCHANGE":      "russel",
    "RUSSELL 2000 MINI INDEX FUTURE - ICE FUTURES U.S.":                "russel",
    "RUSSELL E-MINI - CHICAGO MERCANTILE EXCHANGE":                     "russel",

    'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE':                      'GBP',
    'BRITISH POUND STERLING - CHICAGO MERCANTILE EXCHANGE':             'GBP',
    'EURO FX/BRITISH POUND XRATE - CHICAGO MERCANTILE EXCHANGE':        'GBP',

    'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE':                       'YEN',

    'CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE':                    "CAD",
    'SWISS FRANC - CHICAGO MERCANTILE EXCHANGE' :                       "CHF",

    "MICRO E-MINI NASDAQ-100 INDEX - CHICAGO MERCANTILE EXCHANGE" :     "NASDAQ",
    "NASDAQ MINI - CHICAGO MERCANTILE EXCHANGE" :                       "NASDAQ",
    "NASDAQ-100 Consolidated - CHICAGO MERCANTILE EXCHANGE" :           "NASDAQ",
    "NASDAQ-100 STOCK INDEX (MINI) - CHICAGO MERCANTILE EXCHANGE" :     "NASDAQ",
}


TICKER_MAP = {
    'SP500':        '^GSPC',
    'BTC':          'BTC-USD',
    'US10Y':        'IEF',
    '3 Month US' :  'SHV',
    '1 Month US' :  'SHV',
    'russel':       'IWM',
    'GBP':          'GBPUSD=X',
    'YEN':          'JPY=X',
    'CAD' :         'CAD=X',
    'CHF' :         'CHF=X',
    'NASDAQ':       'QQQ'
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
    #df_clean_merged = df_clean_merged.rename(columns={ticker: 'Price_Close'})
    df_clean_merged

    return df_clean_merged

def feature_engineering(cot_clean):
    cot_clean["Dealer Net"] = cot_clean['Dealer_Positions_Long_All'] - cot_clean['Dealer_Positions_Short_All']
    cot_clean["Asset Manager Net"] = cot_clean['Asset_Mgr_Positions_Long_All'] - cot_clean['Asset_Mgr_Positions_Short_All'] 
    cot_clean["Levered Net"] = cot_clean['Lev_Money_Positions_Long_All'] - cot_clean['Lev_Money_Positions_Short_All']


    cot_clean["Dealer Ratio"] = cot_clean['Dealer_Positions_Long_All']/cot_clean['Dealer_Positions_Short_All']
    cot_clean["Asset Manager Ratio"] = cot_clean['Asset_Mgr_Positions_Long_All']/cot_clean['Asset_Mgr_Positions_Short_All'] 
    cot_clean["Levered Ratio"] = cot_clean['Lev_Money_Positions_Long_All']/cot_clean['Lev_Money_Positions_Short_All']


    cot_clean["Dealer Long Proportion"] = cot_clean['Dealer_Positions_Long_All']/cot_clean['Open_Interest_All']
    cot_clean["Asset Manager Long Proportion"] = cot_clean['Asset_Mgr_Positions_Long_All']/cot_clean['Open_Interest_All']
    cot_clean["Levered Long Proportion"] = cot_clean['Lev_Money_Positions_Long_All']/cot_clean['Open_Interest_All']

    cot_clean["Dealer Short Proportion"] = cot_clean['Dealer_Positions_Short_All']/cot_clean['Open_Interest_All']
    cot_clean["Asset Manager Short Proportion"] = cot_clean['Asset_Mgr_Positions_Short_All']/cot_clean['Open_Interest_All']
    cot_clean["Levered Short Proportion"] = cot_clean['Lev_Money_Positions_Short_All']/cot_clean['Open_Interest_All']


    cot_clean["Dealer Crowding"] = (cot_clean['Dealer_Positions_Long_All']+cot_clean['Dealer_Positions_Short_All'])/cot_clean['Open_Interest_All']
    cot_clean["Asset Manager Crowding"] = (cot_clean['Asset_Mgr_Positions_Long_All']+cot_clean['Asset_Mgr_Positions_Short_All'])/cot_clean['Open_Interest_All']
    cot_clean["Levered Manager Crowding"] = (cot_clean['Lev_Money_Positions_Long_All']+cot_clean['Lev_Money_Positions_Short_All'])/cot_clean['Open_Interest_All']
    return cot_clean

def view_dates(cot_clean):
    start_dates = []
    end_dates = []
    for instrument in cot_clean['Instrument'].unique().tolist():
        temp = cot_clean[cot_clean['Instrument'] == instrument]
        print(f'{instrument}: ({temp.iloc[0,1]}  <->  {temp.iloc[-1,1]})')
        start_dates.append(temp.iloc[0,1])
        end_dates.append(temp.iloc[-1,1])
    return start_dates, end_dates
    
def cot_treemap(variable, tf_in_weeks, cot_clean, prices):
    
    df_corr = pd.DataFrame()

    for instrument in cot_clean['Instrument'].unique().tolist():
        ### this is too long but it works
        temp = pd.DataFrame(cot_clean[cot_clean['Instrument'] == instrument].set_index('Report_Date_as_MM_DD_YYYY').drop(columns = 'Instrument')[variable]).rename(columns={variable : instrument})
        df_corr = df_corr.join(temp, how="outer")

    df_corr.replace([np.inf, -np.inf], np.nan, inplace=True)
    df_corr = df_corr.dropna()

    df_corr

    prices_clean = prices.ffill()
    prices_clean = prices_clean.dropna()
    prices_clean = prices_clean.reindex(df_corr.index).dropna()

    returns_dict = dict(prices_clean.pct_change(periods=tf_in_weeks).iloc[-1]*100)

    df_corr_treemap = pd.DataFrame(index = df_corr.columns.values.tolist())
    df_corr_treemap[variable] = df_corr.iloc[-1]
    df_corr_treemap = df_corr_treemap.reset_index()
    df_corr_treemap['parent'] = ''
    df_corr_treemap['ticker'] = df_corr_treemap['index'].map(TICKER_MAP)
    df_corr_treemap['return'] = df_corr_treemap['ticker'].map(returns_dict)
    df_corr_treemap['absolute value'] = abs(df_corr_treemap[variable])
    return df_corr_treemap


def ordinal(n):
    n = int(n)
    if 11 <= n % 100 <= 13:
        return f"{n}th"
    return f"{n}{['th','st','nd','rd'][min(n % 10, 4) if n % 10 < 4 else 0]}"


def percentile_rank(series, value):
    clean = series.replace([np.inf, -np.inf], np.nan).dropna()
    if len(clean) == 0:
        return 50.0
    return (clean < value).mean() * 100


GROUPS = [
    {
        'name': 'Dealer',
        'net': 'Dealer Net',
        'ratio': 'Dealer Ratio',
        'crowding': 'Dealer Crowding',
        'long_prop': 'Dealer Long Proportion',
        'short_prop': 'Dealer Short Proportion',
        'long_abs': 'Dealer_Positions_Long_All',
        'short_abs': 'Dealer_Positions_Short_All',
    },
    {
        'name': 'Asset Manager',
        'net': 'Asset Manager Net',
        'ratio': 'Asset Manager Ratio',
        'crowding': 'Asset Manager Crowding',
        'long_prop': 'Asset Manager Long Proportion',
        'short_prop': 'Asset Manager Short Proportion',
        'long_abs': 'Asset_Mgr_Positions_Long_All',
        'short_abs': 'Asset_Mgr_Positions_Short_All',
    },
    {
        'name': 'Hedge Fund',
        'net': 'Levered Net',
        'ratio': 'Levered Ratio',
        'crowding': 'Levered Manager Crowding',
        'long_prop': 'Levered Long Proportion',
        'short_prop': 'Levered Short Proportion',
        'long_abs': 'Lev_Money_Positions_Long_All',
        'short_abs': 'Lev_Money_Positions_Short_All',
    },
]


def generate_insights(cot_clean, lookback_weeks=104):
    insights = []
    flagged = set()  # prevent duplicate signals
    latest = cot_clean.groupby('Instrument').last()

    for inst, row in latest.iterrows():
        hist = cot_clean[cot_clean['Instrument'] == inst].tail(lookback_weeks)
        has_prev = len(hist) >= 2
        prev = hist.iloc[-2] if has_prev else None

        for g in GROUPS:

            # ── 1. WEEKLY FLIP ────────────────────────────────────
            # Did this group cross from net long to net short (or vice versa)?
            # Confirmed by checking the sign of net position changed
            if has_prev and prev[g['net']] * row[g['net']] < 0:
                direction = 'net long' if row[g['net']] > 0 else 'net short'
                insights.append({
                    'type': 'flip',
                    'instrument': inst,
                    'actor': g['name'],
                    'column': g['net'],
                    'text': f"{g['name']}s flipped {inst} to {direction} this week",
                    'severity': 'high',
                })

            # ── 2. DEALER NOT HEDGING ─────────────────────────────
            # Dealers normally intermediate client flow — when they step back
            # or break their typical posture, something structural changed
            if g['name'] == 'Dealer':
                crowding_pctl = percentile_rank(hist[g['crowding']], row[g['crowding']])
                net_pctl = percentile_rank(hist[g['net']], row[g['net']])

                # Dealers pulling back entirely
                if crowding_pctl < 10:
                    insights.append({
                        'type': 'dealer_absent',
                        'instrument': inst,
                        'actor': g['name'],
                        'column': g['crowding'],
                        'current': float(row[g['crowding']]),
                        'percentile': float(crowding_pctl),
                        'text': f"Dealers pulling back on {inst} — crowding at {row[g['crowding']]:.0%} of OI ({ordinal(crowding_pctl)} percentile). Reduced hedging activity",
                        'severity': 'high',
                    })
                    flagged.add((inst, 'Dealer', 'crowding_low'))

                # Dealers on an unusual side of the trade
                if net_pctl > 95:
                    insights.append({
                        'type': 'dealer_unusual',
                        'instrument': inst,
                        'actor': g['name'],
                        'column': g['net'],
                        'current': float(row[g['net']]),
                        'percentile': float(net_pctl),
                        'text': f"Dealers unusually net long on {inst} ({ordinal(net_pctl)} percentile) — not in typical hedging posture",
                        'severity': 'high',
                    })
                elif net_pctl < 5:
                    insights.append({
                        'type': 'dealer_unusual',
                        'instrument': inst,
                        'actor': g['name'],
                        'column': g['net'],
                        'current': float(row[g['net']]),
                        'percentile': float(net_pctl),
                        'text': f"Dealers extremely net short on {inst} ({ordinal(net_pctl)} percentile) — heavy hedging or directional bet",
                        'severity': 'high',
                    })

            # ── 3. RATIO EXTREMES ─────────────────────────────────
            # Long/short ratio at historical extremes = one-sided bet
            # Skip inf/nan (happens when short side is zero)
            current_ratio = row[g['ratio']]
            if not (np.isinf(current_ratio) or np.isnan(current_ratio)):
                ratio_pctl = percentile_rank(hist[g['ratio']], current_ratio)

                if ratio_pctl > 95:
                    if current_ratio > 1:
                        label = "extreme bullish positioning"
                    else:
                        label = "least bearish on record — still net short"
                    insights.append({
                        'type': 'ratio_extreme',
                        'instrument': inst,
                        'actor': g['name'],
                        'column': g['ratio'],
                        'current': float(current_ratio),
                        'percentile': float(ratio_pctl),
                        'text': f"{g['name']} long/short ratio on {inst} at {current_ratio:.2f}x — {ordinal(ratio_pctl)} percentile, {label}",
                        'severity': 'high',
                    })

                elif ratio_pctl < 5:
                    if current_ratio < 1:
                        label = "extreme bearish positioning"
                    else:
                        label = "least bullish on record — still net long"
                    insights.append({
                        'type': 'ratio_extreme',
                        'instrument': inst,
                        'actor': g['name'],
                        'column': g['ratio'],
                        'current': float(current_ratio),
                        'percentile': float(ratio_pctl),
                        'text': f"{g['name']} long/short ratio on {inst} at {current_ratio:.2f}x — {ordinal(ratio_pctl)} percentile, {label}",
                        'severity': 'high',
                    })

            # ── 4. CROWDING EXTREMES ──────────────────────────────
            # One group dominating open interest at historical highs/lows
            # Skip if already flagged by dealer_absent check
            crowding_pctl = percentile_rank(hist[g['crowding']], row[g['crowding']])
            if crowding_pctl > 90:
                insights.append({
                    'type': 'crowding',
                    'instrument': inst,
                    'actor': g['name'],
                    'column': g['crowding'],
                    'current': float(row[g['crowding']]),
                    'percentile': float(crowding_pctl),
                    'text': f"{g['name']} crowding on {inst} at {ordinal(crowding_pctl)} percentile ({row[g['crowding']]:.0%} of OI) — historically elevated",
                    'severity': 'high',
                })
            elif crowding_pctl < 10 and (inst, g['name'], 'crowding_low') not in flagged:
                insights.append({
                    'type': 'crowding',
                    'instrument': inst,
                    'actor': g['name'],
                    'column': g['crowding'],
                    'current': float(row[g['crowding']]),
                    'percentile': float(crowding_pctl),
                    'text': f"{g['name']} crowding on {inst} at {ordinal(crowding_pctl)} percentile ({row[g['crowding']]:.0%} of OI) — unusually low participation",
                    'severity': 'medium',
                })

            # ── 5. PROPORTION DIVERGENCE ──────────────────────────
            # Two groups on opposite sides — meaningful only when proportions are large
            # Check dealer vs hedge fund, and asset manager vs hedge fund
            if g['name'] == 'Dealer':
                hf = GROUPS[2]  # Hedge Fund
                d_long = row[g['long_prop']]
                d_short = row[g['short_prop']]
                hf_long = row[hf['long_prop']]
                hf_short = row[hf['short_prop']]

                if d_long > 0.4 and hf_short > 0.3:
                    insights.append({
                        'type': 'divergence',
                        'instrument': inst,
                        'actor': 'Dealer vs Hedge Fund',
                        'text': f"Dealers hold {d_long:.0%} of longs while Hedge Funds hold {hf_short:.0%} of shorts on {inst} — strong divergence",
                        'severity': 'high',
                    })
                elif d_short > 0.4 and hf_long > 0.3:
                    insights.append({
                        'type': 'divergence',
                        'instrument': inst,
                        'actor': 'Dealer vs Hedge Fund',
                        'text': f"Dealers hold {d_short:.0%} of shorts while Hedge Funds hold {hf_long:.0%} of longs on {inst} — strong divergence",
                        'severity': 'high',
                    })

            if g['name'] == 'Asset Manager':
                hf = GROUPS[2]
                am_long = row[g['long_prop']]
                hf_short = row[hf['short_prop']]
                am_short = row[g['short_prop']]
                hf_long = row[hf['long_prop']]

                if am_long > 0.35 and hf_short > 0.25:
                    insights.append({
                        'type': 'divergence',
                        'instrument': inst,
                        'actor': 'Asset Manager vs Hedge Fund',
                        'text': f"Asset Managers ({am_long:.0%} of longs) vs Hedge Funds ({hf_short:.0%} of shorts) on {inst}",
                        'severity': 'medium',
                    })
                elif am_short > 0.35 and hf_long > 0.25:
                    insights.append({
                        'type': 'divergence',
                        'instrument': inst,
                        'actor': 'Asset Manager vs Hedge Fund',
                        'text': f"Asset Managers ({am_short:.0%} of shorts) vs Hedge Funds ({hf_long:.0%} of longs) on {inst}",
                        'severity': 'medium',
                    })

            # ── 6. WEEKLY PROPORTION SHIFTS ───────────────────────
            # Big moves in proportion, confirmed by absolute contract change
            # Both must agree — prevents false signals from OI shrinkage
            if has_prev:
                long_shift = row[g['long_prop']] - prev[g['long_prop']]
                long_delta = row[g['long_abs']] - prev[g['long_abs']]
                short_shift = row[g['short_prop']] - prev[g['short_prop']]
                short_delta = row[g['short_abs']] - prev[g['short_abs']]

                if abs(long_shift) > 0.05 and long_shift * long_delta > 0:
                    direction = 'added' if long_shift > 0 else 'cut'
                    insights.append({
                        'type': 'shift',
                        'instrument': inst,
                        'actor': g['name'],
                        'column': g['long_prop'],
                        'delta_abs': int(abs(long_delta)),
                        'text': f"{g['name']}s {direction} longs on {inst} — proportion moved {long_shift:+.1%} of OI, backed by {abs(long_delta):,.0f} contracts",
                        'severity': 'medium',
                    })

                if abs(short_shift) > 0.05 and short_shift * short_delta > 0:
                    direction = 'added' if short_shift > 0 else 'cut'
                    insights.append({
                        'type': 'shift',
                        'instrument': inst,
                        'actor': g['name'],
                        'column': g['short_prop'],
                        'delta_abs': int(abs(short_delta)),
                        'text': f"{g['name']}s {direction} shorts on {inst} — proportion moved {short_shift:+.1%} of OI, backed by {abs(short_delta):,.0f} contracts",
                        'severity': 'medium',
                    })

    # Sort: high first, then by signal importance
    type_priority = {
        'flip': 0,
        'dealer_absent': 1,
        'dealer_unusual': 2,
        'divergence': 3,
        'ratio_extreme': 4,
        'crowding': 5,
        'shift': 6,
    }
    return sorted(
        insights,
        key=lambda x: (
            0 if x['severity'] == 'high' else 1,
            type_priority.get(x['type'], 99),
        ),
    )



def generate_proof_chart(insight, cot_clean, lookback_weeks=104):
    """
    Takes a single insight dict and returns chart-ready data
    based on the insight type.
    """
    inst = insight['instrument']
    hist = cot_clean[cot_clean['Instrument'] == inst].tail(lookback_weeks)
    itype = insight['type']

    # ── DISTRIBUTION ──────────────────────────────────────────
    # Used by: ratio_extreme, crowding, dealer_absent, dealer_unusual
    if itype in ('ratio_extreme', 'crowding', 'dealer_absent', 'dealer_unusual'):
        col = insight['column']
        series = hist[col].replace([np.inf, -np.inf], np.nan).dropna()
        current = insight['current']
        pctl = insight['percentile']

        if len(series) < 5:
            return None

        counts, edges = np.histogram(series, bins=20)
        current_bin = int(np.clip(np.digitize(current, edges) - 1, 0, len(counts) - 1))

        return {
            'chart_type': 'distribution',
            'column': col,
            'current': float(current),
            'percentile': float(pctl),
            'p5': float(series.quantile(0.05)),
            'p95': float(series.quantile(0.95)),
            'median': float(series.quantile(0.50)),
            'bins': [
                {
                    'x': float(edges[i]),
                    'width': float(edges[i + 1] - edges[i]),
                    'height': int(counts[i]),
                    'is_current': i == current_bin,
                }
                for i in range(len(counts))
            ],
        }

    # ── PROPORTION BARS ───────────────────────────────────────
    # Used by: divergence
    elif itype == 'divergence':
        row = hist.iloc[-1]
        return {
            'chart_type': 'proportion_bars',
            'longs': {
                'dealer': float(row['Dealer Long Proportion']),
                'asset_mgr': float(row['Asset Manager Long Proportion']),
                'hedge_fund': float(row['Levered Long Proportion']),
            },
            'shorts': {
                'dealer': float(row['Dealer Short Proportion']),
                'asset_mgr': float(row['Asset Manager Short Proportion']),
                'hedge_fund': float(row['Levered Short Proportion']),
            },
        }

    # ── WEEKLY BARS ───────────────────────────────────────────
    # Used by: shift
    elif itype == 'shift':
        col = insight['column']
        recent = hist.tail(8).copy()

        values = recent[col].tolist()
        dates = recent['Report_Date_as_MM_DD_YYYY'].dt.strftime('%m/%d').tolist()

        delta_prop = float(values[-1] - values[-2]) if len(values) >= 2 else 0.0

        return {
            'chart_type': 'weekly_bars',
            'column': col,
            'actor': insight['actor'],
            'dates': dates,
            'values': [float(v) for v in values],
            'delta_prop': delta_prop,
            'delta_abs': int(insight.get('delta_abs', 0)),
        }

    # ── BEFORE / AFTER ────────────────────────────────────────
    # Used by: flip
    elif itype == 'flip':
        net_col = insight['column']
        recent = hist.tail(8).copy()

        values = recent[net_col].tolist()
        dates = recent['Report_Date_as_MM_DD_YYYY'].dt.strftime('%m/%d').tolist()

        return {
            'chart_type': 'before_after',
            'column': net_col,
            'actor': insight['actor'],
            'dates': dates,
            'values': [float(v) for v in values],
            'prev_val': float(values[-2]) if len(values) >= 2 else 0.0,
            'curr_val': float(values[-1]),
            'prev_date': dates[-2] if len(dates) >= 2 else '',
            'curr_date': dates[-1],
        }

    return None


ticker_list = []
for tick in TICKER_MAP:
    ticker_list.append((TICKER_MAP[tick]))

ohlc = yf.download(tickers=ticker_list, start = '2018-01-01')
prices = ohlc['Close']
volume = ohlc['Volume']


cot_raw = download_cot_data([2017,2018,2019,2020, 2021, 2022, 2023, 2024, 2025, 2026])
find_dominant_contracts(cot_raw, 'NAS')
cot_clean = clean_financial_cot_data(cot_raw, INSTRUMENT_MAP)
cot_clean = feature_engineering(cot_clean)
instrument = 'NASDAQ'
df = cot_clean[cot_clean['Instrument'] == instrument]
all_insights = generate_insights(cot_clean)
inst_insights = [i for i in all_insights if i['instrument'] == instrument]
for insight in inst_insights:
        insight['proof'] = generate_proof_chart(insight, cot_clean)








    

















    
