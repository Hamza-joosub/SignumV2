import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { G } from "../styles/tokens";

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const MODELS = [
  {
    id: "multi-factor",
    name: "Multi-Factor",
    tag: "Quant",
    badge: "CORE",
    description: "Combines momentum, value, quality, and low-volatility signals into a single composite score. Ranks instruments within their asset class and generates long/short signals based on factor exposure.",
    assetTypes: ["stock", "crypto", "commodity", "fx", "bond"],
    metrics: ["Factor Scores", "Composite Rank", "Long/Short Signal"],
    complexity: 3,
  },
  {
    id: "momentum-mr",
    name: "Momentum / Mean Reversion",
    tag: "Quant",
    badge: "POPULAR",
    description: "Detects trending vs. mean-reverting regimes using autocorrelation and Hurst exponent. Switches between trend-following and contrarian strategies dynamically based on the prevailing regime.",
    assetTypes: ["stock", "crypto", "commodity", "fx"],
    metrics: ["Hurst Exponent", "Regime", "Entry Signal"],
    complexity: 2,
  },
  {
    id: "garch",
    name: "GARCH Volatility",
    tag: "Quant",
    badge: null,
    description: "Fits a GARCH(1,1) model to estimate conditional volatility and forecast variance. Useful for options pricing, risk management, and identifying volatility regime shifts.",
    assetTypes: ["stock", "crypto", "commodity", "fx", "bond"],
    metrics: ["Conditional Vol", "VaR (95%)", "Volatility Forecast"],
    complexity: 2,
  },
  {
    id: "monte-carlo",
    name: "Monte Carlo Simulation",
    tag: "Quant",
    badge: null,
    description: "Runs thousands of GBM-based price path simulations calibrated to historical drift and volatility. Outputs a distribution of future prices with confidence intervals and tail risk estimates.",
    assetTypes: ["crypto", "bond"],
    metrics: ["Price Distribution", "5th / 95th Pct", "Expected Return"],
    complexity: 3,
  },
  {
    id: "hist-pe",
    name: "Historical P/E",
    tag: "Fundamental",
    badge: null,
    description: "Compares current price-to-earnings ratio against the instrument's own historical P/E range. Surfaces potential over/undervaluation relative to the stock's own trading history.",
    assetTypes: ["stock"],
    metrics: ["Current P/E", "Historical Range", "Valuation Signal"],
    complexity: 1,
  },
];

const ALL_TAGS   = ["All", "Quant", "Fundamental"];
const ALL_ASSETS = ["All", "stock", "crypto", "commodity", "fx", "bond"];

// ── HELPERS ───────────────────────────────────────────────────────────────

function ComplexityBar({ n, dark }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", color: dark ? G.textInv3 : G.text3, transition:"color .2s" }}>
        Complexity
      </span>
      <div style={{ display:"flex", gap:3 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{
            width:20, height:2, borderRadius:2,
            background: i <= n ? (dark ? G.textInv2 : G.text2) : (dark ? "rgba(255,255,255,0.12)" : G.border2),
            transition:"background .2s",
          }} />
        ))}
      </div>
    </div>
  );
}

