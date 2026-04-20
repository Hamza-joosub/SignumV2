import yfinance as yf
import pandas as pd
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


def wavg(group, conc_cols):
        weights = group['Open_Interest_All']
        total = weights.sum()
        if total == 0:
            return pd.Series({c: 0.0 for c in conc_cols})
        return pd.Series({c: (group[c] * weights).sum() / total for c in conc_cols})

def clean_financial_cot_data(df, instrument_map):
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
        'Report_Date_as_MM_DD_YYYY', 
        'Open_Interest_All', 

        # Dealer
        'Dealer_Positions_Long_All', 'Dealer_Positions_Short_All', 'Dealer_Positions_Spread_All',
        # Asset Manager
        'Asset_Mgr_Positions_Long_All', 'Asset_Mgr_Positions_Short_All', 'Asset_Mgr_Positions_Spread_All',
        # Hedge Fund / Leveraged
        'Lev_Money_Positions_Long_All', 'Lev_Money_Positions_Short_All', 'Lev_Money_Positions_Spread_All',
        # Other Reportable
        'Other_Rept_Positions_Long_All', 'Other_Rept_Positions_Short_All', 'Other_Rept_Positions_Spread_All',
        # Non-Reportable
        'NonRept_Positions_Long_All', 'NonRept_Positions_Short_All',

        # Concentration — top 4 and top 8 traders
        'Conc_Gross_LE_4_TDR_Long_All', 'Conc_Gross_LE_4_TDR_Short_All',
        'Conc_Gross_LE_8_TDR_Long_All', 'Conc_Gross_LE_8_TDR_Short_All',
    ]]


    df['Report_Date_as_MM_DD_YYYY'] = pd.to_datetime(df['Report_Date_as_MM_DD_YYYY'])
    df = df.sort_values('Report_Date_as_MM_DD_YYYY')

    df['Instrument'] = df['Market_and_Exchange_Names'].map(instrument_map)
    df = df[df['Instrument'].notna()].copy()

    conc_cols = [
        'Conc_Gross_LE_4_TDR_Long_All', 'Conc_Gross_LE_4_TDR_Short_All',
        'Conc_Gross_LE_8_TDR_Long_All', 'Conc_Gross_LE_8_TDR_Short_All',
    ]

    cols_to_sum = df.columns.values.tolist()
    cols_to_sum.remove('Market_and_Exchange_Names')
    cols_to_sum.remove('Report_Date_as_MM_DD_YYYY')
    cols_to_sum.remove('Instrument')
    for c in conc_cols:
        cols_to_sum.remove(c)

    # Sum position columns
    df_summed = (
        df.groupby(['Instrument', 'Report_Date_as_MM_DD_YYYY'])[cols_to_sum]
        .sum()
        .reset_index()
    )

    # Weighted average concentration by OI
    

    df_conc = (
        df.groupby(['Instrument', 'Report_Date_as_MM_DD_YYYY'])
        .apply(wavg, conc_cols)
        .reset_index()
    )

    df = df_summed.merge(df_conc, on=['Instrument', 'Report_Date_as_MM_DD_YYYY'])


    return df


def feature_engineering(cot_clean):
    cot_clean["Dealer Net"] = cot_clean['Dealer_Positions_Long_All'] - cot_clean['Dealer_Positions_Short_All']
    cot_clean["Asset Manager Net"] = cot_clean['Asset_Mgr_Positions_Long_All'] - cot_clean['Asset_Mgr_Positions_Short_All'] 
    cot_clean["Levered Net"] = cot_clean['Lev_Money_Positions_Long_All'] - cot_clean['Lev_Money_Positions_Short_All']
    cot_clean["Other Rept Positions Net"] = cot_clean['Other_Rept_Positions_Long_All'] - cot_clean['Other_Rept_Positions_Short_All']
    cot_clean["Non Rept Positions Net"] = cot_clean['NonRept_Positions_Long_All'] - cot_clean['NonRept_Positions_Short_All']
    
    # In feature_engineering:
    cot_clean["Dealer Net Pct OI"] = cot_clean["Dealer Net"] / cot_clean["Open_Interest_All"]
    cot_clean["AM Net Pct OI"] = cot_clean["Asset Manager Net"] / cot_clean["Open_Interest_All"]
    cot_clean["HF Net Pct OI"] = cot_clean["Levered Net"] / cot_clean["Open_Interest_All"]
    cot_clean["Other Rept Positions Net Pct OI"] = cot_clean['Other Rept Positions Net']/cot_clean["Open_Interest_All"]
    cot_clean["Non Rept Positions Net Pct OI"] = cot_clean['Non Rept Positions Net']/cot_clean["Open_Interest_All"]


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

