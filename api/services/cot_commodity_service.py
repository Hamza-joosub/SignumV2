import yfinance as yf
import pandas as pd
import requests
import zipfile
import io
import json
import os
import xlrd
import numpy as np
import json

INSTRUMENT_MAP = {
    # WTI
    'CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE'          : 'Oil_WTI',
    'CRUDE OIL, LIGHT SWEET-WTI - ICE FUTURES EUROPE'                : 'Oil_WTI',
    'WTI FINANCIAL CRUDE OIL - NEW YORK MERCANTILE EXCHANGE'         : 'Oil_WTI',

    # Brent
    'BRENT CRUDE OIL LAST DAY - NEW YORK MERCANTILE EXCHANGE'        : 'Oil_Brent',
    'BRENT LAST DAY - NEW YORK MERCANTILE EXCHANGE'                  : 'Oil_Brent',

    # Hedging instruments — keep separate
    'CRUDE OIL AVG PRICE OPTIONS - NEW YORK MERCANTILE EXCHANGE'     : 'Oil_Hedging',
    'CRUDE OIL CAL SPREAD OPT FIN  - NEW YORK MERCANTILE EXCHANGE'   : 'Oil_Hedging',

    'GOLD - COMMODITY EXCHANGE INC.'                                : 'Gold',

    'COPPER- #1 - COMMODITY EXCHANGE INC.'                          : "Copper",
    'COPPER-GRADE #1 - COMMODITY EXCHANGE INC.'                     : "Copper",

    'SILVER - COMMODITY EXCHANGE INC.'                              : "Silver",

    'PLATINUM - NEW YORK MERCANTILE EXCHANGE'                       : "Platinum",

    'PALLADIUM - NEW YORK MERCANTILE EXCHANGE'                      : 'Palladium',

    #'COBALT - COMMODITY EXCHANGE INC.'                              : "Cobalt", primarily OTC

    'SOYBEAN MEAL - CHICAGO BOARD OF TRADE'                         : "Soybean",
    'SOYBEAN OIL - CHICAGO BOARD OF TRADE'                          : "Soybean",
    'SOYBEANS - CHICAGO BOARD OF TRADE'                             : "Soybean",
    
    'SUGAR NO. 11 - ICE FUTURES U.S.'                               : "Sugar",
    'COFFEE C - ICE FUTURES U.S.'                                   : "Coffee",
    'COCOA - ICE FUTURES U.S.'                                      : "Cocoa",
    'COTTON NO. 2 - ICE FUTURES U.S.'                               : "Cotton",
    'LIVE CATTLE - CHICAGO MERCANTILE EXCHANGE'                     : "Live Cattle",
                                                     
    'NATURAL GAS HENRY LD1 FIXED - ICE FUTURES ENERGY DIV'          : "Nat_Gas",
    'NAT GAS ICE LD1 - ICE FUTURES ENERGY DIV'                      : "Nat_Gas",
    'NATURAL GAS PENULTIMATE ICE - ICE FUTURES ENERGY DIV'          : "Nat_Gas",
    'NAT GAS ICE PEN - ICE FUTURES ENERGY DIV'                      : "Nat_Gas",

    'NATURAL GAS - NEW YORK MERCANTILE EXCHANGE'                    : "Nat_Gas",
    'NAT GAS NYME - NEW YORK MERCANTILE EXCHANGE'                   : "Nat_Gas",

    #'UREA (GRANULAR) FOB US GULF - CHICAGO BOARD OF TRADE'          : "Urea",primarily OTC

    'CORN - CHICAGO BOARD OF TRADE'                                 : "Corn",

    'WHEAT-SRW - CHICAGO BOARD OF TRADE'                            : 'Wheat_SRW',
    'WHEAT-HRW - CHICAGO BOARD OF TRADE'                            : 'Wheat_HRW',
    'WHEAT-HRSpring - MINNEAPOLIS GRAIN EXCHANGE'                   : 'Wheat_HRS',
    'WHEAT-HRSpring - MIAX FUTURES EXCHANGE'                        : 'Wheat_HRS',
    
    #'ALUMINUM MW US TR PLATTS - COMMODITY EXCHANGE INC.' : "Aluminum_MWP",  #bet on physical tightness/looseness in the US market (warehousing, tariffs, import flows)
    #'ALUMINUM MWP - COMMODITY EXCHANGE INC.'             : "Aluminum_MWP",  primarily OTC

    
}


