import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createChart, LineSeries } from "lightweight-charts";
import { G } from "../styles/tokens";
import NewsPanel from "../components/NewsPanel";

const API = "http://localhost:8000";

const PERIODS = [
  { label: "1D", interval: "intraday" },
  { label: "1W", interval: "intraday" },
  { label: "1M", interval: "hourly" },
  { label: "4M", interval: "hourly" },
  { label: "1Y", interval: "daily" },
  { label: "2Y", interval: "daily" },
  { label: "5Y", interval: "daily" },
];

// how many bars to slice per period
const PERIOD_BARS = {
  "1D": { intraday: 78 },   // ~78 x 5m bars per day
  "1W": { intraday: 390 },   // 5 days x 78
  "1M": { hourly: 168 },   // ~21 trading days x 8h
  "4M": { hourly: 672 },   // ~4 months
  "1Y": { daily: 252 },
  "2Y": { daily: 504 },
  "5Y": { daily: 1260 },
};

const CATEGORY_MODELS = {
  stock: [{ name: "Multi-Factor", tag: "Quant" }, { name: "Momentum/MR", tag: "Quant" }, { name: "GARCH", tag: "Quant" }, { name: "Hist. P/E", tag: "Fundamental" }],
  crypto: [{ name: "Multi-Factor", tag: "Quant" }, { name: "Momentum/MR", tag: "Quant" }, { name: "GARCH", tag: "Quant" }, { name: "Monte Carlo", tag: "Quant" }],
  commodity: [{ name: "Multi-Factor", tag: "Quant" }, { name: "Momentum/MR", tag: "Quant" }, { name: "GARCH", tag: "Quant" }],
  bond: [{ name: "Multi-Factor", tag: "Quant" }, { name: "GARCH", tag: "Quant" }, { name: "Monte Carlo", tag: "Quant" }],
  fx: [{ name: "Multi-Factor", tag: "Quant" }, { name: "Momentum/MR", tag: "Quant" }, { name: "GARCH", tag: "Quant" }],
  etf: [{ name: "Multi-Factor", tag: "Quant" }, { name: "GARCH", tag: "Quant" }],
};

// ── HELPERS ───────────────────────────────────────────────────────────────

function tagStyle(tag) {
  if (tag === "Central Bank" || tag === "Fundamental")
    return { bg: "rgba(245,158,11,0.12)", color: G.amber, border: "rgba(245,158,11,0.3)" };
  return { bg: "rgba(6,255,165,0.07)", color: G.teal, border: "rgba(6,255,165,0.25)" };
}

function fmtPrice(v, decimals = 2) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtLarge(v) {
  if (!v) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtVol(v) {
  if (!v) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toLocaleString();
}

// ── LIGHTWEIGHT LINE CHART ────────────────────────────────────────────────

function PriceChart({ candles, isUp }) {
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 420,
      layout: {
        background: { color: G.s1 },
        textColor: G.text3,
        fontSize: 11,
        fontFamily: "'Space Mono', monospace",
      },
      grid: {
        vertLines: { color: "rgba(30,58,95,0.3)" },
        horzLines: { color: "rgba(30,58,95,0.3)" },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(6,255,165,0.4)", labelBackgroundColor: G.s2 },
        horzLine: { color: "rgba(6,255,165,0.4)", labelBackgroundColor: G.s2 },
      },
      rightPriceScale: { borderColor: G.border },
      timeScale: {
        borderColor: G.border,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candles?.length) return;

    if (seriesRef.current) {
      try { chartRef.current.removeSeries(seriesRef.current); } catch { }
      seriesRef.current = null;
    }

    const color = isUp ? G.green : G.red;

    const series = chartRef.current.addSeries(LineSeries, {
      color: G.chart,
      lineWidth: 1.5,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: G.chart,
      crosshairMarkerBackgroundColor: G.chart,
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineColor: G.chart,
      priceLineStyle: 2,
    });

    series.setData(candles.map(c => ({ time: c.date, value: c.close })));
    seriesRef.current = series;
    chartRef.current.timeScale().fitContent();

  }, [candles, isUp]);

  return <div ref={containerRef} style={{ width: "100%", height: 420 }} />;
}

