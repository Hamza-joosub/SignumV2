import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { G } from "../styles/tokens";
import NewsPanel from "../components/NewsPanel";

const API = "http://localhost:8000";
const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y", "2Y", "5Y"];
const TF_CAPS = { "1D": 3, "1W": 8, "1M": 15, "3M": 30, "1Y": 60, "2Y": 80, "5Y": 200 };

// display label for each category key
const CATEGORY_LABELS = {
  stocks: "Stocks",
  fx: "FX",
  crypto: "Crypto",
  commodities: "Commodities",
  bonds: "Bonds",
};

// models relevant to each category
const CATEGORY_MODELS = {
  stocks: [{ name: "Multi-Factor", tag: "Quant" }, { name: "Momentum/MR", tag: "Quant" }, { name: "GARCH", tag: "Quant" }, { name: "Hist. P/E", tag: "Fundamental" }],
  crypto: [{ name: "Multi-Factor", tag: "Quant" }, { name: "Momentum/MR", tag: "Quant" }, { name: "GARCH", tag: "Quant" }, { name: "Monte Carlo", tag: "Quant" }],
  commodities: [{ name: "Multi-Factor", tag: "Quant" }, { name: "Momentum/MR", tag: "Quant" }, { name: "GARCH", tag: "Quant" }],
  bonds: [{ name: "Multi-Factor", tag: "Quant" }, { name: "GARCH", tag: "Quant" }, { name: "Monte Carlo", tag: "Quant" }],
  fx: [{ name: "Multi-Factor", tag: "Quant" }, { name: "Momentum/MR", tag: "Quant" }, { name: "GARCH", tag: "Quant" }],
};

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

// ── SIDEBAR PANELS ────────────────────────────────────────────────────────

function ModelPickerPanel({ category, navigate }) {
  const models = CATEGORY_MODELS[category] || [];
  return (
    <div style={{ background: G.s1, border: `1px solid ${G.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: G.text }}>Model Picker</span>
        <span style={{ fontSize: 10, color: G.text3, fontFamily: "'Space Mono',monospace", textTransform: "capitalize" }}>{category}</span>
      </div>
      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {models.map((m, i) => {
          const s = tagStyle(m.tag);
          return (
            <button key={i}
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
              onClick={() => { if (label === "Overview") navigate("/"); if (label === "Models") navigate("/models"); if (label === "Markets") navigate("/markets"); }}
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

// ── CATEGORY PAGE ─────────────────────────────────────────────────────────

export default function Category() {
  const navigate = useNavigate();
  const { category } = useParams();  // e.g. "stocks", "crypto"

  const [tf, setTf] = useState("1W");
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const label = CATEGORY_LABELS[category] || category;

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/heatmap/${category}?tf=${tf}&view=full`)
      .then(r => r.json())
      .then(data => {
        setInstruments(data.instruments || []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [category, tf]);

  const treeData = instruments.map(inst => ({
    name: inst.label,
    label: inst.label,
    ticker: inst.ticker,
    value: inst.weight || 100,
    change: inst.return,
  }));

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
        <span style={{ color: G.text2 }}>{label}</span>
      </div>

      {/* MAIN */}
      <div style={{ display: "flex" }}>

        {/* LEFT — full treemap */}
        <div style={{ flex: 1, padding: "20px 16px 20px 24px", minWidth: 0 }}>

          {/* title + timeframe */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>{label}</h1>
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
              Loading {label} data...
            </div>
          )}

          {!loading && !error && (
            <div style={{
              border: `1px solid rgba(245,158,11,0.25)`,
              borderRadius: 8, overflow: "hidden", background: G.bg,
            }}>
              <ResponsiveContainer width="100%" height={800}>
                <Treemap
                  data={treeData}
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
                      onClick={ticker => navigate(`/markets/instrument/${ticker}`)}
                    />
                  )}
                >
                  <Tooltip content={(p) => <HeatTip {...p} tf={tf} />} />
                </Treemap>
              </ResponsiveContainer>
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
          <ModelPickerPanel category={category} navigate={navigate} />
        </div>
      </div>
    </div>
  );
}
