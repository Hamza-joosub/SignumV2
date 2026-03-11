import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { G } from "../styles/tokens";
import NewsPanel from "../components/NewsPanel";

const API = import.meta.env.VITE_API_URL;

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y", "2Y", "5Y"];
const TF_CAPS = { "1D": 3, "1W": 8, "1M": 15, "3M": 30, "1Y": 60, "2Y": 80, "5Y": 200 };

const CATEGORIES = [
  { key: "stocks", label: "Stocks" },
  { key: "fx", label: "FX" },
  { key: "crypto", label: "Crypto" },
  { key: "commodities", label: "Commodities" },
  { key: "bonds", label: "Bonds" },
];

function getCategory(ticker) {
  if (["NVDA", "AAPL", "MSFT", "AMZN", "GOOG", "AVGO", "META", "TSLA", "BRK-B"].includes(ticker)) return "stocks";
  if (["EUR=X", "JPY=X", "GBP=X", "CAD=X", "CHF=X"].includes(ticker)) return "fx";
  if (["BTC-USD", "ETH-USD", "BNB-USD", "XRP-USD", "SOL-USD"].includes(ticker)) return "crypto";
  if (["BZ=F", "CL=F", "GC=F", "HG=F", "NG=F", "ZC=F", "ZS=F", "SI=F", "KE=F", "KC=F"].includes(ticker)) return "commodities";
  if (["TLT", "IEF", "MBB", "EMB", "SHY", "SDEU.L", "1482.T", "IGLT.L"].includes(ticker)) return "bonds";
  return null;
}

const ALL_MODELS = [
  { name: "Multi-Factor", tag: "Quant" },
  { name: "Momentum/MR", tag: "Quant" },
  { name: "GARCH", tag: "Quant" },
  { name: "Monte Carlo", tag: "Quant" },
  { name: "Hist. P/E", tag: "Fundamental" },
];

const RELEASES = [
  { time: "08:30", name: "CPI (MoM)", tag: "Central Bank" },
  { time: "10:30", name: "Non Farm Payrolls", tag: "Macro" },
  { time: "14:00", name: "Fed Minutes", tag: "Central Bank" },
];

// ── HELPERS ───────────────────────────────────────────────────────────────

function cellColor(change, tf) {
  const cap = TF_CAPS[tf] || 3;
  const intensity = Math.min(Math.abs(change || 0) / cap, 1);
  const base = 0.15 + intensity * 0.8;
  return change >= 0
    ? `rgba(34,197,94,${base})`
    : `rgba(239,68,68,${base})`;
}

function fmtChange(v) {
  if (v === undefined || v === null) return "—";
  return `${v >= 0 ? "+" : ""}${Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)}%`;
}

function tagStyle(tag) {
  if (tag === "Central Bank" || tag === "Fundamental")
    return { bg: "rgba(245,158,11,0.12)", color: G.amber, border: "rgba(245,158,11,0.3)" };
  return { bg: "rgba(6,255,165,0.07)", color: G.teal, border: "rgba(6,255,165,0.25)" };
}

// ── TREEMAP CELL ──────────────────────────────────────────────────────────

function HeatCell({ x, y, width, height, label, ticker, change, tf, onClick }) {
  const [hov, setHov] = useState(false);
  const bg = cellColor(change, tf);
  const showLabel = width > 38 && height > 26;
  const showChange = width > 55 && height > 48;

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={() => onClick && onClick(ticker)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <rect
        x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        fill={bg} rx={3}
        stroke={hov ? G.teal : "transparent"}
        strokeWidth={hov ? 1.5 : 0}
      />
      {showLabel && (
        <text
          x={x + width / 2} y={y + height / 2 - (showChange ? 7 : 0)}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.92)"
          fontSize={Math.min(12, width / 5)}
          fontFamily="Syne,sans-serif" fontWeight="700"
          style={{ pointerEvents: "none" }}
        >
          {label}
        </text>
      )}
      {showChange && (
        <text
          x={x + width / 2} y={y + height / 2 + 9}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.6)"
          fontSize={Math.min(10, width / 7)}
          fontFamily="Space Mono,monospace"
          style={{ pointerEvents: "none" }}
        >
          {fmtChange(change)}
        </text>
      )}
    </g>
  );
}