function TagPill({ tag }) {
  const isQuant = tag === "Quant";
  return (
    <span style={{
      fontSize:8, fontFamily:"'DM Mono',monospace", fontWeight:500,
      padding:"2px 7px", borderRadius:3, textTransform:"uppercase", letterSpacing:"0.5px",
      background: isQuant ? G.s2 : "rgba(245,158,11,0.1)",
      color:      isQuant ? G.text3 : "#92400e",
      border:     isQuant ? `1px solid ${G.border}` : "1px solid rgba(245,158,11,0.3)",
      flexShrink: 0,
    }}>{tag}</span>
  );
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
        {["Overview","Models","Markets"].map(label => {
          const active = label === "Models";
          return (
            <button key={label}
              onClick={() => { if (label==="Overview") navigate("/"); if (label==="Markets") navigate("/markets"); }}
              style={{
                padding:"5px 16px", borderRadius:4, fontSize:12,
                fontFamily:"'DM Sans',sans-serif",
                color:      active ? G.textInv   : G.textInv2,
                background: active ? "rgba(255,255,255,0.1)" : "none",
                border:"none", cursor:"pointer", transition:"all .15s",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color=G.textInv; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color=G.textInv2; }}
            >{label}</button>
          );
        })}
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

// ── MODEL CARD ────────────────────────────────────────────────────────────

function ModelCard({ model, navigate }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={() => navigate(`/models/${model.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   hov ? G.bgDark : G.bg,
        border:       `1px solid ${hov ? G.bgDark : G.border}`,
        borderRadius: 6,
        padding:      "28px 32px",
        cursor:       "pointer",
        transition:   "all .2s",
        transform:    hov ? "translateY(-2px)" : "none",
        boxShadow:    hov ? "0 8px 24px rgba(0,0,0,0.1)" : "none",
      }}
    >
      {/* ── TOP ROW — name + tag ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <h2 style={{
            fontFamily:"'Playfair Display',serif",
            fontSize:20, fontWeight:700, letterSpacing:"-0.3px",
            color: hov ? G.textInv : G.text, transition:"color .2s",
          }}>
            {model.name}
          </h2>
          {model.badge && (
            <span style={{
              fontSize:8, fontFamily:"'DM Mono',monospace", fontWeight:500,
              padding:"2px 7px", borderRadius:3, letterSpacing:"1px",
              background: hov ? "rgba(255,255,255,0.1)" : G.s2,
              color:      hov ? G.textInv2 : G.text3,
              border:     hov ? "1px solid rgba(255,255,255,0.15)" : `1px solid ${G.border}`,
              transition:"all .2s",
            }}>{model.badge}</span>
          )}
        </div>
        <TagPill tag={model.tag} />
      </div>

      {/* ── DESCRIPTION ── */}
      <p style={{
        fontSize:13, lineHeight:1.8, fontWeight:300,
        color:      hov ? G.textInv2 : G.text2,
        fontFamily: "'DM Sans',sans-serif",
        marginBottom:20, maxWidth:720,
        transition:"color .2s",
      }}>
        {model.description}
      </p>

      {/* ── METRICS ── */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
        {model.metrics.map((m, i) => (
          <span key={i} style={{
            fontSize:10, fontFamily:"'DM Mono',monospace",
            padding:"3px 10px", borderRadius:3,
            background: hov ? "rgba(255,255,255,0.07)" : G.s1,
            color:      hov ? G.textInv3 : G.text3,
            border:     hov ? "1px solid rgba(255,255,255,0.1)" : `1px solid ${G.border}`,
            transition:"all .2s",
          }}>{m}</span>
        ))}
      </div>

      {/* ── BOTTOM ROW ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        {/* asset chips */}
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{
            fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase",
            color: hov ? G.textInv3 : G.text3, marginRight:4, transition:"color .2s",
          }}>Works with</span>
          {model.assetTypes.map((a, i) => (
            <span key={i} style={{
              fontSize:9, fontFamily:"'DM Mono',monospace",
              padding:"2px 7px", borderRadius:3, textTransform:"capitalize",
              background: hov ? "rgba(255,255,255,0.07)" : G.s2,
              color:      hov ? G.textInv2 : G.text3,
              border:     hov ? "1px solid rgba(255,255,255,0.12)" : `1px solid ${G.border2}`,
              transition:"all .2s",
            }}>{a}</span>
          ))}
        </div>

        {/* complexity + run */}
        <div style={{ display:"flex", alignItems:"center", gap:20, flexShrink:0 }}>
          <ComplexityBar n={model.complexity} dark={hov} />
          <button style={{
            fontSize:11, fontFamily:"'DM Mono',monospace", fontWeight:500,
            padding:"7px 20px", borderRadius:4, cursor:"pointer",
            background: hov ? G.textInv : G.bgDark,
            color:      hov ? G.bgDark   : G.textInv,
            border:     "none", transition:"all .2s",
            letterSpacing:"0.2px",
          }}>Run →</button>
        </div>
      </div>
    </div>
  );
}

// ── MODELS PAGE ───────────────────────────────────────────────────────────

export default function Models() {
  const navigate = useNavigate();
  const [tagFilter,   setTagFilter]   = useState("All");
  const [assetFilter, setAssetFilter] = useState("All");

  const filtered = MODELS.filter(m => {
    const tagOk   = tagFilter   === "All" || m.tag             === tagFilter;
    const assetOk = assetFilter === "All" || m.assetTypes.includes(assetFilter);
    return tagOk && assetOk;
  });

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

      {/* ── PAGE HEADER BAR ── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 40px", background:G.s1, borderBottom:`1px solid ${G.border}`,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {[["Home","/"],["Models",null]].map(([lbl,path],i) => (
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
        <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:G.text3, letterSpacing:"0.5px" }}>
          {filtered.length} model{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 40px" }}>

        {/* ── TITLE ── */}
        <div style={{ padding:"36px 0 28px", borderBottom:`1px solid ${G.border}` }}>
          <p style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:G.text3, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:14 }}>
            Model Library
          </p>
          <h1 style={{
            fontFamily:"'Playfair Display',serif",
            fontSize:"clamp(28px, 3vw, 40px)",
            fontWeight:900, letterSpacing:"-1px", lineHeight:1.08,
            color:G.text, marginBottom:14,
          }}>
            Quantitative &amp; fundamental<br/>
            <span style={{ fontStyle:"italic", fontWeight:700, color:G.text2 }}>models for every asset class.</span>
          </h1>
          <p style={{ fontSize:14, color:G.text3, fontWeight:300, lineHeight:1.7, maxWidth:520 }}>
            Institutional-grade pricing, risk, and signal-generation frameworks.
            No code required.
          </p>
        </div>

        {/* ── FILTERS ── */}
        <div style={{
          display:"flex", alignItems:"center", gap:20,
          padding:"14px 0", borderBottom:`1px solid ${G.border}`,
          flexWrap:"wrap",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:G.text3, letterSpacing:"1.5px", textTransform:"uppercase" }}>Type</span>
            <div style={{ display:"flex", gap:1, background:G.bg, border:`1px solid ${G.border}`, borderRadius:5, padding:2 }}>
              {ALL_TAGS.map(t => (
                <button key={t} onClick={() => setTagFilter(t)} style={{
                  padding:"4px 12px", borderRadius:3, fontSize:10,
                  fontFamily:"'DM Mono',monospace", fontWeight:500,
                  background: tagFilter===t ? G.bgDark : "none",
                  color:      tagFilter===t ? G.textInv : G.text3,
                  border:"none", cursor:"pointer", transition:"all .15s",
                }}>{t}</button>
              ))}
            </div>
          </div>

          <div style={{ width:1, height:20, background:G.border }} />

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:G.text3, letterSpacing:"1.5px", textTransform:"uppercase" }}>Asset</span>
            <div style={{ display:"flex", gap:1, background:G.bg, border:`1px solid ${G.border}`, borderRadius:5, padding:2 }}>
              {ALL_ASSETS.map(a => (
                <button key={a} onClick={() => setAssetFilter(a)} style={{
                  padding:"4px 12px", borderRadius:3, fontSize:10,
                  fontFamily:"'DM Mono',monospace", fontWeight:500,
                  background: assetFilter===a ? G.bgDark : "none",
                  color:      assetFilter===a ? G.textInv : G.text3,
                  border:"none", cursor:"pointer", transition:"all .15s",
                  textTransform:"capitalize",
                }}>{a}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CARDS ── */}
        <div style={{ padding:"20px 0 72px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding:60, textAlign:"center", color:G.text3, fontSize:12, fontFamily:"'DM Mono',monospace" }}>
              No models match the selected filters.
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filtered.map(m => <ModelCard key={m.id} model={m} navigate={navigate} />)}
            </div>
          )}
        </div>

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
