import yfinance as yf
import pandas as pd
import numpy as np
import requests
import zipfile
import io
import json
import anthropic
import os

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


# Coverage tier per instrument — single source of truth, consumed by the LLM
# prompt and the frontend. Rationale lives in COT_PIPELINE.md (Coverage tier
# section): high = rates/FX where futures are the dominant institutional
# venue; moderate = equity indices (large cash/ETF exposure lives outside
# futures); low = BTC (post-ETF, futures positioning is dominated by basis
# trades, not directional conviction).
COVERAGE_MAP = {
    'US10Y':      'high',
    '1 Month US': 'high',
    '3 Month US': 'high',
    'GBP':        'high',
    'YEN':        'high',
    'CAD':        'high',
    'CHF':        'high',
    'SP500':      'moderate',
    'NASDAQ':     'moderate',
    'russel':     'moderate',
    'BTC':        'low',
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
    return df_filtered_pivot_proportions

def clean_financial_cot_data(df, instrument_map):
    ''' Dealer — financial institutions/dealers (often on the other side of client trades)
        Asset_Mgr — institutional investors like pension funds, mutual funds
        Lev_Money — leveraged money (hedge funds, CTAs)
        Other_Rept — other reportable traders
        Tot_Rept  — sum of all reportable traders (derived by CFTC)
        NonRept   — non-reportable (small traders below reporting thresholds)
        Traders_* — trader counts per bucket/side. CFTC suppresses counts when
                    fewer than 4 traders are in a category (confidentiality);
                    NaN is therefore equivalent to "no meaningful activity" and
                    is filled with 0 before aggregation.'''

    # take only the columns we need
    df = df[[
        'Market_and_Exchange_Names',
        'Report_Date_as_MM_DD_YYYY',
        'Open_Interest_All',

        # Dealer — positions + trader counts
        'Dealer_Positions_Long_All', 'Dealer_Positions_Short_All', 'Dealer_Positions_Spread_All',
        'Traders_Dealer_Long_All', 'Traders_Dealer_Short_All', 'Traders_Dealer_Spread_All',
        # Asset Manager — positions + trader counts
        'Asset_Mgr_Positions_Long_All', 'Asset_Mgr_Positions_Short_All', 'Asset_Mgr_Positions_Spread_All',
        'Traders_Asset_Mgr_Long_All', 'Traders_Asset_Mgr_Short_All', 'Traders_Asset_Mgr_Spread_All',
        # Hedge Fund / Leveraged — positions + trader counts
        'Lev_Money_Positions_Long_All', 'Lev_Money_Positions_Short_All', 'Lev_Money_Positions_Spread_All',
        'Traders_Lev_Money_Long_All', 'Traders_Lev_Money_Short_All', 'Traders_Lev_Money_Spread_All',
        # Other Reportable — positions + trader counts
        'Other_Rept_Positions_Long_All', 'Other_Rept_Positions_Short_All', 'Other_Rept_Positions_Spread_All',
        'Traders_Other_Rept_Long_All', 'Traders_Other_Rept_Short_All', 'Traders_Other_Rept_Spread_All',
        # Total Reportable — trader counts (positions are derivable from the bucket sums)
        'Traders_Tot_Rept_Long_All', 'Traders_Tot_Rept_Short_All',
        # Non-Reportable — positions only (CFTC does not publish trader counts)
        'NonRept_Positions_Long_All', 'NonRept_Positions_Short_All',
    ]]

    df['Report_Date_as_MM_DD_YYYY'] = pd.to_datetime(df['Report_Date_as_MM_DD_YYYY'])
    df = df.sort_values('Report_Date_as_MM_DD_YYYY')

    df['Instrument'] = df['Market_and_Exchange_Names'].map(instrument_map)
    df = df[df['Instrument'].notna()].copy()

    cols_to_sum = df.columns.values.tolist()
    cols_to_sum.remove('Market_and_Exchange_Names')
    cols_to_sum.remove('Report_Date_as_MM_DD_YYYY')
    cols_to_sum.remove('Instrument')

    df[cols_to_sum] = df[cols_to_sum].apply(pd.to_numeric, errors='coerce')
    df[cols_to_sum] = df[cols_to_sum].fillna(0)

    df_summed = (
        df.groupby(['Instrument', 'Report_Date_as_MM_DD_YYYY'])[cols_to_sum]
        .sum()
        .reset_index()
    )

    return df_summed

def feature_engineering(cot_clean):
    """
    Spread-adjusts Dealer / AM / HF positions (half of the spread position is
    added to each of long and short — the standard practitioner approach;
    leaves net unchanged but states gross correctly for spread-ratio maths).
    Then recomputes Net and Net % OI from the adjusted longs/shorts.

    Matches the commodity pipeline's feature_engineering for MM/SW/OT. The
    TFF report carries a spread column for every bucket we care about, so
    all three financial buckets get the treatment.
    """

    spread_categories = [
        ('Dealer', 'Dealer_Positions_Long_All',    'Dealer_Positions_Short_All',    'Dealer_Positions_Spread_All'),
        ('AM',     'Asset_Mgr_Positions_Long_All', 'Asset_Mgr_Positions_Short_All', 'Asset_Mgr_Positions_Spread_All'),
        ('HF',     'Lev_Money_Positions_Long_All', 'Lev_Money_Positions_Short_All', 'Lev_Money_Positions_Spread_All'),
    ]

    cot_clean = cot_clean.copy()

    for cat, long_col, short_col, spread_col in spread_categories:
        cot_clean[f'Adjusted_{cat}_Long_All']  = cot_clean[long_col]  + 0.5 * cot_clean[spread_col]
        cot_clean[f'Adjusted_{cat}_Short_All'] = cot_clean[short_col] + 0.5 * cot_clean[spread_col]

    oi = cot_clean['Open_Interest_All'].replace(0, np.nan)

    cot_clean['Dealer_Net_pct'] = (cot_clean['Adjusted_Dealer_Long_All'] - cot_clean['Adjusted_Dealer_Short_All']) / oi
    cot_clean['AM_Net_pct']     = (cot_clean['Adjusted_AM_Long_All']     - cot_clean['Adjusted_AM_Short_All'])     / oi
    cot_clean['HF_Net_pct']     = (cot_clean['Adjusted_HF_Long_All']     - cot_clean['Adjusted_HF_Short_All'])     / oi

    return cot_clean

def get_align_prices(cot_clean):
    instrument_list = cot_clean['Instrument'].unique().tolist()
    tickers_list = [TICKER_MAP[inst] for inst in instrument_list if inst in TICKER_MAP]
    tickers_list
    prices = yf.download(tickers_list,start = '2018-01-01' )['Close']
    prices = prices.ffill()
    prices = prices.bfill()
    prices
    all_dfs = []
    for instr in instrument_list:
        cot_specific_instrument = cot_clean[cot_clean['Instrument'] ==instr ]
        cot_specific_instrument = cot_specific_instrument.set_index('Report_Date_as_MM_DD_YYYY')
        ticker_name = TICKER_MAP[instr]
        price_specific_instrument = pd.DataFrame(prices[ticker_name])
        merged_df = cot_specific_instrument.merge(price_specific_instrument, left_index=True, right_index=True, how = 'left')
        merged_df = merged_df.rename(columns={ticker_name: 'Price'})
        all_dfs.append(merged_df)
    cot_data = pd.concat(all_dfs)
    cot_data = cot_data.reset_index()
    return cot_data

def compute_overview(cot_clean, lookback_weeks=52, spread_threshold=75):
    """
    Takes the cleaned + feature-engineered financial COT dataframe and returns
    a snapshot (list of dicts) with one row per instrument containing all
    pre-computed fields the frontend needs.

    Mirrors the shape of the commodity overview (PM/SW/MM/OT) with the
    financial buckets (Dealer/AM/HF). Rank formula, spread ratio/flag
    mechanics, and min-5-obs gate are deliberately unified with commodity.
    """

    df = cot_clean.copy()
    df["Report_Date_as_MM_DD_YYYY"] = pd.to_datetime(df["Report_Date_as_MM_DD_YYYY"])
    df = df.sort_values(["Instrument", "Report_Date_as_MM_DD_YYYY"]).reset_index(drop=True)

    # ── Spread ratios ────────────────────────────────────────────────────────
    for prefix, long_col, short_col, spread_col in [
        ("Dealer", "Adjusted_Dealer_Long_All", "Adjusted_Dealer_Short_All", "Dealer_Positions_Spread_All"),
        ("AM",     "Adjusted_AM_Long_All",     "Adjusted_AM_Short_All",     "Asset_Mgr_Positions_Spread_All"),
        ("HF",     "Adjusted_HF_Long_All",     "Adjusted_HF_Short_All",     "Lev_Money_Positions_Spread_All"),
    ]:
        gross = df[long_col] + df[short_col] + df[spread_col]
        df[f"{prefix}_spread_ratio"] = df[spread_col] / gross.replace(0, np.nan)

    # ── Rolling percentile rank (n-1 denom, min 5 obs, rounded) ───────────────
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
        "Dealer_rank"        : "Dealer_Net_pct",
        "AM_rank"            : "AM_Net_pct",
        "HF_rank"            : "HF_Net_pct",
        "OI_rank"            : "Open_Interest_All",
        "Dealer_spread_rank" : "Dealer_spread_ratio",
        "AM_spread_rank"     : "AM_spread_ratio",
        "HF_spread_rank"     : "HF_spread_ratio",
    }
    for out_col, src_col in rank_targets.items():
        df[out_col] = (
            df.groupby("Instrument")[src_col]
            .transform(lambda s: rolling_pct_rank(s, lookback_weeks))
        )

    # ── Spread flags ──────────────────────────────────────────────────────────
    for p in ("Dealer", "AM", "HF"):
        df[f"{p}_spread_flagged"] = df[f"{p}_spread_rank"] >= spread_threshold

    # ── 1W / 1M positioning change (percentage points, not percent) ───────────
    # iloc[-2] = 1 row back = 1 week; iloc[-5] = 4 rows back ≈ 1 month.
    for p in ("Dealer", "AM", "HF"):
        df[f"{p}_chg_pp_1W"] = df.groupby("Instrument")[f"{p}_Net_pct"].transform(lambda s: (s - s.shift(1)) * 100)
        df[f"{p}_chg_pp_1M"] = df.groupby("Instrument")[f"{p}_Net_pct"].transform(lambda s: (s - s.shift(4)) * 100)

    # ── 1W / 1M OI change (percent) ───────────────────────────────────────────
    df["oi_chg_pct_1W"] = df.groupby("Instrument")["Open_Interest_All"].transform(lambda s: s.pct_change()  * 100)
    df["oi_chg_pct_1M"] = df.groupby("Instrument")["Open_Interest_All"].transform(lambda s: s.pct_change(4) * 100)

    # ── 1W / 1M price change (percent) ────────────────────────────────────────
    df["price_chg_pct_1W"] = df.groupby("Instrument")["Price"].transform(lambda s: s.pct_change()  * 100)
    df["price_chg_pct_1M"] = df.groupby("Instrument")["Price"].transform(lambda s: s.pct_change(4) * 100)

    # ── Per-instrument static fields ──────────────────────────────────────────
    df["Coverage"] = df["Instrument"].map(COVERAGE_MAP)
    df["Ticker"]   = df["Instrument"].map(TICKER_MAP)

    # ── Snapshot — latest row per instrument ──────────────────────────────────
    snapshot = (
        df.sort_values("Report_Date_as_MM_DD_YYYY")
        .groupby("Instrument")
        .last()
        .reset_index()
    )

    keep = [
        "Instrument", "Ticker", "Report_Date_as_MM_DD_YYYY", "Coverage",
        "Open_Interest_All", "OI_rank", "oi_chg_pct_1W", "oi_chg_pct_1M",
        "Price", "price_chg_pct_1W", "price_chg_pct_1M",
        "Dealer_rank", "Dealer_chg_pp_1W", "Dealer_chg_pp_1M",
        "Dealer_spread_ratio", "Dealer_spread_rank", "Dealer_spread_flagged",
        "AM_rank", "AM_chg_pp_1W", "AM_chg_pp_1M",
        "AM_spread_ratio", "AM_spread_rank", "AM_spread_flagged",
        "HF_rank", "HF_chg_pp_1W", "HF_chg_pp_1M",
        "HF_spread_ratio", "HF_spread_rank", "HF_spread_flagged",
    ]
    snapshot = snapshot[keep].copy()

    rank_cols = [c for c in keep if c.endswith("_rank")]
    snapshot[rank_cols] = snapshot[rank_cols].round(0).astype("Int64")
    snapshot["Report_Date_as_MM_DD_YYYY"] = snapshot["Report_Date_as_MM_DD_YYYY"].dt.strftime("%Y-%m-%d")

    # NaN → None for clean JSON serialisation (NaN is not valid JSON).
    snapshot = snapshot.astype(object).where(snapshot.notna(), None)

    return snapshot.to_dict(orient="records")



