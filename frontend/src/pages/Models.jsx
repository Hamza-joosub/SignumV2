import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { G } from "../styles/tokens";

const MODELS = [
  {
    id:          "multi-factor",
    name:        "Multi-Factor",
    tag:         "Quant",
    badge:       "CORE",
    description: "Combines momentum, value, quality, and low-volatility signals into a single composite score. Ranks instruments within their asset class and generates long/short signals based on factor exposure.",
    assetTypes:  ["stock", "crypto", "commodity", "fx", "bond"],
    metrics:     ["Factor Scores", "Composite Rank", "Long/Short Signal"],
    complexity:  3,
  },
  {
    id:          "momentum-mr",
    name:        "Momentum / Mean Reversion",
    tag:         "Quant",
    badge:       "POPULAR",
    description: "Detects trending vs. mean-reverting regimes using autocorrelation and Hurst exponent. Switches between trend-following and contrarian strategies dynamically based on the prevailing regime.",
    assetTypes:  ["stock", "crypto", "commodity", "fx"],
    metrics:     ["Hurst Exponent", "Regime", "Entry Signal"],
    complexity:  2,
  },
  {
    id:          "garch",
    name:        "GARCH Volatility",
    tag:         "Quant",
    badge:       null,
    description: "Fits a GARCH(1,1) model to estimate conditional volatility and forecast variance. Useful for options pricing, risk management, and identifying volatility regime shifts.",
    assetTypes:  ["stock", "crypto", "commodity", "fx", "bond"],
    metrics:     ["Conditional Vol", "VaR (95%)", "Volatility Forecast"],
    complexity:  2,
  },
  {
    id:          "monte-carlo",
    name:        "Monte Carlo Simulation",
    tag:         "Quant",
    badge:       null,
    description: "Runs thousands of GBM-based price path simulations calibrated to historical drift and volatility. Outputs a distribution of future prices with confidence intervals and tail risk estimates.",
    assetTypes:  ["crypto", "bond"],
    metrics:     ["Price Distribution", "5th / 95th Pct", "Expected Return"],
    complexity:  3,
  },
  {
    id:          "hist-pe",
    name:        "Historical P/E",
    tag:         "Fundamental",
    badge:       null,
    description: "Compares current price-to-earnings ratio against the instrument's own historical P/E range. Surfaces potential over/undervaluation relative to the stock's own trading history.",
    assetTypes:  ["stock"],
    metrics:     ["Current P/E", "Historical Range", "Valuation Signal"],
    complexity:  1,
  },
];

const ALL_TAGS   = ["All", "Quant", "Fundamental"];
const ALL_ASSETS = ["All", "stock", "crypto", "commodity", "fx", "bond"];

// ── HELPERS ───────────────────────────────────────────────────────────────

function complexityDots(n) {
  return [1, 2, 3].map(i => (
    <div key={i} style={{
      width: 6, height: 6, borderRadius: "50%",
      background: i <= n ? G.teal : "rgba(6,255,165,0.15)",
    }} />
  ));
}

function tagStyle(tag) {
  if (tag === "Fundamental")
    return { bg:"rgba(245,158,11,0.12)", color:G.amber, border:"rgba(245,158,11,0.3)" };
  return { bg:"rgba(6,255,165,0.07)", color:G.teal, border:"rgba(6,255,165,0.25)" };
}

function badgeStyle(badge) {
  if (badge === "CORE")    return { bg:"rgba(6,255,165,0.12)",  color:G.teal,  border:"rgba(6,255,165,0.35)"  };
  if (badge === "POPULAR") return { bg:"rgba(99,102,241,0.12)", color:"#818cf8", border:"rgba(99,102,241,0.3)" };
  return null;
}

// ── NAV ───────────────────────────────────────────────────────────────────

