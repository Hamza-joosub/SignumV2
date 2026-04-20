# api/services/market_service.py

import yfinance as yf
import pandas as pd

import datetime as dt
from datetime import timedelta


TICKER_DICTIONARY = {

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 1: REGIONS
    # ══════════════════════════════════════════════════════════════════
    'VOO':    {'label': 'US',            'category': 'stocks', 'level': 1, 'weight': 200},
    'QQQ':    {'label': 'Nasdaq 100',    'category': 'stocks', 'level': 1, 'weight': 180},
    'IWM':    {'label': 'Russell 2000',  'category': 'stocks', 'level': 1, 'weight': 70},
    'EWJ':    {'label': 'Japan',         'category': 'stocks', 'level': 1, 'weight': 70},
    'FXI':    {'label': 'China',         'category': 'stocks', 'level': 1, 'weight': 70},
    'EWG':    {'label': 'Germany',       'category': 'stocks', 'level': 1, 'weight': 60},
    'EWU':    {'label': 'UK',            'category': 'stocks', 'level': 1, 'weight': 60},
    'INDA':   {'label': 'India',         'category': 'stocks', 'level': 1, 'weight': 60},
    'EWT':    {'label': 'Taiwan',        'category': 'stocks', 'level': 1, 'weight': 50},
    'EWZ':    {'label': 'Brazil',        'category': 'stocks', 'level': 1, 'weight': 50},
    'EZA':    {'label': 'South Africa',  'category': 'stocks', 'level': 1, 'weight': 40},
    'EWA':    {'label': 'Australia',     'category': 'stocks', 'level': 1, 'weight': 40},
    'EWY':    {'label': 'South Korea',   'category': 'stocks', 'level': 1, 'weight': 45},
    'EWC':    {'label': 'Canada',        'category': 'stocks', 'level': 1, 'weight': 45},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: US SECTORS (parent = VOO)
    # ══════════════════════════════════════════════════════════════════
    'XLK':    {'label': 'Technology',       'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 150},
    'XLF':    {'label': 'Financials',       'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 100},
    'XLV':    {'label': 'Healthcare',       'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 90},
    'XLY':    {'label': 'Consumer Disc',    'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 80},
    'XLP':    {'label': 'Consumer Staples', 'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 60},
    'XLE':    {'label': 'Energy',           'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 70},
    'XLI':    {'label': 'Industrials',      'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 70},
    'XLC':    {'label': 'Communication',    'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 60},
    'XLU':    {'label': 'Utilities',        'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 40},
    'XLRE':   {'label': 'Real Estate',      'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 35},
    'XLB':    {'label': 'Materials',        'category': 'stocks', 'level': 2, 'parent': 'VOO', 'weight': 35},

    
    

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: TECHNOLOGY STOCKS (parent = XLK)
    # ══════════════════════════════════════════════════════════════════
    'NVDA':   {'label': 'Nvidia',        'category': 'stocks', 'level': 3, 'parent': 'XLK', 'weight': 150},
    'AAPL':   {'label': 'Apple',         'category': 'stocks', 'level': 3, 'parent': 'XLK', 'weight': 140},
    'MSFT':   {'label': 'Microsoft',     'category': 'stocks', 'level': 3, 'parent': 'XLK', 'weight': 140},
    'AVGO':   {'label': 'Broadcom',      'category': 'stocks', 'level': 3, 'parent': 'XLK', 'weight': 90},
    'AMD':    {'label': 'AMD',           'category': 'stocks', 'level': 3, 'parent': 'XLK', 'weight': 70},
    'ADBE':   {'label': 'Adobe',         'category': 'stocks', 'level': 3, 'parent': 'XLK', 'weight': 55},
    'CRM':    {'label': 'Salesforce',    'category': 'stocks', 'level': 3, 'parent': 'XLK', 'weight': 55},
    'ORCL':   {'label': 'Oracle',        'category': 'stocks', 'level': 3, 'parent': 'XLK', 'weight': 50},
    'INTC':   {'label': 'Intel',         'category': 'stocks', 'level': 3, 'parent': 'XLK', 'weight': 40},
    'CSCO':   {'label': 'Cisco',         'category': 'stocks', 'level': 3, 'parent': 'XLK', 'weight': 40},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: FINANCIALS (parent = XLF)
    # ══════════════════════════════════════════════════════════════════
    'BRK-B':  {'label': 'Berkshire',      'category': 'stocks', 'level': 3, 'parent': 'XLF', 'weight': 90},
    'JPM':    {'label': 'JPMorgan',       'category': 'stocks', 'level': 3, 'parent': 'XLF', 'weight': 80},
    'V':      {'label': 'Visa',           'category': 'stocks', 'level': 3, 'parent': 'XLF', 'weight': 70},
    'MA':     {'label': 'Mastercard',     'category': 'stocks', 'level': 3, 'parent': 'XLF', 'weight': 65},
    'GS':     {'label': 'Goldman Sachs',  'category': 'stocks', 'level': 3, 'parent': 'XLF', 'weight': 60},
    'MS':     {'label': 'Morgan Stanley', 'category': 'stocks', 'level': 3, 'parent': 'XLF', 'weight': 50},
    'BAC':    {'label': 'Bank of America','category': 'stocks', 'level': 3, 'parent': 'XLF', 'weight': 50},
    'WFC':    {'label': 'Wells Fargo',    'category': 'stocks', 'level': 3, 'parent': 'XLF', 'weight': 40},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: HEALTHCARE (parent = XLV)
    # ══════════════════════════════════════════════════════════════════
    'LLY':    {'label': 'Eli Lilly',      'category': 'stocks', 'level': 3, 'parent': 'XLV', 'weight': 80},
    'UNH':    {'label': 'UnitedHealth',   'category': 'stocks', 'level': 3, 'parent': 'XLV', 'weight': 75},
    'JNJ':    {'label': 'J&J',            'category': 'stocks', 'level': 3, 'parent': 'XLV', 'weight': 60},
    'ABBV':   {'label': 'AbbVie',         'category': 'stocks', 'level': 3, 'parent': 'XLV', 'weight': 55},
    'PFE':    {'label': 'Pfizer',         'category': 'stocks', 'level': 3, 'parent': 'XLV', 'weight': 40},
    'MRK':    {'label': 'Merck',          'category': 'stocks', 'level': 3, 'parent': 'XLV', 'weight': 50},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: CONSUMER DISCRETIONARY (parent = XLY)
    # ══════════════════════════════════════════════════════════════════
    'AMZN':   {'label': 'Amazon',         'category': 'stocks', 'level': 3, 'parent': 'XLY', 'weight': 130},
    'TSLA':   {'label': 'Tesla',          'category': 'stocks', 'level': 3, 'parent': 'XLY', 'weight': 100},
    'HD':     {'label': 'Home Depot',     'category': 'stocks', 'level': 3, 'parent': 'XLY', 'weight': 55},
    'MCD':    {'label': 'McDonalds',      'category': 'stocks', 'level': 3, 'parent': 'XLY', 'weight': 50},
    'NKE':    {'label': 'Nike',           'category': 'stocks', 'level': 3, 'parent': 'XLY', 'weight': 40},
    'NFLX':   {'label': 'Netflix',        'category': 'stocks', 'level': 3, 'parent': 'XLY', 'weight': 65},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: CONSUMER STAPLES (parent = XLP)
    # ══════════════════════════════════════════════════════════════════
    'PG':     {'label': 'Procter & Gamble','category': 'stocks', 'level': 3, 'parent': 'XLP', 'weight': 60},
    'KO':     {'label': 'Coca-Cola',       'category': 'stocks', 'level': 3, 'parent': 'XLP', 'weight': 55},
    'PEP':    {'label': 'PepsiCo',         'category': 'stocks', 'level': 3, 'parent': 'XLP', 'weight': 50},
    'COST':   {'label': 'Costco',          'category': 'stocks', 'level': 3, 'parent': 'XLP', 'weight': 60},
    'WMT':    {'label': 'Walmart',         'category': 'stocks', 'level': 3, 'parent': 'XLP', 'weight': 55},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: ENERGY (parent = XLE)
    # ══════════════════════════════════════════════════════════════════
    'XOM':    {'label': 'Exxon',          'category': 'stocks', 'level': 3, 'parent': 'XLE', 'weight': 70},
    'CVX':    {'label': 'Chevron',        'category': 'stocks', 'level': 3, 'parent': 'XLE', 'weight': 60},
    'COP':    {'label': 'ConocoPhillips', 'category': 'stocks', 'level': 3, 'parent': 'XLE', 'weight': 45},
    'SLB':    {'label': 'Schlumberger',   'category': 'stocks', 'level': 3, 'parent': 'XLE', 'weight': 35},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: INDUSTRIALS (parent = XLI)
    # ══════════════════════════════════════════════════════════════════
    'CAT':    {'label': 'Caterpillar',    'category': 'stocks', 'level': 3, 'parent': 'XLI', 'weight': 55},
    'GE':     {'label': 'GE Aerospace',   'category': 'stocks', 'level': 3, 'parent': 'XLI', 'weight': 55},
    'UPS':    {'label': 'UPS',            'category': 'stocks', 'level': 3, 'parent': 'XLI', 'weight': 40},
    'BA':     {'label': 'Boeing',         'category': 'stocks', 'level': 3, 'parent': 'XLI', 'weight': 45},
    'HON':    {'label': 'Honeywell',      'category': 'stocks', 'level': 3, 'parent': 'XLI', 'weight': 40},
    'LMT':    {'label': 'Lockheed Martin','category': 'stocks', 'level': 3, 'parent': 'XLI', 'weight': 45},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: COMMUNICATION (parent = XLC)
    # ══════════════════════════════════════════════════════════════════
    'META':   {'label': 'Meta',           'category': 'stocks', 'level': 3, 'parent': 'XLC', 'weight': 110},
    'GOOG':   {'label': 'Alphabet',       'category': 'stocks', 'level': 3, 'parent': 'XLC', 'weight': 120},
    'DIS':    {'label': 'Disney',         'category': 'stocks', 'level': 3, 'parent': 'XLC', 'weight': 50},
    'CMCSA':  {'label': 'Comcast',        'category': 'stocks', 'level': 3, 'parent': 'XLC', 'weight': 35},
    'TMUS':   {'label': 'T-Mobile',       'category': 'stocks', 'level': 3, 'parent': 'XLC', 'weight': 40},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: UTILITIES (parent = XLU)
    # ══════════════════════════════════════════════════════════════════
    'NEE':    {'label': 'NextEra Energy', 'category': 'stocks', 'level': 3, 'parent': 'XLU', 'weight': 45},
    'DUK':    {'label': 'Duke Energy',    'category': 'stocks', 'level': 3, 'parent': 'XLU', 'weight': 35},
    'SO':     {'label': 'Southern Co',    'category': 'stocks', 'level': 3, 'parent': 'XLU', 'weight': 35},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: REAL ESTATE (parent = XLRE)
    # ══════════════════════════════════════════════════════════════════
    'AMT':    {'label': 'American Tower', 'category': 'stocks', 'level': 3, 'parent': 'XLRE', 'weight': 40},
    'PLD':    {'label': 'Prologis',       'category': 'stocks', 'level': 3, 'parent': 'XLRE', 'weight': 40},
    'SPG':    {'label': 'Simon Property', 'category': 'stocks', 'level': 3, 'parent': 'XLRE', 'weight': 30},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: MATERIALS (parent = XLB)
    # ══════════════════════════════════════════════════════════════════
    'LIN':    {'label': 'Linde',          'category': 'stocks', 'level': 3, 'parent': 'XLB', 'weight': 45},
    'APD':    {'label': 'Air Products',   'category': 'stocks', 'level': 3, 'parent': 'XLB', 'weight': 30},
    'SHW':    {'label': 'Sherwin-Williams','category': 'stocks', 'level': 3, 'parent': 'XLB', 'weight': 35},



    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: JAPAN TOP STOCKS (parent = EWJ)
    # ══════════════════════════════════════════════════════════════════
    '7203.T':   {'label': 'Toyota',          'category': 'stocks', 'level': 2, 'parent': 'EWJ', 'weight': 120},
    '6758.T':   {'label': 'Sony',            'category': 'stocks', 'level': 2, 'parent': 'EWJ', 'weight': 100},
    '6861.T':   {'label': 'Keyence',         'category': 'stocks', 'level': 2, 'parent': 'EWJ', 'weight': 80},
    '9984.T':   {'label': 'SoftBank',        'category': 'stocks', 'level': 2, 'parent': 'EWJ', 'weight': 70},
    '8306.T':   {'label': 'MUFG',            'category': 'stocks', 'level': 2, 'parent': 'EWJ', 'weight': 65},
    '6902.T':   {'label': 'Denso',           'category': 'stocks', 'level': 2, 'parent': 'EWJ', 'weight': 50},
    '9432.T':   {'label': 'NTT',             'category': 'stocks', 'level': 2, 'parent': 'EWJ', 'weight': 55},
    '4063.T':   {'label': 'Shin-Etsu',       'category': 'stocks', 'level': 2, 'parent': 'EWJ', 'weight': 60},
    '7741.T':   {'label': 'HOYA',            'category': 'stocks', 'level': 2, 'parent': 'EWJ', 'weight': 45},
    '6501.T':   {'label': 'Hitachi',         'category': 'stocks', 'level': 2, 'parent': 'EWJ', 'weight': 50},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: UK TOP STOCKS (parent = EWU)
    # ══════════════════════════════════════════════════════════════════
    'SHEL.L':   {'label': 'Shell',           'category': 'stocks', 'level': 2, 'parent': 'EWU', 'weight': 120},
    'AZN.L':    {'label': 'AstraZeneca',     'category': 'stocks', 'level': 2, 'parent': 'EWU', 'weight': 110},
    'HSBA.L':   {'label': 'HSBC',            'category': 'stocks', 'level': 2, 'parent': 'EWU', 'weight': 80},
    'ULVR.L':   {'label': 'Unilever',        'category': 'stocks', 'level': 2, 'parent': 'EWU', 'weight': 75},
    'BP.L':     {'label': 'BP',              'category': 'stocks', 'level': 2, 'parent': 'EWU', 'weight': 65},
    'GSK.L':    {'label': 'GSK',             'category': 'stocks', 'level': 2, 'parent': 'EWU', 'weight': 55},
    'RIO.L':    {'label': 'Rio Tinto',       'category': 'stocks', 'level': 2, 'parent': 'EWU', 'weight': 55},
    'LSEG.L':   {'label': 'LSEG',           'category': 'stocks', 'level': 2, 'parent': 'EWU', 'weight': 50},
    'BARC.L':   {'label': 'Barclays',        'category': 'stocks', 'level': 2, 'parent': 'EWU', 'weight': 45},
    'DGE.L':    {'label': 'Diageo',          'category': 'stocks', 'level': 2, 'parent': 'EWU', 'weight': 45},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: GERMANY TOP STOCKS (parent = EWG)
    # ══════════════════════════════════════════════════════════════════
    'SAP.DE':   {'label': 'SAP',             'category': 'stocks', 'level': 2, 'parent': 'EWG', 'weight': 120},
    'SIE.DE':   {'label': 'Siemens',         'category': 'stocks', 'level': 2, 'parent': 'EWG', 'weight': 80},
    'ALV.DE':   {'label': 'Allianz',         'category': 'stocks', 'level': 2, 'parent': 'EWG', 'weight': 70},
    'DTE.DE':   {'label': 'Deutsche Telekom','category': 'stocks', 'level': 2, 'parent': 'EWG', 'weight': 65},
    'MUV2.DE':  {'label': 'Munich Re',       'category': 'stocks', 'level': 2, 'parent': 'EWG', 'weight': 55},
    'BAS.DE':   {'label': 'BASF',            'category': 'stocks', 'level': 2, 'parent': 'EWG', 'weight': 45},
    'BMW.DE':   {'label': 'BMW',             'category': 'stocks', 'level': 2, 'parent': 'EWG', 'weight': 50},
    'MBG.DE':   {'label': 'Mercedes-Benz',   'category': 'stocks', 'level': 2, 'parent': 'EWG', 'weight': 50},
    'ADS.DE':   {'label': 'Adidas',          'category': 'stocks', 'level': 2, 'parent': 'EWG', 'weight': 45},
    'DBK.DE':   {'label': 'Deutsche Bank',   'category': 'stocks', 'level': 2, 'parent': 'EWG', 'weight': 40},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: CHINA TOP STOCKS (parent = FXI)
    # ══════════════════════════════════════════════════════════════════
    'BABA':     {'label': 'Alibaba',         'category': 'stocks', 'level': 2, 'parent': 'FXI', 'weight': 120},
    '0700.HK':  {'label': 'Tencent',         'category': 'stocks', 'level': 2, 'parent': 'FXI', 'weight': 120},
    '1211.HK':  {'label': 'BYD',             'category': 'stocks', 'level': 2, 'parent': 'FXI', 'weight': 70},
    'PDD':      {'label': 'PDD Holdings',    'category': 'stocks', 'level': 2, 'parent': 'FXI', 'weight': 65},
    'JD':       {'label': 'JD.com',          'category': 'stocks', 'level': 2, 'parent': 'FXI', 'weight': 55},
    '3690.HK':  {'label': 'Meituan',         'category': 'stocks', 'level': 2, 'parent': 'FXI', 'weight': 55},
    '0939.HK':  {'label': 'CCB',             'category': 'stocks', 'level': 2, 'parent': 'FXI', 'weight': 50},
    '1398.HK':  {'label': 'ICBC',            'category': 'stocks', 'level': 2, 'parent': 'FXI', 'weight': 50},
    'BIDU':     {'label': 'Baidu',           'category': 'stocks', 'level': 2, 'parent': 'FXI', 'weight': 40},
    'NIO':      {'label': 'NIO',             'category': 'stocks', 'level': 2, 'parent': 'FXI', 'weight': 35},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: INDIA TOP STOCKS (parent = INDA)
    # ══════════════════════════════════════════════════════════════════
    'RELIANCE.NS': {'label': 'Reliance',     'category': 'stocks', 'level': 2, 'parent': 'INDA', 'weight': 120},
    'TCS.NS':      {'label': 'TCS',          'category': 'stocks', 'level': 2, 'parent': 'INDA', 'weight': 90},
    'HDFCBANK.NS': {'label': 'HDFC Bank',    'category': 'stocks', 'level': 2, 'parent': 'INDA', 'weight': 80},
    'INFY.NS':     {'label': 'Infosys',      'category': 'stocks', 'level': 2, 'parent': 'INDA', 'weight': 70},
    'ICICIBANK.NS':{'label': 'ICICI Bank',   'category': 'stocks', 'level': 2, 'parent': 'INDA', 'weight': 60},
    'HINDUNILVR.NS':{'label': 'HUL',         'category': 'stocks', 'level': 2, 'parent': 'INDA', 'weight': 50},
    'ITC.NS':      {'label': 'ITC',          'category': 'stocks', 'level': 2, 'parent': 'INDA', 'weight': 45},
    'SBIN.NS':     {'label': 'SBI',          'category': 'stocks', 'level': 2, 'parent': 'INDA', 'weight': 45},
    'BHARTIARTL.NS':{'label': 'Airtel',      'category': 'stocks', 'level': 2, 'parent': 'INDA', 'weight': 55},
    'LT.NS':       {'label': 'L&T',          'category': 'stocks', 'level': 2, 'parent': 'INDA', 'weight': 40},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: BRAZIL TOP STOCKS (parent = EWZ)
    # ══════════════════════════════════════════════════════════════════
    'VALE3.SA':  {'label': 'Vale',           'category': 'stocks', 'level': 2, 'parent': 'EWZ', 'weight': 100},
    'PETR4.SA':  {'label': 'Petrobras',      'category': 'stocks', 'level': 2, 'parent': 'EWZ', 'weight': 100},
    'ITUB4.SA':  {'label': 'Itaú',           'category': 'stocks', 'level': 2, 'parent': 'EWZ', 'weight': 75},
    'BBDC4.SA':  {'label': 'Bradesco',       'category': 'stocks', 'level': 2, 'parent': 'EWZ', 'weight': 55},
    'ABEV3.SA':  {'label': 'Ambev',          'category': 'stocks', 'level': 2, 'parent': 'EWZ', 'weight': 50},
    'WEGE3.SA':  {'label': 'WEG',            'category': 'stocks', 'level': 2, 'parent': 'EWZ', 'weight': 55},
    'B3SA3.SA':  {'label': 'B3',             'category': 'stocks', 'level': 2, 'parent': 'EWZ', 'weight': 40},
    'RENT3.SA':  {'label': 'Localiza',       'category': 'stocks', 'level': 2, 'parent': 'EWZ', 'weight': 35},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: TAIWAN TOP STOCKS (parent = EWT)
    # ══════════════════════════════════════════════════════════════════
    '2330.TW':  {'label': 'TSMC',            'category': 'stocks', 'level': 2, 'parent': 'EWT', 'weight': 200},
    '2454.TW':  {'label': 'MediaTek',        'category': 'stocks', 'level': 2, 'parent': 'EWT', 'weight': 70},
    '2317.TW':  {'label': 'Hon Hai',         'category': 'stocks', 'level': 2, 'parent': 'EWT', 'weight': 60},
    '2881.TW':  {'label': 'Fubon Financial', 'category': 'stocks', 'level': 2, 'parent': 'EWT', 'weight': 40},
    '2882.TW':  {'label': 'Cathay Financial','category': 'stocks', 'level': 2, 'parent': 'EWT', 'weight': 35},
    '2303.TW':  {'label': 'UMC',             'category': 'stocks', 'level': 2, 'parent': 'EWT', 'weight': 35},
    '3711.TW':  {'label': 'ASE Tech',        'category': 'stocks', 'level': 2, 'parent': 'EWT', 'weight': 30},
    '2412.TW':  {'label': 'Chunghwa Telecom','category': 'stocks', 'level': 2, 'parent': 'EWT', 'weight': 30},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: SOUTH KOREA TOP STOCKS (parent = EWY)
    # ══════════════════════════════════════════════════════════════════
    '005930.KS': {'label': 'Samsung',         'category': 'stocks', 'level': 2, 'parent': 'EWY', 'weight': 150},
    '000660.KS': {'label': 'SK Hynix',        'category': 'stocks', 'level': 2, 'parent': 'EWY', 'weight': 80},
    '373220.KS': {'label': 'LG Energy',       'category': 'stocks', 'level': 2, 'parent': 'EWY', 'weight': 50},
    '005380.KS': {'label': 'Hyundai Motor',   'category': 'stocks', 'level': 2, 'parent': 'EWY', 'weight': 55},
    '035420.KS': {'label': 'NAVER',           'category': 'stocks', 'level': 2, 'parent': 'EWY', 'weight': 45},
    '051910.KS': {'label': 'LG Chem',         'category': 'stocks', 'level': 2, 'parent': 'EWY', 'weight': 40},
    '055550.KS': {'label': 'Shinhan',         'category': 'stocks', 'level': 2, 'parent': 'EWY', 'weight': 35},
    '035720.KS': {'label': 'Kakao',           'category': 'stocks', 'level': 2, 'parent': 'EWY', 'weight': 35},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: AUSTRALIA TOP STOCKS (parent = EWA)
    # ══════════════════════════════════════════════════════════════════
    'BHP.AX':   {'label': 'BHP',             'category': 'stocks', 'level': 2, 'parent': 'EWA', 'weight': 100},
    'CBA.AX':   {'label': 'CommBank',        'category': 'stocks', 'level': 2, 'parent': 'EWA', 'weight': 90},
    'CSL.AX':   {'label': 'CSL',             'category': 'stocks', 'level': 2, 'parent': 'EWA', 'weight': 70},
    'NAB.AX':   {'label': 'NAB',             'category': 'stocks', 'level': 2, 'parent': 'EWA', 'weight': 50},
    'WBC.AX':   {'label': 'Westpac',         'category': 'stocks', 'level': 2, 'parent': 'EWA', 'weight': 45},
    'ANZ.AX':   {'label': 'ANZ',             'category': 'stocks', 'level': 2, 'parent': 'EWA', 'weight': 45},
    'FMG.AX':   {'label': 'Fortescue',       'category': 'stocks', 'level': 2, 'parent': 'EWA', 'weight': 40},
    'WDS.AX':   {'label': 'Woodside',        'category': 'stocks', 'level': 2, 'parent': 'EWA', 'weight': 40},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: CANADA TOP STOCKS (parent = EWC)
    # ══════════════════════════════════════════════════════════════════
    'RY.TO':    {'label': 'Royal Bank',      'category': 'stocks', 'level': 2, 'parent': 'EWC', 'weight': 90},
    'SHOP.TO':  {'label': 'Shopify',         'category': 'stocks', 'level': 2, 'parent': 'EWC', 'weight': 80},
    'TD.TO':    {'label': 'TD Bank',         'category': 'stocks', 'level': 2, 'parent': 'EWC', 'weight': 70},
    'ENB.TO':   {'label': 'Enbridge',        'category': 'stocks', 'level': 2, 'parent': 'EWC', 'weight': 50},
    'CNR.TO':   {'label': 'CN Rail',         'category': 'stocks', 'level': 2, 'parent': 'EWC', 'weight': 50},
    'BMO.TO':   {'label': 'BMO',             'category': 'stocks', 'level': 2, 'parent': 'EWC', 'weight': 45},
    'BN.TO':    {'label': 'Brookfield',      'category': 'stocks', 'level': 2, 'parent': 'EWC', 'weight': 55},
    'CP.TO':    {'label': 'CP Kansas City',  'category': 'stocks', 'level': 2, 'parent': 'EWC', 'weight': 40},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 2: SOUTH AFRICA SECTORS (parent = EZA)
    # ══════════════════════════════════════════════════════════════════
    'STXIND.JO':  {'label': 'Industrials',   'category': 'stocks', 'level': 2, 'parent': 'EZA', 'weight': 150},
    'STXFIN.JO':  {'label': 'Financials',    'category': 'stocks', 'level': 2, 'parent': 'EZA', 'weight': 100},
    'STXRES.JO':  {'label': 'Resources',     'category': 'stocks', 'level': 2, 'parent': 'EZA', 'weight': 80},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: SA INDUSTRIALS (parent = STXIND.JO)
    # ══════════════════════════════════════════════════════════════════
    'NPN.JO':   {'label': 'Naspers',        'category': 'stocks', 'level': 3, 'parent': 'STXIND.JO', 'weight': 150},
    'PRX.JO':   {'label': 'Prosus',         'category': 'stocks', 'level': 3, 'parent': 'STXIND.JO', 'weight': 120},
    'CFR.JO':   {'label': 'Richemont',      'category': 'stocks', 'level': 3, 'parent': 'STXIND.JO', 'weight': 80},
    'BTI.JO':   {'label': 'BAT',            'category': 'stocks', 'level': 3, 'parent': 'STXIND.JO', 'weight': 70},
    'SPP.JO':   {'label': 'Shoprite',       'category': 'stocks', 'level': 3, 'parent': 'STXIND.JO', 'weight': 60},
    'MTN.JO':   {'label': 'MTN',            'category': 'stocks', 'level': 3, 'parent': 'STXIND.JO', 'weight': 55},
    'MNP.JO':   {'label': 'Mondi',          'category': 'stocks', 'level': 3, 'parent': 'STXIND.JO', 'weight': 45},
    'APN.JO':   {'label': 'Aspen',          'category': 'stocks', 'level': 3, 'parent': 'STXIND.JO', 'weight': 40},
    'VOD.JO':   {'label': 'Vodacom',        'category': 'stocks', 'level': 3, 'parent': 'STXIND.JO', 'weight': 40},
    'WHL.JO':   {'label': 'Woolworths',     'category': 'stocks', 'level': 3, 'parent': 'STXIND.JO', 'weight': 35},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: SA FINANCIALS (parent = STXFIN.JO)
    # ══════════════════════════════════════════════════════════════════
    'FSR.JO':   {'label': 'FirstRand',      'category': 'stocks', 'level': 3, 'parent': 'STXFIN.JO', 'weight': 80},
    'SBK.JO':   {'label': 'Standard Bank',  'category': 'stocks', 'level': 3, 'parent': 'STXFIN.JO', 'weight': 75},
    'CPI.JO':   {'label': 'Capitec',        'category': 'stocks', 'level': 3, 'parent': 'STXFIN.JO', 'weight': 70},
    'ABG.JO':   {'label': 'Absa',           'category': 'stocks', 'level': 3, 'parent': 'STXFIN.JO', 'weight': 55},
    'SLM.JO':   {'label': 'Sanlam',         'category': 'stocks', 'level': 3, 'parent': 'STXFIN.JO', 'weight': 50},
    'NED.JO':   {'label': 'Nedbank',        'category': 'stocks', 'level': 3, 'parent': 'STXFIN.JO', 'weight': 45},
    'DSY.JO':   {'label': 'Discovery',      'category': 'stocks', 'level': 3, 'parent': 'STXFIN.JO', 'weight': 40},
    'OMU.JO':   {'label': 'Old Mutual',     'category': 'stocks', 'level': 3, 'parent': 'STXFIN.JO', 'weight': 35},

    # ══════════════════════════════════════════════════════════════════
    # EQUITIES — LEVEL 3: SA RESOURCES (parent = STXRES.JO)
    # ══════════════════════════════════════════════════════════════════
    'AGL.JO':   {'label': 'Anglo American',  'category': 'stocks', 'level': 3, 'parent': 'STXRES.JO', 'weight': 80},
    'BHP.JO':   {'label': 'BHP',             'category': 'stocks', 'level': 3, 'parent': 'STXRES.JO', 'weight': 70},
    'SOL.JO':   {'label': 'Sasol',           'category': 'stocks', 'level': 3, 'parent': 'STXRES.JO', 'weight': 55},
    'GFI.JO':   {'label': 'Gold Fields',     'category': 'stocks', 'level': 3, 'parent': 'STXRES.JO', 'weight': 50},
    'AMS.JO':   {'label': 'Anglo Plat',      'category': 'stocks', 'level': 3, 'parent': 'STXRES.JO', 'weight': 45},
    'IMP.JO':   {'label': 'Impala Plat',     'category': 'stocks', 'level': 3, 'parent': 'STXRES.JO', 'weight': 40},
    'SSW.JO':   {'label': 'Sibanye',         'category': 'stocks', 'level': 3, 'parent': 'STXRES.JO', 'weight': 35},
    'EXX.JO':   {'label': 'Exxaro',          'category': 'stocks', 'level': 3, 'parent': 'STXRES.JO', 'weight': 30},

    # ══════════════════════════════════════════════════════════════════
    # FX — LEVEL 1 ONLY
    # ══════════════════════════════════════════════════════════════════
    'EURUSD=X': {'label': 'EUR/USD',      'category': 'fx', 'level': 1, 'weight': 100},
    'GBPUSD=X': {'label': 'GBP/USD',      'category': 'fx', 'level': 1, 'weight': 90},
    'USDJPY=X': {'label': 'USD/JPY',      'category': 'fx', 'level': 1, 'weight': 90},
    'USDCAD=X': {'label': 'USD/CAD',      'category': 'fx', 'level': 1, 'weight': 60},
    'USDCHF=X': {'label': 'USD/CHF',      'category': 'fx', 'level': 1, 'weight': 60},
    'AUDUSD=X': {'label': 'AUD/USD',      'category': 'fx', 'level': 1, 'weight': 50},
    'NZDUSD=X': {'label': 'NZD/USD',      'category': 'fx', 'level': 1, 'weight': 40},
    'USDZAR=X': {'label': 'USD/ZAR',      'category': 'fx', 'level': 1, 'weight': 40},
    'USDCNY=X': {'label': 'USD/CNY',      'category': 'fx', 'level': 1, 'weight': 50},
    'USDMXN=X': {'label': 'USD/MXN',      'category': 'fx', 'level': 1, 'weight': 35},

    # ══════════════════════════════════════════════════════════════════
    # CRYPTO — LEVEL 1 ONLY
    # ══════════════════════════════════════════════════════════════════
    'BTC-USD':  {'label': 'Bitcoin',      'category': 'crypto', 'level': 1, 'weight': 200},
    'ETH-USD':  {'label': 'Ethereum',     'category': 'crypto', 'level': 1, 'weight': 120},
    'SOL-USD':  {'label': 'Solana',       'category': 'crypto', 'level': 1, 'weight': 70},
    'XRP-USD':  {'label': 'XRP',          'category': 'crypto', 'level': 1, 'weight': 60},
    'BNB-USD':  {'label': 'BNB',          'category': 'crypto', 'level': 1, 'weight': 50},
    'ADA-USD':  {'label': 'Cardano',      'category': 'crypto', 'level': 1, 'weight': 40},
    'DOGE-USD': {'label': 'Dogecoin',     'category': 'crypto', 'level': 1, 'weight': 35},
    'AVAX-USD': {'label': 'Avalanche',    'category': 'crypto', 'level': 1, 'weight': 30},
    'DOT-USD':  {'label': 'Polkadot',     'category': 'crypto', 'level': 1, 'weight': 25},
    'LINK-USD': {'label': 'Chainlink',    'category': 'crypto', 'level': 1, 'weight': 25},

    # ══════════════════════════════════════════════════════════════════
    # COMMODITIES — LEVEL 1 ONLY
    # ══════════════════════════════════════════════════════════════════
    'GC=F':   {'label': 'Gold',           'category': 'commodities', 'level': 1, 'weight': 120},
    'SI=F':   {'label': 'Silver',         'category': 'commodities', 'level': 1, 'weight': 60},
    'CL=F':   {'label': 'WTI Crude',      'category': 'commodities', 'level': 1, 'weight': 110},
    'BZ=F':   {'label': 'Brent Crude',    'category': 'commodities', 'level': 1, 'weight': 100},
    'NG=F':   {'label': 'Natural Gas',    'category': 'commodities', 'level': 1, 'weight': 70},
    'HG=F':   {'label': 'Copper',         'category': 'commodities', 'level': 1, 'weight': 60},
    'PL=F':   {'label': 'Platinum',       'category': 'commodities', 'level': 1, 'weight': 35},
    'ZC=F':   {'label': 'Corn',           'category': 'commodities', 'level': 1, 'weight': 40},
    'ZS=F':   {'label': 'Soybeans',       'category': 'commodities', 'level': 1, 'weight': 40},
    'ZW=F':   {'label': 'Wheat',          'category': 'commodities', 'level': 1, 'weight': 35},
    'KC=F':   {'label': 'Coffee',         'category': 'commodities', 'level': 1, 'weight': 35},
    'CT=F':   {'label': 'Cotton',         'category': 'commodities', 'level': 1, 'weight': 25},

    # ══════════════════════════════════════════════════════════════════
    # BONDS — LEVEL 1 ONLY
    # ══════════════════════════════════════════════════════════════════
    'TLT':    {'label': 'US 20Y+',        'category': 'bonds', 'level': 1, 'weight': 100},
    'IEF':    {'label': 'US 7-10Y',       'category': 'bonds', 'level': 1, 'weight': 80},
    'SHY':    {'label': 'US 1-3Y',        'category': 'bonds', 'level': 1, 'weight': 60},
    'LQD':    {'label': 'IG Corporate',   'category': 'bonds', 'level': 1, 'weight': 60},
    'HYG':    {'label': 'High Yield',     'category': 'bonds', 'level': 1, 'weight': 50},
    'EMB':    {'label': 'EM Debt',        'category': 'bonds', 'level': 1, 'weight': 50},
    'MBB':    {'label': 'Mortgage',       'category': 'bonds', 'level': 1, 'weight': 40},
    'TIP':    {'label': 'TIPS',           'category': 'bonds', 'level': 1, 'weight': 40},
    'IGLT.L': {'label': 'UK Gilts',       'category': 'bonds', 'level': 1, 'weight': 40},
    'SDEU.L': {'label': 'Euro Govt',      'category': 'bonds', 'level': 1, 'weight': 40},
    '1482.T': {'label': 'Japan Govt',     'category': 'bonds', 'level': 1, 'weight': 35},
}

TIMEFRAME_DAYS = {
    "1D": 1,
    "1W": 5,
    "1M": 21,
    "3M": 63,
    "1Y": 252,
    "2Y": 504,
    "5Y": 1260,
}


def download_and_save_csv():
    current_date = dt.datetime.now().date()

    date_5_years_ago = current_date- timedelta(days=1850)
    requested = list(TICKER_DICTIONARY.keys())
    raw = yf.download(requested, start=date_5_years_ago, timeout=30)
    df = raw['Close']

    missing_cols = [t for t in requested if t not in df.columns]
    last_row_nan = int(df.iloc[-1].isna().sum())
    print(
        f"[heatmap] yf.download shape={df.shape} "
        f"requested={len(requested)} returned_cols={df.shape[1]} "
        f"missing_cols={len(missing_cols)} last_row_nan={last_row_nan} "
        f"last_index={df.index[-1].date() if len(df.index) else 'empty'}",
        flush=True,
    )
    if missing_cols:
        print(f"[heatmap] missing tickers: {missing_cols}", flush=True)

    df = df.ffill().bfill()
    returns_dict = {}
    last_price = df.iloc[-1]
    for tf, days in TIMEFRAME_DAYS.items():
        print(days)
        return_for_tf = ((last_price - df.iloc[-days-1]) / df.iloc[-days-1]) * 100
        returns_dict[tf] = return_for_tf

    returns_df = pd.DataFrame(returns_dict)


    meta_df = pd.DataFrame.from_dict(TICKER_DICTIONARY, orient='index')


    result = meta_df.merge(returns_df, left_index=True, right_index=True)
    result.to_csv('heatmap_data.csv')






