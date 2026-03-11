import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createChart, LineSeries } from "lightweight-charts";
import { G } from "../styles/tokens";

const API = import.meta.env.VITE_API_URL;

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const PERIODS = [
  { label:"1D", interval:"intraday" },
  { label:"1W", interval:"intraday" },
  { label:"1M", interval:"hourly"   },
  { label:"4M", interval:"hourly"   },
  { label:"1Y", interval:"daily"    },
  { label:"2Y", interval:"daily"    },
  { label:"5Y", interval:"daily"    },
];

const PERIOD_BARS = {
  "1D": { intraday:78  },
  "1W": { intraday:390 },
  "1M": { hourly:168   },
  "4M": { hourly:672   },
  "1Y": { daily:252    },
  "2Y": { daily:504    },
  "5Y": { daily:1260   },
};

const CATEGORY_MODELS = {
  stock:     [{ name:"Multi-Factor", tag:"Quant" }, { name:"Momentum/MR", tag:"Quant" }, { name:"GARCH", tag:"Quant" }, { name:"Hist. P/E", tag:"Fundamental" }],
  crypto:    [{ name:"Multi-Factor", tag:"Quant" }, { name:"Momentum/MR", tag:"Quant" }, { name:"GARCH", tag:"Quant" }, { name:"Monte Carlo", tag:"Quant" }],
  commodity: [{ name:"Multi-Factor", tag:"Quant" }, { name:"Momentum/MR", tag:"Quant" }, { name:"GARCH", tag:"Quant" }],
  bond:      [{ name:"Multi-Factor", tag:"Quant" }, { name:"GARCH", tag:"Quant" }, { name:"Monte Carlo", tag:"Quant" }],
  fx:        [{ name:"Multi-Factor", tag:"Quant" }, { name:"Momentum/MR", tag:"Quant" }, { name:"GARCH", tag:"Quant" }],
  etf:       [{ name:"Multi-Factor", tag:"Quant" }, { name:"GARCH", tag:"Quant" }],
};

const MODEL_DESCS = {
  "Multi-Factor": "Ranks assets across momentum, value, quality and volatility factors.",
  "Momentum/MR":  "Identifies trend continuation and mean-reversion entry signals.",
  "GARCH":        "Models conditional volatility clustering for risk estimation.",
  "Monte Carlo":  "Simulates thousands of price paths for probabilistic forecasting.",
  "Hist. P/E":    "Compares current valuations against historical earnings multiples.",
};

// ── HELPERS ───────────────────────────────────────────────────────────────

function fmtPrice(v, decimals = 2) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("en-US", { minimumFractionDigits:decimals, maximumFractionDigits:decimals });
}