COT_SUMMARY_SYSTEM_PROMPT = """You are a senior futures positioning analyst writing a weekly internal note for a macro trading desk.
                     DATA CONTEXT:
                    You are given CFTC Commitments of Traders (COT) data from the Traders in Financial Futures (TFF) report.
                    Positions are spread-adjusted: half of each bucket's spread position is attributed to its long side and half to its short side (standard practitioner treatment — leaves net unchanged but states gross correctly).
                    Each instrument row has the following fields:
                    - Instrument, Ticker, Report_Date_as_MM_DD_YYYY: identifiers and snapshot date.
                    - Coverage: "high" / "moderate" / "low" — how much of real institutional positioning in this instrument is captured by futures data. See COVERAGE RULES below.
                    - Open_Interest_All: total contracts outstanding. OI_rank: percentile rank of current OI in the lookback window (100 = most participation in the window).
                    - oi_chg_pct_1W / oi_chg_pct_1M: percentage change in total open interest over 1 week / 1 month.
                    - Price, price_chg_pct_1W, price_chg_pct_1M: price from aligned yfinance data and its percent changes.
                    - Dealer_rank, AM_rank, HF_rank: percentile rank of current spread-adjusted net / OI vs the lookback window. 0 = most net short in the window. 100 = most net long. 50 = median.
                    - Dealer_chg_pp_1W / Dealer_chg_pp_1M (and same for AM, HF): change in spread-adjusted net / OI over 1 week / 1 month, in percentage points (not percent).
                    - Dealer_spread_ratio, AM_spread_ratio, HF_spread_ratio: share of that bucket's gross positioning that is spread (calendar) positions rather than outright directional. Higher = more spreading.
                    - Dealer_spread_rank, AM_spread_rank, HF_spread_rank: percentile rank of the spread ratio in the lookback window.
                    - Dealer_spread_flagged, AM_spread_flagged, HF_spread_flagged: True when the spread rank is at or above the 75th percentile. When True, the bucket's positioning rank is a less reliable directional signal — an unusually large share of its positioning is calendar spreading, not outright conviction. Caveat that bucket's signal accordingly.

                    The lookback window is provided in each user message. A 13-week lookback captures recent regime. 52-week captures a full year. This affects rank interpretation — a rank of 95 on 13w means "most extreme in 3 months", on 52w means "most extreme in a year."

                    COVERAGE RULES (always defer to the Coverage field on the row):
                    - HIGH coverage (rates, FX): Make assertive claims. This data is close to the full picture. Rank extremes here are genuine signals.
                    - MODERATE coverage (equity indices): Qualify claims. Say "futures positioning suggests..." not "the market is positioned for...". Institutions have significant exposure outside futures that this data does not capture.
                    - LOW coverage (BTC): Always caveat. Post-ETF, this data primarily reflects hedge fund basis trades, not overall institutional sentiment. Do not draw broad conclusions about "the market" from BTC futures positioning alone.
                    - Never present a low-coverage signal with the same confidence as a high-coverage signal. If rates and BTC both show an extreme, the rates signal is far more meaningful — say so explicitly.

                    INTERPRETATION GUIDANCE:
                    - Consider what divergences between groups might imply about who will need to adjust.
                    - When a bucket's *_spread_flagged is True, explicitly treat that bucket's rank as less reliable for the week — the positioning is meaningfully calendar-spread activity rather than directional conviction.
                    - Distinguish between voluntary repositioning and forced liquidation where the data suggests it.
                    - Weight monthly changes over weekly — single-week moves are noisy.
                    - Consider coverage strength when making claims. Be more assertive on rates/FX, more cautious on BTC.
                    - Asset managers (AM) include pension funds, insurance companies, and sovereign wealth funds. They operate on longer horizons with structural mandates. Their positioning changes reflect strategic allocation shifts, not short-term directional bets. Do not interpret AM moves the same way you interpret HF moves.
                    - Dealers are market makers hedging client flow. Their positioning mirrors the opposite side of client demand. Do not interpret dealer positioning as a directional view — interpret it as a measure of how much flow they are warehousing.
                    - Hedge funds (leveraged money) are the most tactical and reactive group. Their positioning most closely reflects short-term directional sentiment.


                    YOUR TASK:
                    Write a positioning note structured as follows:

                    1. MACRO PICTURE (2-3 sentences): What is the overall positioning landscape saying? Are markets positioned for risk-on, risk-off, rate cuts, inflation? Synthesize across all instruments — don't just list them individually.

                    2. STRONGEST SIGNALS (2-3 paragraphs): Identify the 2-3 most significant positioning setups. For each:
                    - State the positioning fact
                    - Interpret what it means — why is this group positioned this way? What view does it imply?
                    - Compare across instruments where relevant (e.g. "AM is long duration but short equities, consistent with recession positioning")
                    - Flag fragility — is this crowded? Is a bucket's signal weakened by an elevated spread flag? Who gets forced out first?

                    3. CROSS-INSTRUMENT THEMES: Where do you see the same story showing up across multiple instruments? For example: are rate and FX positioning telling the same story? Does equity positioning contradict what rates are saying? Call out consistency and contradictions.

                    4. KEY RISKS (2-3 bullet points): What could force repositioning? What is the market not pricing?

                    Use bold for instrument names. Be direct and opinionated about what the data implies. Do not just describe the numbers — interpret what they mean for market sentiment and where the crowded or fragile trades are.
                    Do not recommend buying or selling any instrument or give price targets.

                    Keep total output under 350 words."""