TICKER_MAP = {
    # Energy
    'Oil_WTI':      'CL=F',
    'Oil_Brent':    'BZ=F',
    'Oil_Hedging':  'CL=F',

    # Metals
    'Gold':         'GC=F',
    'Copper':       'HG=F',
    'Silver':       'SI=F',
    'Platinum':     'PL=F',
    'Palladium':    'PA=F',
    #'Aluminum_MWP': None,   # patchy yfinance coverage


    # Grains
    'Corn':         'ZC=F',
    'Wheat_SRW':    'ZW=F',
    'Wheat_HRW':    'KE=F',
    'Wheat_HRS':    None,   # MWE=F too sparse
    'Soybean':      'ZS=F',

    # Softs
    'Sugar':        'SB=F',
    'Coffee':       'KC=F',
    'Cocoa':        'CC=F',
    'Cotton':       'CT=F',

    # Livestock
    'Live Cattle':  'LE=F',

    # Gas
    'Nat_Gas':      'NG=F',

}

def download_cot_data():
    """
    Downloads raw CFTC Disaggregated Commitments of Traders data
    (combined futures + options) for commodity futures.

    Years are hardcoded inside the function.

    Returns:
        pd.DataFrame — raw unmodified Disaggregated COT data concatenated across years
    """

    years = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer':    'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm',
    }

    dfs = []
    for year in years:
        url = f"https://www.cftc.gov/files/dea/history/com_disagg_txt_{year}.zip"
        print(f"Fetching commodity COT {year} from {url}...")
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            zf = zipfile.ZipFile(io.BytesIO(response.content))
            filename = zf.namelist()[0]
            file_bytes = zf.open(filename).read()

            if filename.endswith('.csv') or file_bytes[:1] == b'"' or file_bytes[:6] == b'Market':
                # It's actually a CSV (common for the current year)
                dfs.append(pd.read_csv(io.BytesIO(file_bytes)))
            else:
                dfs.append(pd.read_excel(io.BytesIO(file_bytes), engine='xlrd'))

            print(f"  ✓ {year} fetched successfully")
        except requests.HTTPError as e:
            print(f"  ✗ HTTP error for {year}: {e}")
        except zipfile.BadZipFile:
            print(f"  ✗ Bad zip file for {year}")
        except Exception as e:
            print(f"  ✗ Unexpected error for {year}: {e}")

    if not dfs:
        raise RuntimeError("No data fetched — check years and network connection")

    output = pd.concat(dfs, ignore_index=True)
    return output