function fmtLarge(v) {
  if (!v) return "—";
  if (v >= 1e12) return `$${(v/1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v/1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v/1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtVol(v) {
  if (!v) return "—";
  if (v >= 1e9) return `${(v/1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v/1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v/1e3).toFixed(2)}K`;
  return v.toLocaleString();
}

// ── PRICE CHART ───────────────────────────────────────────────────────────

function PriceChart({ candles, isUp }) {
  const containerRef = useRef();
  const chartRef     = useRef();
  const seriesRef    = useRef();

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: G.s1 },
        textColor:  G.text3,
        fontSize:   11,
        fontFamily: "'DM Mono', monospace",
      },
      grid: {
        vertLines: { color: G.border },
        horzLines: { color: G.border },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: G.text3, labelBackgroundColor: G.bgDark },
        horzLine: { color: G.text3, labelBackgroundColor: G.bgDark },
      },
      rightPriceScale: { borderColor: G.border },
      timeScale:       { borderColor: G.border, timeVisible:true, secondsVisible:false },
      handleScroll: true,
      handleScale:  true,
    });
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current)
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candles?.length) return;
    if (seriesRef.current) {
      try { chartRef.current.removeSeries(seriesRef.current); } catch {}
      seriesRef.current = null;
    }
    const series = chartRef.current.addSeries(LineSeries, {
      color:                        G.chart,
      lineWidth:                    1.5,
      crosshairMarkerVisible:       true,
      crosshairMarkerRadius:        4,
      crosshairMarkerBorderColor:   G.chart,
      crosshairMarkerBackgroundColor: G.chart,
      lastValueVisible:             true,
      priceLineVisible:             true,
      priceLineColor:               G.chart,
      priceLineStyle:               2,
    });
    series.setData(candles.map(c => ({ time:c.date, value:c.close })));
    seriesRef.current = series;
    chartRef.current.timeScale().fitContent();
  }, [candles, isUp]);

  return <div ref={containerRef} style={{ width:"100%", height:400 }} />;
}

// ── NAV ───────────────────────────────────────────────────────────────────

function Nav({ navigate }) {
  const [q, setQ] = useState("");
  return (
    <nav style={{
      position:"sticky", top:0, zIndex:100,
      height:52, display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 40px", background:G.bgDark, borderBottom:`1px solid ${G.borderDk}`,
    }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:5, cursor:"pointer" }} onClick={() => navigate("/")}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:900, color:G.textInv, letterSpacing:"-0.3px" }}>Signum</span>
        <span style={{ fontSize:8, fontFamily:"'DM Mono',monospace", color:G.textInv3, letterSpacing:"2px", textTransform:"uppercase" }}>Analytics</span>
      </div>
      <div style={{ display:"flex" }}>
        {["Overview","Models","Markets"].map(label => (
          <button key={label}
            onClick={() => { if (label==="Overview") navigate("/"); if (label==="Models") navigate("/models"); if (label==="Markets") navigate("/markets"); }}
            style={{
              padding:"5px 16px", borderRadius:4, fontSize:12, fontWeight:400,
              fontFamily:"'DM Sans',sans-serif",
              color:G.textInv2, background:"none",
              border:"none", cursor:"pointer", transition:"all .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color=G.textInv}
            onMouseLeave={e => e.currentTarget.style.color=G.textInv2}
          >{label}</button>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{
          display:"flex", alignItems:"center", gap:7,
          background:"rgba(255,255,255,0.06)", border:`1px solid ${G.borderDk}`,
          borderRadius:4, padding:"5px 12px",
        }}>
          <span style={{ fontSize:11, color:G.textInv3 }}>⌕</span>
          <input placeholder="Search ticker..." value={q}
            onChange={e => setQ(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key==="Enter" && q.trim()) { navigate(`/markets/instrument/${q.trim()}`); setQ(""); }}}
            style={{ background:"none", border:"none", outline:"none", fontSize:12, color:G.textInv, width:110, fontFamily:"'DM Mono',monospace" }}
          />
        </div>
        <div style={{
          width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.12)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:600, color:G.textInv, cursor:"pointer",
        }}>H</div>
      </div>
    </nav>
  );
}

// ── INSTRUMENT PAGE ───────────────────────────────────────────────────────

export default function Instrument() {
  const navigate    = useNavigate();
  const { ticker }  = useParams();

  const [period, setPeriod]         = useState("1Y");
  const [info, setInfo]             = useState(null);
  const [allData, setAllData]       = useState({ intraday:[], hourly:[], daily:[] });
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    setLoadingInfo(true); setError(null);
    fetch(`${API}/api/instrument/${ticker}`)
      .then(r => r.json())
      .then(d => { setInfo(d); setLoadingInfo(false); })
      .catch(e => { setError(e.message); setLoadingInfo(false); });
  }, [ticker]);

  useEffect(() => {
    setLoadingChart(true);
    Promise.all([
      fetch(`${API}/api/chart/${ticker}/intraday`).then(r => r.json()),
      fetch(`${API}/api/chart/${ticker}/hourly`).then(r => r.json()),
      fetch(`${API}/api/chart/${ticker}/daily`).then(r => r.json()),
    ])
      .then(([intra, hourly, daily]) => {
        setAllData({ intraday:intra.candles||[], hourly:hourly.candles||[], daily:daily.candles||[] });
        setLoadingChart(false);
      })
      .catch(e => { setError(e.message); setLoadingChart(false); });
  }, [ticker]);

  const periodConfig = PERIODS.find(p => p.label === period);
  const datasetKey   = periodConfig?.interval || "daily";
  const numBars      = PERIOD_BARS[period]?.[datasetKey] || allData[datasetKey]?.length;
  const candles      = allData[datasetKey].slice(-numBars);
  const isUp         = info ? info.changePct >= 0 : true;
  const models       = CATEGORY_MODELS[info?.assetType] || CATEGORY_MODELS["stock"];

  function getStats() {
    if (!info) return [];
    const base = [
      { label:"Price",    value:`$${fmtPrice(info.price)}` },
      { label:"Change",   value:`${info.changePct >= 0 ? "+" : ""}${fmtPrice(info.changePct)}%`, colored: true },
      { label:"52W High", value:info.high52w ? `$${fmtPrice(info.high52w)}` : "—" },
      { label:"52W Low",  value:info.low52w  ? `$${fmtPrice(info.low52w)}`  : "—" },
    ];
    if (info.assetType === "stock")     return [...base, { label:"Mkt Cap", value:fmtLarge(info.marketCap) }, { label:"Volume", value:fmtVol(info.volume) }, { label:"Avg Vol", value:fmtVol(info.avgVolume) }, { label:"P/E", value:info.pe ? fmtPrice(info.pe) : "—" }];
    if (info.assetType === "crypto")    return [...base, { label:"Mkt Cap", value:fmtLarge(info.marketCap) }, { label:"Vol 24h", value:fmtVol(info.volume) }, { label:"Circulating", value:fmtVol(info.circulatingSup) }];
    if (info.assetType === "fx")        return [...base, { label:"Bid", value:fmtPrice(info.bid,4) }, { label:"Ask", value:fmtPrice(info.ask,4) }];
    if (info.assetType === "commodity") return [...base, { label:"Volume", value:fmtVol(info.volume) }, { label:"Bid", value:fmtPrice(info.bid,4) }, { label:"Ask", value:fmtPrice(info.ask,4) }];
    if (info.assetType === "bond" || info.assetType === "etf") return [...base, { label:"Volume", value:fmtVol(info.volume) }, { label:"Yield", value:info.yield ? `${fmtPrice(info.yield*100)}%` : "—" }, { label:"NAV", value:info.navPrice ? `$${fmtPrice(info.navPrice)}` : "—" }];
    return base;
  }

  return (
    <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"'DM Sans',sans-serif", color:G.text }}>
      <style>{`
        ${FONT}
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        ::placeholder { color:${G.text3}; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${G.border2}; border-radius:2px; }
      `}</style>

      <Nav navigate={navigate} />

      {/* ── BREADCRUMB + HEADER BAR ── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 40px", background:G.s1, borderBottom:`1px solid ${G.border}`,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {[["Home","/"],["Markets","/markets"],[ticker,null]].map(([lbl,path],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
              {i > 0 && <span style={{ color:G.border2, fontSize:11 }}>›</span>}
              <span onClick={() => path && navigate(path)} style={{
                fontSize:11, fontFamily:"'DM Mono',monospace",
                color: path ? G.text3 : G.text2,
                cursor: path ? "pointer" : "default",
              }}
                onMouseEnter={e => { if (path) e.currentTarget.style.color=G.text; }}
                onMouseLeave={e => { if (path) e.currentTarget.style.color=G.text3; }}
              >{lbl}</span>
            </div>
          ))}
        </div>
        {info && (
          <span style={{
            fontSize:9, fontFamily:"'DM Mono',monospace", fontWeight:500,
            padding:"2px 8px", borderRadius:3, textTransform:"uppercase", letterSpacing:"1px",
            background:G.s2, color:G.text3, border:`1px solid ${G.border}`,
          }}>{info.assetType}</span>
        )}
      </div>

      {error && (
        <div style={{ padding:40, color:G.red, fontSize:12, textAlign:"center", fontFamily:"'DM Mono',monospace" }}>
          Failed to load: {error}
        </div>
      )}

      {/* ── INSTRUMENT HEADER ── */}
      <div style={{ padding:"28px 40px 24px", borderBottom:`1px solid ${G.border}`, maxWidth:1100, margin:"0 auto", width:"100%" }}>
        {loadingInfo ? (
          <div style={{ height:60, display:"flex", alignItems:"center" }}>
            <span style={{ fontSize:11, color:G.text3, fontFamily:"'DM Mono',monospace" }}>Loading...</span>
          </div>
        ) : info && (
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
            {/* left — name */}
            <div>
              <p style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:G.text3, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:8 }}>
                {ticker}
              </p>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:900, letterSpacing:"-1px", color:G.text, lineHeight:1, marginBottom:6 }}>
                {info.label || info.name}
              </h1>
              {info.name && info.label && (
                <p style={{ fontSize:13, color:G.text3, fontWeight:300 }}>{info.name}</p>
              )}
            </div>
            {/* right — price */}
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:36, fontWeight:500, fontFamily:"'DM Mono',monospace", letterSpacing:"-1.5px", color:G.text, lineHeight:1, marginBottom:6 }}>
                ${fmtPrice(info.price)}
              </p>
              <p style={{ fontSize:16, fontFamily:"'DM Mono',monospace", fontWeight:500, color: isUp ? G.green : G.red }}>
                {isUp ? "▲" : "▼"} {info.changePct >= 0 ? "+" : ""}{fmtPrice(info.changePct)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── STAT PILLS ── */}
      {!loadingInfo && info && (
        <div style={{ padding:"20px 40px 0", maxWidth:1100, margin:"0 auto", width:"100%" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:8 }}>
            {getStats().map((s, i) => (
              <div key={i} style={{
                background:G.s1, border:`1px solid ${G.border}`,
                borderRadius:5, padding:"12px 16px",
              }}>
                <p style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:G.text3, letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>
                  {s.label}
                </p>
                <p style={{
                  fontSize:15, fontFamily:"'DM Mono',monospace", fontWeight:500,
                  color: s.colored ? (isUp ? G.green : G.red) : G.text,
                }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CHART ── */}
      <div style={{ padding:"20px 40px 0", maxWidth:1100, margin:"0 auto", width:"100%" }}>

        {/* period selector */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
          <div style={{ display:"flex", gap:1, background:G.bg, border:`1px solid ${G.border}`, borderRadius:5, padding:2 }}>
            {PERIODS.map(({ label }) => (
              <button key={label} onClick={() => setPeriod(label)} style={{
                padding:"4px 11px", borderRadius:3, fontSize:10,
                fontFamily:"'DM Mono',monospace", fontWeight:500,
                background: period===label ? G.bgDark : "none",
                color:      period===label ? G.textInv : G.text3,
                border:"none", cursor:"pointer", transition:"all .15s",
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* chart container */}
        <div style={{ border:`1px solid ${G.border}`, borderRadius:6, overflow:"hidden", background:G.s1 }}>
          {loadingChart ? (
            <div style={{ height:400, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:11, color:G.text3, fontFamily:"'DM Mono',monospace" }}>Loading chart...</span>
            </div>
          ) : candles.length === 0 ? (
            <div style={{ height:400, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:11, color:G.text3, fontFamily:"'DM Mono',monospace" }}>No data available</span>
            </div>
          ) : (
            <PriceChart key={period} candles={candles} isUp={isUp} />
          )}
        </div>
      </div>

      {/* ── DARK BAND ── */}
      <div style={{
        background:G.bgDark, margin:"40px 0 0",
        padding:"20px 40px",
        borderTop:`1px solid ${G.borderDk}`, borderBottom:`1px solid ${G.borderDk}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:32 }}>
          {info && (
            <>
              <div>
                <p style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:G.textInv3, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:4 }}>Instrument</p>
                <p style={{ fontSize:13, color:G.textInv2, fontFamily:"'DM Sans',sans-serif" }}>{info.label || ticker}</p>
              </div>
              <div style={{ width:1, height:32, background:G.borderDk }} />
              <div>
                <p style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:G.textInv3, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:4 }}>Asset Class</p>
                <p style={{ fontSize:13, color:G.textInv2, fontFamily:"'DM Sans',sans-serif", textTransform:"capitalize" }}>{info.assetType}</p>
              </div>
              <div style={{ width:1, height:32, background:G.borderDk }} />
              <div>
                <p style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:G.textInv3, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:4 }}>Period</p>
                <p style={{ fontSize:13, color:G.textInv2, fontFamily:"'DM Mono',monospace" }}>{period}</p>
              </div>
            </>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:G.green, boxShadow:`0 0 6px ${G.green}` }} />
          <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:G.textInv3, letterSpacing:"1px", textTransform:"uppercase" }}>Live</span>
        </div>
      </div>

      {/* ── MODELS ── */}
      <div style={{ padding:"48px 40px 0", maxWidth:1100, margin:"0 auto", width:"100%" }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, letterSpacing:"-0.5px", color:G.text }}>
            Run a Model
          </h2>
          <button onClick={() => navigate("/models")}
            style={{
              fontSize:11, fontFamily:"'DM Mono',monospace", color:G.text2,
              background:"none", border:`1px solid ${G.border}`, borderRadius:3,
              padding:"5px 14px", cursor:"pointer", transition:"all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background=G.bgDark; e.currentTarget.style.borderColor=G.bgDark; e.currentTarget.style.color=G.textInv; }}
            onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.borderColor=G.border; e.currentTarget.style.color=G.text2; }}
          >View all models →</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${models.length},1fr)`, gap:8 }}>
          {models.map((m, i) => {
            const isQuant = m.tag === "Quant";
            return (
              <button key={i}
                onClick={() => navigate(`/models/${m.name.toLowerCase().replace(/[^a-z]/g,"-")}?ticker=${ticker}`)}
                style={{
                  background:G.bg, border:`1px solid ${G.border}`,
                  borderRadius:6, padding:"28px 24px",
                  cursor:"pointer", transition:"all .2s", textAlign:"left",
                  display:"flex", flexDirection:"column", gap:16,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background=G.bgDark;
                  e.currentTarget.style.borderColor=G.bgDark;
                  e.currentTarget.style.transform="translateY(-2px)";
                  e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.1)";
                  e.currentTarget.querySelectorAll(".card-title").forEach(el => el.style.color=G.textInv);
                  e.currentTarget.querySelectorAll(".card-desc").forEach(el => el.style.color=G.textInv2);
                  e.currentTarget.querySelectorAll(".card-arrow").forEach(el => el.style.color=G.textInv2);
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background=G.bg;
                  e.currentTarget.style.borderColor=G.border;
                  e.currentTarget.style.transform="none";
                  e.currentTarget.style.boxShadow="none";
                  e.currentTarget.querySelectorAll(".card-title").forEach(el => el.style.color=G.text);
                  e.currentTarget.querySelectorAll(".card-desc").forEach(el => el.style.color=G.text3);
                  e.currentTarget.querySelectorAll(".card-arrow").forEach(el => el.style.color=G.text3);
                }}
              >
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{
                    fontSize:8, fontFamily:"'DM Mono',monospace", fontWeight:500,
                    padding:"2px 7px", borderRadius:3, textTransform:"uppercase", letterSpacing:"0.5px",
                    background: isQuant ? G.s2 : "rgba(245,158,11,0.1)",
                    color:      isQuant ? G.text3 : "#92400e",
                    border:     isQuant ? `1px solid ${G.border}` : "1px solid rgba(245,158,11,0.3)",
                  }}>{m.tag}</span>
                  <span className="card-arrow" style={{ fontSize:11, color:G.text3 }}>→</span>
                </div>
                <div>
                  <p className="card-title" style={{ fontSize:15, fontWeight:600, color:G.text, fontFamily:"'DM Sans',sans-serif", marginBottom:8 }}>{m.name}</p>
                  <p className="card-desc" style={{ fontSize:12, color:G.text3, fontFamily:"'DM Sans',sans-serif", fontWeight:300, lineHeight:1.7 }}>
                    {MODEL_DESCS[m.name] || ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── NEWS ── */}
      <div style={{ padding:"48px 40px 72px", maxWidth:1100, margin:"0 auto", width:"100%" }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, letterSpacing:"-0.5px", color:G.text }}>
            {ticker} Headlines
          </h2>
          <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:G.text3 }}>via yFinance</span>
        </div>
        <TickerNewsPanel ticker={ticker} />
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        background:G.bgDarker, borderTop:`1px solid ${G.borderDk}`,
        padding:"20px 40px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:G.textInv3 }}>Signum</span>
        <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:G.textInv3, letterSpacing:"0.5px" }}>
          Market data via yFinance · For informational purposes only
        </span>
      </footer>
    </div>
  );
}

// ── TICKER NEWS ───────────────────────────────────────────────────────────

function TickerNewsPanel({ ticker }) {
  const [news, setNews]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/news/${encodeURIComponent(ticker)}?num_articles=10`)
      .then(r => r.json())
      .then(data => { setNews(Array.isArray(data) ? data.filter(a => a.title) : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ticker]);

  function fmtDate(str) {
    if (!str) return "";
    try { return new Date(str).toLocaleDateString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }); }
    catch { return ""; }
  }

  if (loading) return (
    <div style={{ border:`1px solid ${G.border}`, borderRadius:6, padding:32, textAlign:"center", fontSize:11, color:G.text3, fontFamily:"'DM Mono',monospace" }}>
      Loading headlines...
    </div>
  );

  if (!news.length) return (
    <div style={{ border:`1px solid ${G.border}`, borderRadius:6, padding:32, textAlign:"center", fontSize:11, color:G.text3, fontFamily:"'DM Mono',monospace" }}>
      No headlines available
    </div>
  );

  return (
    <div style={{ border:`1px solid ${G.border}`, borderRadius:6, overflow:"hidden" }}>
      {news.map((article, i) => (
        <div key={i} style={{
          padding:"16px 20px",
          borderBottom: i < news.length-1 ? `1px solid ${G.border}` : "none",
          background: i % 2 === 0 ? G.bg : G.s1,
        }}>
          <p style={{ fontSize:13, color:G.text, fontWeight:500, lineHeight:1.55, marginBottom:6 }}>
            {article.title}
          </p>
          {article.summary && (
            <p style={{ fontSize:12, color:G.text2, fontWeight:300, lineHeight:1.65, marginBottom:8 }}>
              {article.summary}
            </p>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:10, color:G.text3, fontFamily:"'DM Mono',monospace" }}>
              {article.displayName || "—"}
            </span>
            {article.pubDate && (
              <span style={{ fontSize:10, color:G.text3, fontFamily:"'DM Mono',monospace" }}>
                · {fmtDate(article.pubDate)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