function HeatTip({ active, payload, tf }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: G.s1, border: `1px solid ${G.border}`,
      borderRadius: 8, padding: "10px 14px",
      fontFamily: "'Space Mono',monospace", fontSize: 12,
      pointerEvents: "none",
    }}>
      <div style={{ color: G.teal, fontWeight: 700, marginBottom: 3 }}>{d.label}</div>
      <div style={{ color: d.change >= 0 ? G.green : G.red, fontWeight: 700 }}>
        {d.change >= 0 ? "▲ " : "▼ "}{fmtChange(d.change)}
      </div>
      <div style={{ color: G.text3, fontSize: 10, marginTop: 3 }}>
        {tf} return · click to view
      </div>
    </div>
  );
}

// ── HEATMAP GROUP ─────────────────────────────────────────────────────────

function HeatGroup({ categoryKey, label, instruments, tf, height, onViewCategory, onViewInstrument }) {
  const [hov, setHov] = useState(false);

  const data = instruments.map(inst => ({
    name: inst.label,
    label: inst.label,
    ticker: inst.ticker,
    value: inst.weight || 100,
    change: inst.return,
  }));

  return (
    <div
      style={{
        border: `1px solid rgba(245,158,11,${hov ? 0.5 : 0.25})`,
        borderRadius: 8, overflow: "hidden", background: G.bg,
        transition: "border-color .2s",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* group header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "5px 10px",
        background: "rgba(10,22,40,0.95)",
        borderBottom: "1px solid rgba(245,158,11,0.15)",
      }}>
        <button
          onClick={() => onViewCategory(categoryKey)}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
        >
          <span style={{
            fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase",
            color: hov ? G.teal : G.text2,
            fontFamily: "'Syne',sans-serif", fontWeight: 700, transition: "color .2s",
          }}>
            {label}
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 16, height: 16, borderRadius: 3,
            background: hov ? "rgba(6,255,165,0.13)" : "rgba(6,255,165,0.07)",
            border: `1px solid rgba(6,255,165,0.25)`,
            color: hov ? G.teal : G.text3, fontSize: 9,
          }}>↗</span>
        </button>

        <button
          onClick={() => onViewCategory(categoryKey)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: hov ? "rgba(6,255,165,0.13)" : "rgba(6,255,165,0.07)",
            border: `1px solid rgba(6,255,165,0.25)`,
            borderRadius: 4, padding: "2px 8px", cursor: "pointer", transition: "all .2s",
          }}
        >
          <span style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: hov ? G.teal : G.text3 }}>
            Browse ≡
          </span>
        </button>
      </div>

      {/* treemap */}
      {instruments.length === 0 ? (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: G.text3 }}>No data</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <Treemap
            data={data}
            dataKey="value"
            aspectRatio={4 / 3}
            isAnimationActive={false}
            content={(props) => (
              <HeatCell
                {...props}
                label={props.label}
                ticker={props.ticker}
                change={props.change}
                tf={tf}
                onClick={onViewInstrument}
              />
            )}
          >
            <Tooltip content={(p) => <HeatTip {...p} tf={tf} />} />
          </Treemap>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── SIDEBAR PANELS ────────────────────────────────────────────────────────

