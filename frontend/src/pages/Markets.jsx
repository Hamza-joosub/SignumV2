import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { G } from "../styles/tokens";
import NewsPanel from "../components/NewsPanel";

const API = import.meta.env.VITE_API_URL;

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y", "2Y", "5Y"];
const TF_CAPS = { "1D": 3, "1W": 8, "1M": 15, "3M": 30, "1Y": 60, "2Y": 80, "5Y": 200 };

const CATEGORIES = [
  { key: "stocks", label: "Equities", desc: "Large-cap US stocks" },
  { key: "fx", label: "FX", desc: "Major currency pairs" },
  { key: "crypto", label: "Crypto", desc: "Digital assets" },
  { key: "commodities", label: "Commodities", desc: "Energy, metals, agri" },
  { key: "bonds", label: "Bonds", desc: "Fixed income ETFs" },
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
  { name: "Multi-Factor", tag: "Quant", desc: "Ranks assets across momentum, value, quality and volatility factors." },
  { name: "Momentum/MR", tag: "Quant", desc: "Identifies trend continuation and mean-reversion entry signals." },
  { name: "GARCH", tag: "Quant", desc: "Models conditional volatility clustering for risk estimation." },
  { name: "Monte Carlo", tag: "Quant", desc: "Simulates thousands of price paths for probabilistic forecasting." },
  { name: "Hist. P/E", tag: "Fundamental", desc: "Compares current valuations against historical earnings multiples." },
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
  const base = 0.2 + intensity * 0.72;
  return change >= 0 ? `rgba(22,163,74,${base})` : `rgba(220,38,38,${base})`;
}

function fmtChange(v) {
  if (v === undefined || v === null) return "—";
  return `${v >= 0 ? "+" : ""}${Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)}%`;
}

// ── TREEMAP CELL ──────────────────────────────────────────────────────────

function HeatCell({ x, y, width, height, label, ticker, change, tf, onClick }) {
  const [hov, setHov] = useState(false);
  const bg = cellColor(change, tf);
  const showLabel = width > 36 && height > 24;
  const showChange = width > 54 && height > 46;
  return (
    <g style={{ cursor: "pointer" }} onClick={() => onClick && onClick(ticker)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={bg} rx={2}
        stroke={hov ? "rgba(0,0,0,0.3)" : "transparent"} strokeWidth={hov ? 1.5 : 0} />
      {showLabel && (
        <text x={x + width / 2} y={y + height / 2 - (showChange ? 7 : 0)}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.95)" fontSize={Math.min(12, width / 5)}
          fontFamily="DM Sans,sans-serif" fontWeight="600"
          style={{ pointerEvents: "none" }}>{label}</text>
      )}
      {showChange && (
        <text x={x + width / 2} y={y + height / 2 + 9}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.7)" fontSize={Math.min(10, width / 7)}
          fontFamily="DM Mono,monospace"
          style={{ pointerEvents: "none" }}>{fmtChange(change)}</text>
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
      background: G.bgDark, border: `1px solid ${G.borderDk}`,
      borderRadius: 5, padding: "10px 14px",
      fontFamily: "'DM Mono',monospace", fontSize: 11,
      pointerEvents: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    }}>
      <div style={{ color: G.textInv, fontWeight: 500, marginBottom: 4 }}>{d.label}</div>
      <div style={{ color: d.change >= 0 ? G.green : G.red, fontWeight: 700, fontSize: 13 }}>
        {d.change >= 0 ? "▲ " : "▼ "}{fmtChange(d.change)}
      </div>
      <div style={{ color: G.textInv3, fontSize: 10, marginTop: 5 }}>{tf} return · click to view</div>
    </div>
  );
}

// ── ASSET SECTION ─────────────────────────────────────────────────────────