def compute_overview(cot_clean, lookback_weeks=104):
    overview = []
    for inst in cot_clean['Instrument'].unique():
        df = cot_clean[cot_clean['Instrument'] == inst].copy()
        window = df.tail(lookback_weeks)
        

        latest = window.iloc[-1]
        dlr_pctl = (window['Dealer Net Pct OI'] < latest['Dealer Net Pct OI']).mean() * 100  
        am_pctl = (window['AM Net Pct OI'] < latest['AM Net Pct OI']).mean() * 100
        hf_pctl = (window['HF Net Pct OI'] < latest['HF Net Pct OI']).mean() * 100

        """
        1 Week stuff(quite noisy) ______________________
        """
        prev_1W = window.iloc[-2]
        
        dlr_chg_pct_oi_1W = float(latest['Dealer Net Pct OI'] - prev_1W['Dealer Net Pct OI'])
        am_chg_pct_oi_1W = float(latest['AM Net Pct OI'] - prev_1W['AM Net Pct OI'])
        hf_chg_pct_oi_1W = float(latest['HF Net Pct OI'] - prev_1W['HF Net Pct OI'])

        oi_chg_1W = int(latest['Open_Interest_All'] - prev_1W['Open_Interest_All'])
        oi_chg_pct_1W = (latest['Open_Interest_All'] - prev_1W['Open_Interest_All']) / prev_1W['Open_Interest_All']

        price_1W = float(latest['Price']) if pd.notna(latest.get('Price')) else None
        prev_price_1W = float(prev_1W['Price']) if pd.notna(prev_1W.get('Price')) else None
        price_chg_pct_1W =  ( ( (price_1W - prev_price_1W) / prev_price_1W)*100) if (price_1W and prev_price_1W) else None


        """
        1 Month stuff(Less noisy) ______________________
        """
        prev_1M = window.iloc[-5]
        

        dlr_chg_pct_oi_1M = float(latest['Dealer Net Pct OI'] - prev_1M['Dealer Net Pct OI'])
        am_chg_pct_oi_1M = float(latest['AM Net Pct OI'] - prev_1M['AM Net Pct OI'])
        hf_chg_pct_oi_1M = float(latest['HF Net Pct OI'] - prev_1M['HF Net Pct OI'])

        oi_chg_1M = int(latest['Open_Interest_All'] - prev_1M['Open_Interest_All'])
        oi_chg_pct_1M = (latest['Open_Interest_All'] - prev_1M['Open_Interest_All']) / prev_1M['Open_Interest_All']

        price_1M = float(latest['Price']) if pd.notna(latest.get('Price')) else None
        prev_price_1M = float(prev_1M['Price']) if pd.notna(prev_1M.get('Price')) else None
        price_chg_pct_1M =  ( ( (price_1M - prev_price_1M) / prev_price_1M)*100) if (price_1M and prev_price_1M) else None



        conc_cols = [
            'Conc_Gross_LE_4_TDR_Long_All', 'Conc_Gross_LE_4_TDR_Short_All',
            'Conc_Gross_LE_8_TDR_Long_All', 'Conc_Gross_LE_8_TDR_Short_All',
        ]

        conc = {}
        for col in conc_cols:
            if col in latest.index and pd.notna(latest[col]):
                conc[col] = float(latest[col])
                conc[f'{col}_chg_1W'] = round(float(latest[col] - prev_1W[col]), 2) if pd.notna(prev_1W[col]) else None
                conc[f'{col}_chg_1M'] = round(float(latest[col] - prev_1M[col]), 2) if pd.notna(prev_1M[col]) else None 

        overview.append({
                'instrument': inst,
                'ticker': TICKER_MAP.get(inst, ''),
                'latest_date': latest['Report_Date_as_MM_DD_YYYY'].strftime('%Y-%m-%d') if hasattr(latest['Report_Date_as_MM_DD_YYYY'], 'strftime') else str(latest['Report_Date_as_MM_DD_YYYY'])[:10],
                'oi': int(latest['Open_Interest_All']),

                # Price
                'price': price_1W,
                'price_chg_pct_1W': float(price_chg_pct_1W) if price_chg_pct_1W is not None else None,
                'price_chg_pct_1M': float(price_chg_pct_1M) if price_chg_pct_1M is not None else None,

                # Dealer — positioning
                'dealer_net': int(latest['Dealer Net']),
                'dealer_net_pct_oi': float(latest['Dealer Net Pct OI']),
                'dealer_pctl': float(dlr_pctl),
                'dealer_chg_pct_oi_1W': dlr_chg_pct_oi_1W,
                'dealer_chg_pct_oi_1M': dlr_chg_pct_oi_1M,

                # Asset Manager — positioning
                'am_net': int(latest['Asset Manager Net']),
                'am_net_pct_oi': float(latest['AM Net Pct OI']),
                'am_pctl': float(am_pctl),
                'am_chg_pct_oi_1W': am_chg_pct_oi_1W,
                'am_chg_pct_oi_1M': am_chg_pct_oi_1M,

                # Hedge Fund — positioning
                'hf_net': int(latest['Levered Net']),
                'hf_net_pct_oi': float(latest['HF Net Pct OI']),
                'hf_pctl': float(hf_pctl),
                'hf_chg_pct_oi_1W': hf_chg_pct_oi_1W,
                'hf_chg_pct_oi_1M': hf_chg_pct_oi_1M,

                # OI
                'oi_chg_1W': oi_chg_1W,
                'oi_chg_pct_1W': float(oi_chg_pct_1W),
                'oi_chg_1M': oi_chg_1M,
                'oi_chg_pct_1M': float(oi_chg_pct_1M),

                # Concentration
                **conc,
            })

    return overview