function ModelPickerPanel({ navigate }) {
  return (
    <div style={{ background: G.s1, border: `1px solid ${G.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${G.border}` }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: G.text }}>Model Picker</span>
      </div>
      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {ALL_MODELS.map((m, i) => {
          const s = tagStyle(m.tag);
          return (
            <button
              key={i}
              onClick={() => navigate(`/models/${m.name.toLowerCase().replace(/[^a-z]/g, "-")}`)}
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

function ReleasesPanel() {
  return (
    <div style={{ background: G.s1, border: `1px solid ${G.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${G.border}` }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: G.text }}>Economic Releases</span>
      </div>
      {RELEASES.map((r, i) => {
        const s = tagStyle(r.tag);
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 14px", borderBottom: `1px solid rgba(30,58,95,0.25)`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: G.text3, fontFamily: "'Space Mono',monospace", minWidth: 36 }}>{r.time}</span>
              <span style={{ fontSize: 12, color: G.text2 }}>{r.name}</span>
            </div>
            <span style={{
              fontSize: 9, fontFamily: "'Space Mono',monospace", fontWeight: 700,
              padding: "2px 7px", borderRadius: 4,
              background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            }}>{r.tag}</span>
          </div>
        );
      })}
    </div>
  );
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
        {["Overview", "Models", "Markets"].map(label => {
          const active = label === "Markets";
          return (
            <button key={label}
              onClick={() => { if (label === "Overview") navigate("/"); if (label === "Models") navigate("/models"); }}
              style={{
                padding: "5px 14px", borderRadius: 6, fontSize: 13,
                fontWeight: active ? 700 : 500, fontFamily: "'Syne',sans-serif",
                color: active ? G.bg : G.text2,
                background: active ? G.teal : "none",
                border: "none", cursor: "pointer", transition: "all .15s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = G.text; e.currentTarget.style.background = G.s2; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = G.text2; e.currentTarget.style.background = "none"; } }}
            >{label}</button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          placeholder="Search Ticker"
          value={q}
          onChange={e => setQ(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === "Enter" && q.trim()) { navigate(`/markets/instrument/${q.trim()}`); setQ(""); } }}
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

// ── MARKETS PAGE ──────────────────────────────────────────────────────────

export default function Markets() {
  const navigate = useNavigate();
  const [tf, setTf] = useState("1W");
  const [grouped, setGrouped] = useState({ stocks: [], fx: [], crypto: [], commodities: [], bonds: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/heatmap?tf=${tf}`)
      .then(r => r.json())
      .then(data => {
        const g = { stocks: [], fx: [], crypto: [], commodities: [], bonds: [] };
        data.instruments.forEach(inst => {
          const cat = getCategory(inst.ticker);
          if (cat) g[cat].push(inst);
        });
        setGrouped(g);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [tf]);

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
        <span
          style={{ cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.color = G.teal}
          onMouseLeave={e => e.currentTarget.style.color = G.text3}
          onClick={() => navigate("/")}
        >Home</span>
        <span style={{ color: G.text4 }}>›</span>
        <span style={{ color: G.text2 }}>Markets</span>
      </div>

      {/* MAIN */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 86px)" }}>

        {/* LEFT — heatmaps */}
        <div style={{ flex: 1, padding: "20px 16px 20px 24px", minWidth: 0 }}>

          {/* title + timeframe selector */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>Markets</h1>
            <div style={{
              display: "flex", gap: 2,
              background: G.s1, border: `1px solid ${G.border}`,
              borderRadius: 7, padding: 2,
            }}>
              {TIMEFRAMES.map(t => (
                <button key={t} onClick={() => setTf(t)} style={{
                  padding: "4px 10px", borderRadius: 5, fontSize: 11,
                  fontFamily: "'Space Mono',monospace", fontWeight: 700,
                  background: tf === t ? G.teal : "none",
                  color: tf === t ? G.bg : G.text3,
                  border: "none", cursor: "pointer", transition: "all .15s",
                }}>{t}</button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: 20, color: G.red, fontSize: 13, textAlign: "center" }}>
              Failed to load: {error}
            </div>
          )}

          {loading && !error && (
            <div style={{ padding: 40, color: G.text3, fontSize: 13, textAlign: "center" }}>
              Loading market data...
            </div>
          )}

          {!loading && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* top row — Stocks, FX, Crypto */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {["stocks", "fx", "commodities"].map(key => {
                  const cat = CATEGORIES.find(c => c.key === key);
                  return (
                    <HeatGroup
                      key={key}
                      categoryKey={key}
                      label={cat.label}
                      instruments={grouped[key] || []}
                      tf={tf}
                      height={400}
                      onViewCategory={k => navigate(`/markets/${k}`)}
                      onViewInstrument={ticker => navigate(`/markets/instrument/${ticker}`)}
                    />
                  );
                })}
              </div>

              {/* bottom row — Commodities (wide), Bonds */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                {[, "crypto", "bonds"].map(key => {
                  const cat = CATEGORIES.find(c => c.key === key);
                  return (
                    <HeatGroup
                      key={key}
                      categoryKey={key}
                      label={cat.label}
                      instruments={grouped[key] || []}
                      tf={tf}
                      height={400}
                      onViewCategory={k => navigate(`/markets/${k}`)}
                      onViewInstrument={ticker => navigate(`/markets/instrument/${ticker}`)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — sidebar */}
        <div style={{
          width: 240, flexShrink: 0,
          padding: "20px 24px 20px 0",
          display: "flex", flexDirection: "column", gap: 12,
          overflowY: "auto", maxHeight: "calc(100vh - 52px)",
        }}>
          <NewsPanel title="Headlines" numArticles={5} />
          <ReleasesPanel />
          <ModelPickerPanel navigate={navigate} />
        </div>
      </div>
    </div>
  );
}