function AssetSection({ categoryKey, label, desc, instruments, tf, height, onBrowse, onViewInstrument }) {
  const [hov, setHov] = useState(false);
  const data = instruments.map(inst => ({
    name: inst.label, label: inst.label, ticker: inst.ticker,
    value: inst.weight || 100, change: inst.return,
  }));
  const avgChange = instruments.length
    ? instruments.reduce((s, i) => s + (i.return || 0), 0) / instruments.length : null;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      border: `1px solid ${hov ? G.border2 : G.border}`,
      borderRadius: 6, overflow: "hidden", background: G.bg,
      transition: "border-color .2s, box-shadow .2s",
      boxShadow: hov ? "0 2px 16px rgba(0,0,0,0.06)" : "none",
    }}>
      {/* header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 14px", background: G.s1, borderBottom: `1px solid ${G.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: G.text }}>
            {label}
          </span>
          <span style={{ fontSize: 10, color: G.text3, fontFamily: "'DM Sans',sans-serif", borderLeft: `1px solid ${G.border}`, paddingLeft: 10 }}>
            {desc}
          </span>
          {avgChange !== null && (
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 500, color: avgChange >= 0 ? G.green : G.red }}>
              {avgChange >= 0 ? "▲" : "▼"} {fmtChange(avgChange)}
            </span>
          )}
        </div>
        <button onClick={() => onBrowse(categoryKey)} style={{
          fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 500,
          color: G.textInv,
          background: G.bgDark,
          border: `1px solid ${G.bgDark}`,
          borderRadius: 4, padding: "7px 18px", cursor: "pointer", transition: "all .2s",
          letterSpacing: "0.2px",
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.75"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >Browse all →</button>
      </div>
      {/* treemap */}
      {instruments.length === 0 ? (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: G.text3, fontFamily: "'DM Mono',monospace" }}>No data</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <Treemap data={data} dataKey="value" aspectRatio={4 / 3} isAnimationActive={false}
            content={(props) => (
              <HeatCell {...props} label={props.label} ticker={props.ticker}
                change={props.change} tf={tf} onClick={onViewInstrument} />
            )}>
            <Tooltip content={(p) => <HeatTip {...p} tf={tf} />} />
          </Treemap>
        </ResponsiveContainer>
      )}
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
      padding: "0 40px", background: G.bgDark, borderBottom: `1px solid ${G.borderDk}`,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, cursor: "pointer" }} onClick={() => navigate("/")}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 900, color: G.textInv, letterSpacing: "-0.3px" }}>Signum</span>
        <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: G.textInv3, letterSpacing: "2px", textTransform: "uppercase" }}>Analytics</span>
      </div>
      <div style={{ display: "flex" }}>
        {["Overview", "Models", "Markets"].map(label => {
          const active = label === "Markets";
          return (
            <button key={label}
              onClick={() => { if (label === "Overview") navigate("/"); if (label === "Models") navigate("/models"); }}
              style={{
                padding: "5px 16px", borderRadius: 4, fontSize: 12, fontWeight: 400,
                fontFamily: "'DM Sans',sans-serif",
                color: active ? G.textInv : G.textInv2,
                background: active ? "rgba(255,255,255,0.1)" : "none",
                border: "none", cursor: "pointer", transition: "all .15s",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = G.textInv; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = G.textInv2; }}
            >{label}</button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.06)", border: `1px solid ${G.borderDk}`,
          borderRadius: 4, padding: "5px 12px",
        }}>
          <span style={{ fontSize: 11, color: G.textInv3 }}>⌕</span>
          <input placeholder="Search ticker..." value={q}
            onChange={e => setQ(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === "Enter" && q.trim()) { navigate(`/markets/instrument/${q.trim()}`); setQ(""); } }}
            style={{ background: "none", border: "none", outline: "none", fontSize: 12, color: G.textInv, width: 110, fontFamily: "'DM Mono',monospace" }}
          />
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 600, color: G.textInv, cursor: "pointer",
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
    <div style={{ minHeight: "100vh", background: G.bg, fontFamily: "'DM Sans',sans-serif", color: G.text }}>
      <style>{`
        ${FONT}
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        ::placeholder { color:${G.text3}; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${G.border2}; border-radius:2px; }
      `}</style>

      <Nav navigate={navigate} />

      {/* ── PAGE HEADER ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 40px", background: G.s1, borderBottom: `1px solid ${G.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: G.text3, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.color = G.text}
            onMouseLeave={e => e.currentTarget.style.color = G.text3}
            onClick={() => navigate("/")}
          >Home</span>
          <span style={{ color: G.border2 }}>›</span>
          <span style={{ fontSize: 11, color: G.text2, fontFamily: "'DM Mono',monospace" }}>Markets</span>
        </div>
        <div style={{ display: "flex", gap: 1, background: G.bg, border: `1px solid ${G.border}`, borderRadius: 5, padding: 2 }}>
          {TIMEFRAMES.map(t => (
            <button key={t} onClick={() => setTf(t)} style={{
              padding: "4px 11px", borderRadius: 3, fontSize: 10,
              fontFamily: "'DM Mono',monospace", fontWeight: 500,
              background: tf === t ? G.bgDark : "none",
              color: tf === t ? G.textInv : G.text3,
              border: "none", cursor: "pointer", transition: "all .15s",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── HEATMAPS ── */}
      <div style={{ padding: "24px 40px 0", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        {error && (
          <div style={{ padding: 40, color: G.red, fontSize: 12, textAlign: "center", fontFamily: "'DM Mono',monospace" }}>
            Failed to load: {error}
          </div>
        )}
        {loading && !error && (
          <div style={{ padding: 60, color: G.text3, fontSize: 11, textAlign: "center", fontFamily: "'DM Mono',monospace", letterSpacing: "0.5px" }}>
            Loading market data...
          </div>
        )}
        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* 1. Equities — dominant, full width */}
            {/* ↓ adjust pixel heights here to suit your screen */}
            <AssetSection categoryKey="stocks" label="Equities" desc="Large-cap US stocks"
              instruments={grouped.stocks || []} tf={tf} height={200}
              onBrowse={k => navigate(`/markets/${k}`)}
              onViewInstrument={t => navigate(`/markets/instrument/${t}`)} />

            {/* 2. FX (wider) + Crypto */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 10 }}>
              {["fx", "crypto"].map(key => {
                const cat = CATEGORIES.find(c => c.key === key);
                return (
                  <AssetSection key={key} categoryKey={key} label={cat.label} desc={cat.desc}
                    instruments={grouped[key] || []} tf={tf} height={190}
                    onBrowse={k => navigate(`/markets/${k}`)}
                    onViewInstrument={t => navigate(`/markets/instrument/${t}`)} />
                );
              })}
            </div>

            {/* 3. Commodities + Bonds */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 10 }}>
              {["commodities", "bonds"].map(key => {
                const cat = CATEGORIES.find(c => c.key === key);
                return (
                  <AssetSection key={key} categoryKey={key} label={cat.label} desc={cat.desc}
                    instruments={grouped[key] || []} tf={tf} height={150}
                    onBrowse={k => navigate(`/markets/${k}`)}
                    onViewInstrument={t => navigate(`/markets/instrument/${t}`)} />
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* ── DARK BAND — Economic Calendar + live indicator ── */}
      <div style={{
        background: G.bgDark, margin: "32px 0 0",
        padding: "28px 40px",
        borderTop: `1px solid ${G.borderDk}`, borderBottom: `1px solid ${G.borderDk}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: G.textInv3, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 }}>
              Today's Economic Calendar
            </p>
            <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
              {RELEASES.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, color: G.textInv3, fontFamily: "'DM Mono',monospace", minWidth: 38 }}>{r.time}</span>
                  <span style={{ fontSize: 13, color: G.textInv2, fontFamily: "'DM Sans',sans-serif" }}>{r.name}</span>
                  <span style={{
                    fontSize: 8, fontFamily: "'DM Mono',monospace", letterSpacing: "0.3px", textTransform: "uppercase",
                    padding: "2px 6px", borderRadius: 3,
                    background: r.tag === "Central Bank" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)",
                    color: r.tag === "Central Bank" ? "#fbbf24" : G.textInv3,
                    border: r.tag === "Central Bank" ? "1px solid rgba(245,158,11,0.25)" : `1px solid ${G.borderDk}`,
                  }}>{r.tag}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: G.green, boxShadow: `0 0 6px ${G.green}` }} />
            <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: G.textInv3, letterSpacing: "1px", textTransform: "uppercase" }}>Live</span>
          </div>
        </div>
      </div>

      {/* ── MODELS ── */}
      <div style={{ padding: "48px 40px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", color: G.text }}>
            Analytical Models
          </h2>
          <button onClick={() => navigate("/models")}
            style={{
              fontSize: 11, fontFamily: "'DM Mono',monospace", color: G.text2,
              background: "none", border: `1px solid ${G.border}`, borderRadius: 3,
              padding: "5px 14px", cursor: "pointer", transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = G.bgDark; e.currentTarget.style.borderColor = G.bgDark; e.currentTarget.style.color = G.textInv; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.text2; }}
          >View all →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
          {ALL_MODELS.map((m, i) => {
            const isQuant = m.tag === "Quant";
            return (
              <button key={i}
                onClick={() => navigate(`/models/${m.name.toLowerCase().replace(/[^a-z]/g, "-")}`)}
                style={{
                  background: G.bg, border: `1px solid ${G.border}`,
                  borderRadius: 6, padding: "28px 24px",
                  cursor: "pointer", transition: "all .2s", textAlign: "left",
                  display: "flex", flexDirection: "column", gap: 16,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = G.bgDark;
                  e.currentTarget.style.borderColor = G.bgDark;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                  e.currentTarget.querySelectorAll(".card-title").forEach(el => el.style.color = G.textInv);
                  e.currentTarget.querySelectorAll(".card-desc").forEach(el => el.style.color = G.textInv2);
                  e.currentTarget.querySelectorAll(".card-arrow").forEach(el => el.style.color = G.textInv2);
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = G.bg;
                  e.currentTarget.style.borderColor = G.border;
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.querySelectorAll(".card-title").forEach(el => el.style.color = G.text);
                  e.currentTarget.querySelectorAll(".card-desc").forEach(el => el.style.color = G.text3);
                  e.currentTarget.querySelectorAll(".card-arrow").forEach(el => el.style.color = G.text3);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{
                    fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 500,
                    padding: "2px 7px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.5px",
                    background: isQuant ? G.s2 : "rgba(245,158,11,0.1)",
                    color: isQuant ? G.text3 : "#92400e",
                    border: isQuant ? `1px solid ${G.border}` : "1px solid rgba(245,158,11,0.3)",
                  }}>{m.tag}</span>
                  <span className="card-arrow" style={{ fontSize: 11, color: G.text3 }}>→</span>
                </div>
                <div>
                  <p className="card-title" style={{ fontSize: 15, fontWeight: 600, color: G.text, fontFamily: "'DM Sans',sans-serif", marginBottom: 8 }}>{m.name}</p>
                  <p className="card-desc" style={{ fontSize: 12, color: G.text3, fontFamily: "'DM Sans',sans-serif", fontWeight: 300, lineHeight: 1.7 }}>{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── HEADLINES ── */}
      <div style={{ padding: "48px 40px 72px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", color: G.text }}>
            Market Headlines
          </h2>
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: G.text3, letterSpacing: "0.5px" }}>via yFinance</span>
        </div>
        <div style={{ border: `1px solid ${G.border}`, borderRadius: 6, overflow: "hidden" }}>
          <NewsPanel numArticles={8} />
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        background: G.bgDarker, borderTop: `1px solid ${G.borderDk}`,
        padding: "20px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: G.textInv3 }}>Signum</span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: G.textInv3, letterSpacing: "0.5px" }}>
          Market data via yFinance · For informational purposes only
        </span>
      </footer>

    </div>
  );
}