def find_dominant_contracts(df, instrument_name):
    """
    For a given instrument, shows which contract names exist,
    how many weeks each was dominant, and the date range of dominance.
    
    Use this BEFORE updating INSTRUMENT_MAP to understand what to include.
    
    Args:
        df              : raw COT DataFrame
        instrument_name : str — search term e.g. 'EURO FX', 'NASDAQ', 'BITCOIN'
    
    Returns:
        pd.DataFrame — contract names, dominance count, date ranges
    """
    # Find all contracts matching the search term and print the variant names
    df_filtered = df[df['Market_and_Exchange_Names'].str.contains(instrument_name)]
    df_filtered = df_filtered[['Market_and_Exchange_Names', 'Report_Date_as_YYYY-MM-DD', 'Open_Interest_All']]
    df_filtered_pivot = df_filtered.pivot_table(
    index='Report_Date_as_YYYY-MM-DD',
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
    return df_filtered_pivot_proportions


def clean_commodity_cot_data(df, instrument_map):
    ''' Dealer — financial institutions/dealers (often on the other side of client trades)
        Asset_Mgr — institutional investors like pension funds, mutual funds
        Lev_Money — leveraged money (hedge funds, CTAs)
        Other_Rept — other reportable traders
        NonRept — non-reportable (small traders below reporting thresholds)
        Traders - it's counting number of traders, knowing 47 dealers are long tells you less than knowing their total position size
        Concentration Report - Shows what % of open interest the top 4 and top 8 traders control'''
    
    # take only the columns we need
    df = df[[
        'Market_and_Exchange_Names', 
        'Report_Date_as_YYYY-MM-DD', 
        'Open_Interest_All', 
         

        # Physical hedgers — miners, farmers, refiners, end-users
        'Prod_Merc_Positions_Long_All', 'Prod_Merc_Positions_Short_All',
        'Traders_Prod_Merc_Long_All', 'Traders_Prod_Merc_Short_All', 
        # Banks/dealers hedging OTC commodity swap exposure
        'Swap_Positions_Long_All', 'Swap__Positions_Short_All', 'Swap__Positions_Spread_All',
        'Traders_Swap_Long_All', 'Traders_Swap_Short_All', 'Traders_Swap_Spread_All',
        # Hedge funds, CTAs, systematic traders
        'M_Money_Positions_Long_All', 'M_Money_Positions_Short_All', 'M_Money_Positions_Spread_All',
        'Traders_M_Money_Long_All', 'Traders_M_Money_Short_All', 'Traders_M_Money_Spread_All',

        # Large traders that don't fit the above buckets
        'Other_Rept_Positions_Long_All', 'Other_Rept_Positions_Short_All', 'Other_Rept_Positions_Spread_All',
        'Traders_Other_Rept_Long_All', 'Traders_Other_Rept_Short_All', 'Traders_Other_Rept_Spread_All',

        # small traders below the CFTC reporting threshold, derived as total OI minus all reportables
        'Tot_Rept_Positions_Long_All', 'Tot_Rept_Positions_Short_All',
        'Traders_Tot_Rept_Long_All', 'Traders_Tot_Rept_Short_All',


        'NonRept_Positions_Long_All', 'NonRept_Positions_Short_All',

        

    ]]


    df['Report_Date_as_YYYY-MM-DD'] = pd.to_datetime(df['Report_Date_as_YYYY-MM-DD'])
    df = df.sort_values('Report_Date_as_YYYY-MM-DD')

    df['Instrument'] = df['Market_and_Exchange_Names'].map(instrument_map)
    df = df[df['Instrument'].notna()].copy()

    cols_to_sum = df.columns.values.tolist()
    cols_to_sum.remove('Market_and_Exchange_Names')
    cols_to_sum.remove('Report_Date_as_YYYY-MM-DD')
    cols_to_sum.remove('Instrument')

    
    df[cols_to_sum] = df[cols_to_sum].apply(pd.to_numeric, errors='coerce')
    #print(df[cols_to_sum].isna().sum().sort_values(ascending=False))
    #print(df[df['Traders_Swap_Short_All'].isna()]['Instrument'].value_counts())
    df[cols_to_sum] = df[cols_to_sum].fillna(0) ### careful here we did this because we assume NaN's means no traders here
    
    # Sum position columns
    df_summed = (
        df.groupby(['Instrument', 'Report_Date_as_YYYY-MM-DD'])[cols_to_sum]
        .sum()
        .reset_index()
    )

    return df_summed 

def get_align_prices(cot_clean):
    instrument_list = cot_clean['Instrument'].unique().tolist()
    
    tickers_list = [TICKER_MAP[inst] for inst in instrument_list if inst in TICKER_MAP and TICKER_MAP[inst] is not None]

            
    print(tickers_list)
    prices = yf.download(tickers_list,start = '2018-01-01' )['Close']
    prices = prices.ffill()
    prices = prices.bfill()
    prices


    all_dfs = []
    for instr in instrument_list:
        cot_specific_instrument = cot_clean[cot_clean['Instrument'] ==instr ]
        cot_specific_instrument = cot_specific_instrument.set_index('Report_Date_as_YYYY-MM-DD')
        ticker_name = TICKER_MAP[instr]
        if ticker_name is None:
            cot_specific_instrument['Price'] = float("nan")
            all_dfs.append(cot_specific_instrument)
            continue
        price_specific_instrument = pd.DataFrame(prices[ticker_name])
        merged_df = cot_specific_instrument.merge(price_specific_instrument, left_index=True, right_index=True, how = 'left')
        merged_df = merged_df.rename(columns={ticker_name: 'Price'})
        all_dfs.append(merged_df)
    cot_data = pd.concat(all_dfs)
    cot_data = cot_data.reset_index()
    return cot_data

def feature_engineering(df):

    spread_categories = [
        (
            'MM',
            'M_Money_Positions_Long_All',
            'M_Money_Positions_Short_All',
            'M_Money_Positions_Spread_All'
        ),
        (
            'SW',
            'Swap_Positions_Long_All',
            'Swap__Positions_Short_All',
            'Swap__Positions_Spread_All'
        ),
        (
            'OT',
            'Other_Rept_Positions_Long_All',
            'Other_Rept_Positions_Short_All',
            'Other_Rept_Positions_Spread_All'
        ),
    ]
    
    df = df.copy()
    
    for cat, long_col, short_col, spread_col in spread_categories:
        df[f'Adjusted_{cat}_Long_All']  = df[long_col]  + 0.5 * df[spread_col]
        df[f'Adjusted_{cat}_Short_All'] = df[short_col] + 0.5 * df[spread_col]
    
    return df

def compute_commodity_overview(df: pd.DataFrame, window: int = 26, spread_threshold: int = 75) -> pd.DataFrame:
    """
    Takes the cleaned COT dataframe and returns a snapshot dataframe
    with one row per instrument containing all pre-computed features.

    Parameters
    ----------
    df               : cleaned COT dataframe (commodity_cot_clean.csv)
    window           : rolling percentile rank window in weeks (default 26)
    spread_threshold : spread flag threshold percentile (default 75)

    Returns
    -------
    Snapshot dataframe — one row per instrument.
    """

    df = df.copy()
    df["Report_Date_as_YYYY-MM-DD"] = pd.to_datetime(df["Report_Date_as_YYYY-MM-DD"])
    df = df.sort_values(["Instrument", "Report_Date_as_YYYY-MM-DD"]).reset_index(drop=True)

    oi = df["Open_Interest_All"].replace(0, np.nan)

    # ── Net % of OI ──────────────────────────────────────────────────────────
    df["MM_Net_pct"] = (df["Adjusted_MM_Long_All"]  - df["Adjusted_MM_Short_All"]) / oi
    df["PM_Net_pct"] = (df["Prod_Merc_Positions_Long_All"] - df["Prod_Merc_Positions_Short_All"]) / oi
    df["SW_Net_pct"] = (df["Adjusted_SW_Long_All"]  - df["Adjusted_SW_Short_All"]) / oi
    df["OT_Net_pct"] = (df["Adjusted_OT_Long_All"]  - df["Adjusted_OT_Short_All"]) / oi

    # ── Spread ratios ─────────────────────────────────────────────────────────
    for prefix, long_col, short_col, spread_col in [
        ("MM", "Adjusted_MM_Long_All",  "Adjusted_MM_Short_All",  "M_Money_Positions_Spread_All"),
        ("SW", "Adjusted_SW_Long_All",  "Adjusted_SW_Short_All",  "Swap__Positions_Spread_All"),
        ("OT", "Adjusted_OT_Long_All",  "Adjusted_OT_Short_All",  "Other_Rept_Positions_Spread_All"),
    ]:
        gross = df[long_col] + df[short_col] + df[spread_col]
        df[f"{prefix}_spread_ratio"] = df[spread_col] / gross.replace(0, np.nan)

    # ── Rolling percentile rank ───────────────────────────────────────────────
    def rolling_pct_rank(series: pd.Series, w: int) -> pd.Series:
        result = np.full(len(series), np.nan)
        arr = series.values
        for i in range(len(arr)):
            if np.isnan(arr[i]):
                continue
            sl = arr[max(0, i - w + 1) : i + 1]
            valid = sl[~np.isnan(sl)]
            if len(valid) < 5:
                continue
            result[i] = round(np.sum(valid < arr[i]) / (len(valid) - 1) * 100)
        return pd.Series(result, index=series.index)

    rank_targets = {
        "MM_rank"         : "MM_Net_pct",
        "PM_rank"         : "PM_Net_pct",
        "SW_rank"         : "SW_Net_pct",
        "OT_rank"         : "OT_Net_pct",
        "OI_rank"         : "Open_Interest_All",
        "MM_spread_rank"  : "MM_spread_ratio",
        "SW_spread_rank"  : "SW_spread_ratio",
        "OT_spread_rank"  : "OT_spread_ratio",
    }

    for out_col, src_col in rank_targets.items():
        df[out_col] = (
            df.groupby("Instrument")[src_col]
            .transform(lambda s: rolling_pct_rank(s, window))
        )

    # ── Spread flags ──────────────────────────────────────────────────────────
    df["MM_spread_flagged"] = df["MM_spread_rank"] >= spread_threshold
    df["SW_spread_flagged"] = df["SW_spread_rank"] >= spread_threshold
    df["OT_spread_flagged"] = df["OT_spread_rank"] >= spread_threshold

    # ── WoW OI change ─────────────────────────────────────────────────────────
    df["OI_wow"] = (
        df.groupby("Instrument")["Open_Interest_All"]
        .transform(lambda s: s.pct_change() * 100)
        .round(1)
    )

    # ── Snapshot — latest row per instrument ──────────────────────────────────
    snapshot = (
        df.sort_values("Report_Date_as_YYYY-MM-DD")
        .groupby("Instrument")
        .last()
        .reset_index()
    )

    keep = [
    "Instrument",
    "Report_Date_as_YYYY-MM-DD",
    "Open_Interest_All",
    "MM_rank", "PM_rank", "SW_rank", "OT_rank",
    "OI_rank", "OI_wow",
    "MM_spread_ratio", "MM_spread_rank", "MM_spread_flagged",
    "SW_spread_ratio", "SW_spread_rank", "SW_spread_flagged",
]

    snapshot = snapshot[keep].copy()
    rank_cols = [c for c in keep if c.endswith("_rank")]
    snapshot[rank_cols] = snapshot[rank_cols].round(0).astype("Int64")
    snapshot["Report_Date_as_YYYY-MM-DD"] = snapshot["Report_Date_as_YYYY-MM-DD"].dt.strftime("%Y-%m-%d")

    return snapshot

def refresh_commodity_cot_data():
    cot_raw = download_cot_data()
    cot_clean = clean_commodity_cot_data(cot_raw, INSTRUMENT_MAP)
    
    cot_clean = feature_engineering(cot_clean)
    cot_clean = get_align_prices(cot_clean)
    cot_clean.to_csv('commodity_cot_clean.csv')

    for lb in [13, 26, 52]:
        overview_data = compute_commodity_overview(cot_clean, window=lb)
        
        """try:
            summary = generate_cot_summary(overview_data, lookback_weeks=lb)
        except Exception as e:
            print(f"Summary generation failed for {lb}w: {e}")"""
        summary = "temp summary of cot-commodity-data"
        
        output = {
            "instruments": overview_data.to_dict(orient="records"),
            "summary": summary,
        }
        
        with open(f'commodity_cot_overview_{lb}w.json', 'w') as f:
            json.dump(output, f, default=str)
