def generate_cot_summary(overview_data, lookback_weeks=52):
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=[{
            "type": "text",
            "text": COT_SUMMARY_SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{
            "role": "user",
            "content": f"Here is the latest CFTC COT positioning overview using a {lookback_weeks}-week lookback. Summarize the key observations in under 300 words.\n\n{json.dumps(overview_data, indent=2)}"
        }]
    )

    usage = message.usage
    print(
        f"[cot_summary lb={lookback_weeks}w] stop={message.stop_reason} "
        f"cache_write={getattr(usage, 'cache_creation_input_tokens', 0)} "
        f"cache_read={getattr(usage, 'cache_read_input_tokens', 0)} "
        f"input={usage.input_tokens} output={usage.output_tokens}"
    )

    return message.content[0].text




def refresh_cot_data():
    cot_raw = download_cot_data([2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026])
    cot_clean = clean_financial_cot_data(cot_raw, INSTRUMENT_MAP)
    cot_clean
    cot_clean = feature_engineering(cot_clean)
    cot_clean = get_align_prices(cot_clean)
    cot_clean.to_csv('cot_clean.csv')

    for lb in [13, 26, 52]:
        overview_data = compute_overview(cot_clean, lookback_weeks=lb)
        
        try:
            summary = generate_cot_summary(overview_data, lookback_weeks=lb)
        except Exception as e:
            print(f"Summary generation failed for {lb}w: {e}")
            summary = None
        
        output = {
            "instruments": overview_data,
            "summary": summary,
        }
        
        with open(f'financials_cot_overview_{lb}w.json', 'w') as f:
            json.dump(output, f, default=str)


    

















    