COT_SUMMARY_SYSTEM_PROMPT = """You are a senior futures positioning analyst writing a weekly internal note for a macro trading desk.
                     DATA CONTEXT:
                    You are given CFTC Commitments of Traders (COT) data from the Traders in Financial Futures (TFF) report.
                    Each instrument has the following fields:
                    - dealer_net, am_net, hf_net: net contracts (long - short) for Dealers, Asset Managers, and Leveraged Money (hedge funds)
                    - dealer_net_pct_oi, am_net_pct_oi, hf_net_pct_oi: net position as percentage of total open interest (the key normalized metric)
                    - dealer_pctl, am_pctl, hf_pctl: percentile rank of current net/OI vs the lookback window. 0 = most net short in the window. 100 = most net long. 50 = median.
                    - _chg_pct_oi_1W / _chg_pct_oi_1M: change in net/OI over 1 week and 1 month (in percentage points, not percent)
                    - oi_chg_pct_1W / _1M: percentage change in total open interest
                    - price_chg_pct_1W / _1M: percentage change in price (from aligned yfinance data)
                    - Conc_Gross_LE_4_TDR_Long/Short_All: percentage of OI held by the top 4 traders on each side
                    - Conc_Gross_LE_8_TDR_Long/Short_All: same for top 8

                    The lookback window is provided in each user message. A 13-week lookback captures recent regime. 52-week captures a full year. This affects percentile interpretation — a p95 on 13w means "most extreme in 3 months", on 52w means "most extreme in a year."

                    COVERAGE STRENGTH:
                    COVERAGE RULES:
                    - HIGH coverage (rates, FX): Make assertive claims. This data is close to the full picture. Percentile extremes here are genuine signals.
                    - MODERATE coverage (equity indices): Qualify claims. Say "futures positioning suggests..." not "the market is positioned for...". Institutions have significant exposure outside futures that this data does not capture.
                    - LOW coverage (BTC): Always caveat. Post-ETF, this data primarily reflects hedge fund basis trades, not overall institutional sentiment. Do not draw broad conclusions about "the market" from BTC futures positioning alone.
                    - Never present a low-coverage signal with the same confidence as a high-coverage signal. If rates and BTC both show an extreme, the rates signal is far more meaningful — say so explicitly.

                    INTERPRETATION GUIDANCE:
                    - Consider what divergences between groups might imply about who will need to adjust.
                    - Note when concentration is high enough that a single participant could move the market.
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
                    - Flag fragility — is this crowded? Is concentration dangerous? Who gets forced out first?

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
        
        with open(f'cot_overview_{lb}w.json', 'w') as f:
            json.dump(output, f, default=str)
    
    

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

 




    

















    