// ── NAV ───────────────────────────────────────────────────────────────────

function Nav({ navigate }) {
  const [q, setQ] = useState("");
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px",
      background: "rgba(6,13,26,0.96)", backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${G.border}`,
    }}>
      <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px", cursor: "pointer" }}
        onClick={() => navigate("/")}>QuantLab</span>

      <div style={{ display: "flex", gap: 2 }}>
        {["Overview", "Models", "Markets"].map(label => (
          <button key={label}
            onClick={() => {
              if (label === "Overview") navigate("/");
              if (label === "Models") navigate("/models");
              if (label === "Markets") navigate("/markets");
            }}
            style={{
              padding: "5px 14px", borderRadius: 6, fontSize: 13,
              fontWeight: 500, fontFamily: "'Syne',sans-serif",
              color: G.text2, background: "none",
              border: "none", cursor: "pointer", transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = G.text; e.currentTarget.style.background = G.s2; }}
            onMouseLeave={e => { e.currentTarget.style.color = G.text2; e.currentTarget.style.background = "none"; }}
          >{label}</button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          placeholder="Search Ticker"
          value={q}
          onChange={e => setQ(e.target.value.toUpperCase())}
          onKeyDown={e => {
            if (e.key === "Enter" && q.trim()) {
              navigate(`/markets/instrument/${q.trim()}`);
              setQ("");
            }
          }}
          style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: G.text2, width: 120, fontFamily: "'Syne',sans-serif" }}
        />
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(135deg, #06ffa5, #0077ff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: G.bg,
        }}>H</div>
      </div>
    </nav>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div style={{
      background: G.s1, border: `1px solid ${G.border}`,
      borderRadius: 8, padding: "12px 16px",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{
        fontSize: 10, color: G.text3, fontFamily: "'Space Mono',monospace",
        letterSpacing: "0.5px", textTransform: "uppercase",
      }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: G.text, fontFamily: "'Space Mono',monospace" }}>
        {value}
      </span>
    </div>
  );
}

// ── MODEL PICKER ──────────────────────────────────────────────────────────

function ModelPickerPanel({ assetType, ticker, navigate }) {
  const models = CATEGORY_MODELS[assetType] || CATEGORY_MODELS["stock"];
  return (
    <div style={{ background: G.s1, border: `1px solid ${G.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{
        padding: "12px 14px 8px", borderBottom: `1px solid ${G.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: G.text }}>Run a Model</span>
        <span style={{ fontSize: 10, color: G.text3, fontFamily: "'Space Mono',monospace", textTransform: "capitalize" }}>
          {assetType}
        </span>
      </div>
      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {models.map((m, i) => {
          const s = tagStyle(m.tag);
          return (
            <button key={i}
              onClick={() => navigate(`/models/${m.name.toLowerCase().replace(/[^a-z]/g, "-")}?ticker=${ticker}`)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: G.s2, border: `1px solid ${G.border}`,
                borderRadius: 7, padding: "9px 12px",
                cursor: "pointer", transition: "all .2s", textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(6,255,165,0.25)"; e.currentTarget.style.background = "rgba(6,255,165,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.background = G.s2; }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: G.text, fontFamily: "'Syne',sans-serif" }}>{m.name}</span>
              <span style={{
                fontSize: 9, fontFamily: "'Space Mono',monospace", fontWeight: 700,
                padding: "2px 6px", borderRadius: 4,
                background: s.bg, color: s.color, border: `1px solid ${s.border}`,
              }}>{m.tag}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── INSTRUMENT PAGE ───────────────────────────────────────────────────────

export default function Instrument() {
  const navigate = useNavigate();
  const { ticker } = useParams();

  const [period, setPeriod] = useState("1Y");
  const [info, setInfo] = useState(null);
  const [allData, setAllData] = useState({ intraday: [], hourly: [], daily: [] });
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError] = useState(null);

  // fetch instrument info once
  useEffect(() => {
    setLoadingInfo(true);
    setError(null);
    fetch(`${API}/api/instrument/${ticker}`)
      .then(r => r.json())
      .then(d => { setInfo(d); setLoadingInfo(false); })
      .catch(e => { setError(e.message); setLoadingInfo(false); });
  }, [ticker]);

  // fetch all three datasets once on mount
  useEffect(() => {
    setLoadingChart(true);
    Promise.all([
      fetch(`${API}/api/chart/${ticker}/intraday`).then(r => r.json()),
      fetch(`${API}/api/chart/${ticker}/hourly`).then(r => r.json()),
      fetch(`${API}/api/chart/${ticker}/daily`).then(r => r.json()),
    ])
      .then(([intra, hourly, daily]) => {
        console.log("intraday candles:", intra.candles?.length)  // add this
        console.log("hourly candles:", hourly.candles?.length) // add this
        console.log("daily candles:", daily.candles?.length)  // add this
        setAllData({
          intraday: intra.candles || [],
          hourly: hourly.candles || [],
          daily: daily.candles || [],
        });
        setLoadingChart(false);
      })
      .catch(e => { setError(e.message); setLoadingChart(false); });
  }, [ticker]);

  // slice the right dataset for the selected period
  const periodConfig = PERIODS.find(p => p.label === period);
  const datasetKey = periodConfig?.interval || "daily";
  const numBars = PERIOD_BARS[period]?.[datasetKey] || allData[datasetKey]?.length;
  const candles = allData[datasetKey].slice(-numBars);

  const isUp = info ? info.changePct >= 0 : true;

  function getStats() {
    if (!info) return [];
    const base = [
      { label: "Price", value: `$${fmtPrice(info.price)}` },
      { label: "Change", value: `${info.changePct >= 0 ? "+" : ""}${fmtPrice(info.changePct)}%` },
      { label: "52W High", value: info.high52w ? `$${fmtPrice(info.high52w)}` : "—" },
      { label: "52W Low", value: info.low52w ? `$${fmtPrice(info.low52w)}` : "—" },
    ];
    if (info.assetType === "stock") return [...base,
    { label: "Market Cap", value: fmtLarge(info.marketCap) },
    { label: "Volume", value: fmtVol(info.volume) },
    { label: "Avg Volume", value: fmtVol(info.avgVolume) },
    { label: "P/E Ratio", value: info.pe ? fmtPrice(info.pe) : "—" },
    ];
    if (info.assetType === "crypto") return [...base,
    { label: "Market Cap", value: fmtLarge(info.marketCap) },
    { label: "Volume 24h", value: fmtVol(info.volume) },
    { label: "Circulating", value: fmtVol(info.circulatingSup) },
    ];
    if (info.assetType === "fx") return [...base,
    { label: "Bid", value: fmtPrice(info.bid, 4) },
    { label: "Ask", value: fmtPrice(info.ask, 4) },
    ];
    if (info.assetType === "commodity") return [...base,
    { label: "Volume", value: fmtVol(info.volume) },
    { label: "Bid", value: fmtPrice(info.bid, 4) },
    { label: "Ask", value: fmtPrice(info.ask, 4) },
    ];
    if (info.assetType === "bond" || info.assetType === "etf") return [...base,
    { label: "Volume", value: fmtVol(info.volume) },
    { label: "Yield", value: info.yield ? `${fmtPrice(info.yield * 100)}%` : "—" },
    { label: "NAV", value: info.navPrice ? `$${fmtPrice(info.navPrice)}` : "—" },
    ];
    return base;
  }

  return (
    <div style={{ minHeight: "100vh", background: G.bg, fontFamily: "'Syne',sans-serif", color: G.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
      `}</style>

      <Nav navigate={navigate} />

      {/* BREADCRUMB */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 24px", borderBottom: `1px solid rgba(30,58,95,0.25)`,
        fontSize: 12, color: G.text3,
      }}>
        <span style={{ cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.color = G.teal}
          onMouseLeave={e => e.currentTarget.style.color = G.text3}
          onClick={() => navigate("/")}>Home</span>
        <span style={{ color: G.text4 }}>›</span>
        <span style={{ cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.color = G.teal}
          onMouseLeave={e => e.currentTarget.style.color = G.text3}
          onClick={() => navigate("/markets")}>Markets</span>
        <span style={{ color: G.text4 }}>›</span>
        <span style={{ color: G.text2 }}>{ticker}</span>
      </div>

      {error && (
        <div style={{ padding: 20, color: G.red, fontSize: 13, textAlign: "center" }}>
          Failed to load: {error}
        </div>
      )}

      <div style={{ display: "flex" }}>

        {/* LEFT */}
        <div style={{ flex: 1, padding: "20px 16px 20px 24px", minWidth: 0 }}>

          {loadingInfo && (
            <div style={{ height: 80, display: "flex", alignItems: "center" }}>
              <span style={{ color: G.text3, fontSize: 13 }}>Loading...</span>
            </div>
          )}

          {/* header */}
          {!loadingInfo && info && (
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>{info.label}</h1>
                  <span style={{
                    fontSize: 9, fontFamily: "'Space Mono',monospace", fontWeight: 700,
                    padding: "3px 8px", borderRadius: 4, textTransform: "uppercase",
                    background: "rgba(6,255,165,0.07)", color: G.text3,
                    border: "1px solid rgba(6,255,165,0.2)",
                  }}>{info.assetType}</span>
                </div>
                <div style={{ fontSize: 13, color: G.text3 }}>{info.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Space Mono',monospace", letterSpacing: "-1px" }}>
                  ${fmtPrice(info.price)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: isUp ? G.green : G.red }}>
                  {isUp ? "▲" : "▼"} {info.changePct >= 0 ? "+" : ""}{fmtPrice(info.changePct)}%
                </div>
              </div>
            </div>
          )}

          {/* stats */}
          {!loadingInfo && info && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 8, marginBottom: 20,
            }}>
              {getStats().map((s, i) => <StatCard key={i} label={s.label} value={s.value} />)}
            </div>
          )}

          {/* period selector */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{
              display: "flex", gap: 2,
              background: G.s1, border: `1px solid ${G.border}`,
              borderRadius: 7, padding: 2,
            }}>
              {PERIODS.map(({ label }) => (
                <button key={label} onClick={() => setPeriod(label)} style={{
                  padding: "4px 10px", borderRadius: 5, fontSize: 11,
                  fontFamily: "'Space Mono',monospace", fontWeight: 700,
                  background: period === label ? G.teal : "none",
                  color: period === label ? G.bg : G.text3,
                  border: "none", cursor: "pointer", transition: "all .15s",
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* chart */}
          <div style={{
            background: G.s1, border: `1px solid ${G.border}`,
            borderRadius: 8, overflow: "hidden", marginBottom: 16,
          }}>
            {loadingChart ? (
              <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: G.text3, fontSize: 13 }}>Loading chart...</span>
              </div>
            ) : candles.length === 0 ? (
              <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: G.text3, fontSize: 13 }}>No data available</span>
              </div>
            ) : (
              <PriceChart key={period} candles={candles} isUp={isUp} />
            )}
          </div>

        </div>

        {/* RIGHT — sidebar */}
        <div style={{
          width: 260, flexShrink: 0,
          padding: "20px 24px 20px 0",
          display: "flex", flexDirection: "column", gap: 12,
          overflowY: "auto", maxHeight: "calc(100vh - 52px)",
        }}>
          {info && (
            <ModelPickerPanel assetType={info.assetType} ticker={ticker} navigate={navigate} />
          )}
          <NewsPanel
            title={`${ticker} News`}
            ticker={ticker}
            numArticles={6}
          />
        </div>

      </div>
    </div>
  );
}