function Nav({ navigate }) {
  const [q, setQ] = useState("");
  return (
    <nav style={{
      position:"sticky", top:0, zIndex:100,
      height:52, display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 24px",
      background:"rgba(6,13,26,0.96)", backdropFilter:"blur(20px)",
      borderBottom:`1px solid ${G.border}`,
    }}>
      <span style={{ fontWeight:800, fontSize:16, letterSpacing:"-0.5px", cursor:"pointer" }}
        onClick={() => navigate("/")}>QuantLab</span>

      <div style={{ display:"flex", gap:2 }}>
        {["Overview","Models","Markets"].map(label => {
          const active = label === "Models";
          return (
            <button key={label}
              onClick={() => {
                if (label==="Overview") navigate("/");
                if (label==="Markets")  navigate("/markets");
              }}
              style={{
                padding:"5px 14px", borderRadius:6, fontSize:13,
                fontWeight: active ? 700 : 500,
                fontFamily:"'Syne',sans-serif",
                color:   active ? G.bg    : G.text2,
                background: active ? G.teal : "none",
                border:"none", cursor:"pointer", transition:"all .15s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color=G.text; e.currentTarget.style.background=G.s2; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color=G.text2; e.currentTarget.style.background="none"; }}}
            >{label}</button>
          );
        })}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <input
          placeholder="Search Ticker"
          value={q}
          onChange={e => setQ(e.target.value.toUpperCase())}
          onKeyDown={e => {
            if (e.key==="Enter" && q.trim()) {
              navigate(`/markets/instrument/${q.trim()}`);
              setQ("");
            }
          }}
          style={{ background:"none", border:"none", outline:"none", fontSize:13, color:G.text2, width:120, fontFamily:"'Syne',sans-serif" }}
        />
        <div style={{
          width:30, height:30, borderRadius:"50%",
          background:"linear-gradient(135deg, #06ffa5, #0077ff)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, fontWeight:700, color:G.bg,
        }}>H</div>
      </div>
    </nav>
  );
}

// ── MODEL CARD ────────────────────────────────────────────────────────────

function ModelCard({ model, navigate }) {
  const [hov, setHov] = useState(false);
  const ts  = tagStyle(model.tag);
  const bs  = model.badge ? badgeStyle(model.badge) : null;

  return (
    <div
      onClick={() => navigate(`/models/${model.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   G.s1,
        border:       `1px solid ${hov ? "rgba(6,255,165,0.3)" : G.border}`,
        borderRadius: 12,
        padding:      "22px 24px",
        cursor:       "pointer",
        transition:   "all .2s",
        transform:    hov ? "translateY(-2px)" : "translateY(0)",
        boxShadow:    hov ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
        display:      "flex",
        flexDirection:"column",
        gap:          14,
        position:     "relative",
        overflow:     "hidden",
      }}
    >
      {/* subtle teal glow on hover */}
      {hov && (
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:1,
          background:"linear-gradient(90deg, transparent, rgba(6,255,165,0.5), transparent)",
        }} />
      )}

      {/* top row */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <h2 style={{ fontSize:16, fontWeight:800, color:G.text, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.3px" }}>
            {model.name}
          </h2>
          {bs && (
            <span style={{
              fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700,
              padding:"2px 7px", borderRadius:4, letterSpacing:"0.5px",
              background:bs.bg, color:bs.color, border:`1px solid ${bs.border}`,
            }}>{model.badge}</span>
          )}
        </div>

        <span style={{
          fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700,
          padding:"3px 8px", borderRadius:4, whiteSpace:"nowrap", flexShrink:0,
          background:ts.bg, color:ts.color, border:`1px solid ${ts.border}`,
        }}>{model.tag}</span>
      </div>

      {/* description */}
      <p style={{
        fontSize:13, color:G.text3, lineHeight:1.7,
        fontFamily:"'Syne',sans-serif",
      }}>
        {model.description}
      </p>

      {/* metrics */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {model.metrics.map((m, i) => (
          <span key={i} style={{
            fontSize:10, fontFamily:"'Space Mono',monospace",
            padding:"3px 9px", borderRadius:4,
            background:"rgba(30,58,95,0.5)",
            color:G.text3, border:`1px solid ${G.border}`,
          }}>{m}</span>
        ))}
      </div>

      {/* bottom row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:2 }}>
        {/* asset types */}
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {model.assetTypes.map((a, i) => (
            <span key={i} style={{
              fontSize:9, fontFamily:"'Space Mono',monospace",
              padding:"2px 7px", borderRadius:3, textTransform:"capitalize",
              background:"rgba(6,255,165,0.05)",
              color: hov ? G.teal : G.text3,
              border:`1px solid ${hov ? "rgba(6,255,165,0.2)" : "rgba(30,58,95,0.5)"}`,
              transition:"all .2s",
            }}>{a}</span>
          ))}
        </div>

        {/* complexity + run button */}
        <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontSize:9, color:G.text3, fontFamily:"'Space Mono',monospace" }}>COMPLEXITY</span>
            <div style={{ display:"flex", gap:3 }}>{complexityDots(model.complexity)}</div>
          </div>
          <div style={{
            display:"flex", alignItems:"center", gap:5,
            padding:"5px 12px", borderRadius:6,
            background: hov ? G.teal : "rgba(6,255,165,0.07)",
            border:`1px solid rgba(6,255,165,0.3)`,
            transition:"all .2s",
          }}>
            <span style={{
              fontSize:11, fontFamily:"'Space Mono',monospace", fontWeight:700,
              color: hov ? G.bg : G.teal,
            }}>Run →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MODELS PAGE ───────────────────────────────────────────────────────────

export default function Models() {
  const navigate   = useNavigate();
  const [tagFilter,   setTagFilter]   = useState("All");
  const [assetFilter, setAssetFilter] = useState("All");

  const filtered = MODELS.filter(m => {
    const tagOk   = tagFilter   === "All" || m.tag === tagFilter;
    const assetOk = assetFilter === "All" || m.assetTypes.includes(assetFilter);
    return tagOk && assetOk;
  });

  return (
    <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"'Syne',sans-serif", color:G.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
      `}</style>

      <Nav navigate={navigate} />

      {/* BREADCRUMB */}
      <div style={{
        display:"flex", alignItems:"center", gap:6,
        padding:"8px 24px", borderBottom:`1px solid rgba(30,58,95,0.25)`,
        fontSize:12, color:G.text3,
      }}>
        <span style={{ cursor:"pointer" }}
          onMouseEnter={e => e.currentTarget.style.color=G.teal}
          onMouseLeave={e => e.currentTarget.style.color=G.text3}
          onClick={() => navigate("/")}>Home</span>
        <span style={{ color:G.text4 }}>›</span>
        <span style={{ color:G.text2 }}>Models</span>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 24px" }}>

        {/* header */}
        <div style={{ marginBottom:32 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
            <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:"-0.7px" }}>Model Library</h1>
            <span style={{
              fontSize:10, fontFamily:"'Space Mono',monospace", fontWeight:700,
              padding:"3px 9px", borderRadius:4,
              background:"rgba(6,255,165,0.07)", color:G.text3,
              border:`1px solid rgba(6,255,165,0.2)`,
            }}>{filtered.length} MODEL{filtered.length !== 1 ? "S" : ""}</span>
          </div>
          <p style={{ fontSize:13, color:G.text3, lineHeight:1.6 }}>
            Quantitative and fundamental models for pricing, risk, and signal generation across asset classes.
          </p>
        </div>

        {/* filters */}
        <div style={{
          display:"flex", gap:16, marginBottom:24,
          paddingBottom:20, borderBottom:`1px solid rgba(30,58,95,0.4)`,
          flexWrap:"wrap",
        }}>
          {/* tag filter */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10, color:G.text3, fontFamily:"'Space Mono',monospace", letterSpacing:"0.5px" }}>TYPE</span>
            <div style={{
              display:"flex", gap:2,
              background:G.s1, border:`1px solid ${G.border}`,
              borderRadius:7, padding:2,
            }}>
              {ALL_TAGS.map(t => (
                <button key={t} onClick={() => setTagFilter(t)} style={{
                  padding:"4px 12px", borderRadius:5, fontSize:11,
                  fontFamily:"'Space Mono',monospace", fontWeight:700,
                  background:tagFilter===t ? G.teal : "none",
                  color:tagFilter===t ? G.bg : G.text3,
                  border:"none", cursor:"pointer", transition:"all .15s",
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* asset filter */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10, color:G.text3, fontFamily:"'Space Mono',monospace", letterSpacing:"0.5px" }}>ASSET</span>
            <div style={{
              display:"flex", gap:2, flexWrap:"wrap",
              background:G.s1, border:`1px solid ${G.border}`,
              borderRadius:7, padding:2,
            }}>
              {ALL_ASSETS.map(a => (
                <button key={a} onClick={() => setAssetFilter(a)} style={{
                  padding:"4px 12px", borderRadius:5, fontSize:11,
                  fontFamily:"'Space Mono',monospace", fontWeight:700,
                  background:assetFilter===a ? G.teal : "none",
                  color:assetFilter===a ? G.bg : G.text3,
                  border:"none", cursor:"pointer", transition:"all .15s",
                  textTransform:"capitalize",
                }}>{a}</button>
              ))}
            </div>
          </div>
        </div>

        {/* model cards */}
        {filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:"center", color:G.text3, fontSize:13 }}>
            No models match the selected filters.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {filtered.map(m => (
              <ModelCard key={m.id} model={m} navigate={navigate} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
