import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { G } from "../styles/tokens";
import chartImg from "../assets/newplot3.png";

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const TICKERS = [
  { label:"S&P 500",   value:"+1.24%", up:true  },
  { label:"NVDA",      value:"+3.87%", up:true  },
  { label:"BTC",       value:"+2.41%", up:true  },
  { label:"EUR/USD",   value:"-0.18%", up:false },
  { label:"Gold",      value:"+0.63%", up:true  },
  { label:"10Y UST",   value:"4.32%",  neutral:true },
  { label:"VIX",       value:"18.4",   neutral:true },
  { label:"TSLA",      value:"-1.92%", up:false },
  { label:"AAPL",      value:"+0.74%", up:true  },
  { label:"Crude Oil", value:"-0.55%", up:false },
];

const FEATURES = [
  {
    num:"01", title:"Market Heatmaps",
    body:"See every asset class at a glance. Stocks, FX, crypto, commodities, bonds — color-coded by performance across any timeframe.",
  },
  {
    num:"02", title:"Quantitative Models",
    body:"Multi-factor scoring, GARCH volatility, Monte Carlo simulation, momentum regimes. One click. No code. No Excel.",
  },
  {
    num:"03", title:"Fundamental Analysis",
    body:"Historical P/E analysis, DCF valuation, and earnings multiples — the same frameworks used on equity research desks.",
  },
];

// ── TICKER STRIP ──────────────────────────────────────────────────────────
function TickerStrip() {
  const items = [...TICKERS, ...TICKERS, ...TICKERS];
  return (
    <div style={{
      background: G.bgDark,
      borderBottom: `1px solid ${G.borderDk}`,
      height: 34, overflow:"hidden",
      display:"flex", alignItems:"center",
    }}>
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .ticker-track {
          display:flex; gap:48px;
          animation: ticker 40s linear infinite;
          white-space:nowrap; padding: 0 24px;
        }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="ticker-track">
        {items.map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:10, color:G.textInv3, fontFamily:"'DM Mono',monospace", letterSpacing:"0.3px" }}>
              {item.label}
            </span>
            <span style={{
              fontSize:10, fontFamily:"'DM Mono',monospace",
              color: item.neutral ? G.textInv3 : item.up ? G.green : G.red,
            }}>
              {!item.neutral && (item.up ? "▲" : "▼")} {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────
function Nav({ navigate }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav style={{
      position:"sticky", top:0, zIndex:100,
      height:56, display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 40px",
      background: G.bg,
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: `1px solid ${scrolled ? G.border : "transparent"}`,
      transition:"all .3s",
    }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:6, cursor:"pointer" }}
        onClick={() => navigate("/")}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:900, color:G.text, letterSpacing:"-0.5px" }}>
          Signum
        </span>
        <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:G.text3, letterSpacing:"2px", textTransform:"uppercase" }}>
          Analytics
        </span>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:32 }}>
        {[["Markets","/markets"],["Models","/models"]].map(([label, path]) => (
          <button key={label} onClick={() => navigate(path)}
            style={{
              background:"none", border:"none", cursor:"pointer",
              fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:500,
              color:G.text2, transition:"color .15s", padding:0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = G.text}
            onMouseLeave={e => e.currentTarget.style.color = G.text2}
          >{label}</button>
        ))}
        <button onClick={() => navigate("/markets")}
          style={{
            background:G.bgDark, color:G.textInv,
            border:"none", cursor:"pointer",
            fontSize:12, fontFamily:"'DM Sans',sans-serif", fontWeight:500,
            padding:"8px 20px", borderRadius:4, transition:"opacity .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >Open App</button>
      </div>
    </nav>
  );
}

// ── LANDING ───────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"'DM Sans',sans-serif", color:G.text, overflowX:"hidden" }}>
      <style>{`
        ${FONT}
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fu1 { animation: fadeUp .65s .00s ease both; }
        .fu2 { animation: fadeUp .65s .12s ease both; }
        .fu3 { animation: fadeUp .65s .24s ease both; }
        .fu4 { animation: fadeUp .65s .38s ease both; }
        .fu5 { animation: fadeUp .65s .52s ease both; }
        .fu6 { animation: fadeUp .65s .66s ease both; }
      `}</style>

      <Nav navigate={navigate} />
      <TickerStrip />

      {/* ── HERO ── */}
      <section style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "52px 40px 0",
        textAlign: "center",
      }}>
        {/* headline */}
        <h1 className="fu1" style={{
          fontFamily:"'Playfair Display',serif",
          fontSize:"clamp(52px, 7.5vw, 92px)",
          fontWeight:900,
          lineHeight:1.04,
          letterSpacing:"1.5px",
          color:G.text,
          marginBottom:8,
        }}>
          The models your<br/>hedge fund uses.
        </h1>

        {/* italic kicker */}
        <h2 className="fu2" style={{
          fontFamily:"'Playfair Display',serif",
          fontSize:"clamp(48px, 7vw, 88px)",
          fontWeight:700,
          fontStyle:"italic",
          letterSpacing:"1px",
          color:G.text2,
          marginBottom:0,
          lineHeight:1.1,
        }}>
          Now yours.
        </h2>
      </section>

      {/* ── CHART IMAGE (full width, dark block) ── */}
      <div className="fu3" style={{
        width:"100%",
        background:G.bgDark,
        margin:"52px 0 0",
        padding:"40px 0 0",
        borderTop:`1px solid ${G.borderDk}`,
        borderBottom:`1px solid ${G.borderDk}`,
        overflow:"hidden",
      }}>
        {/* chart label */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 40px", marginBottom:24,
        }}>
          <p style={{
            fontSize:10, fontFamily:"'DM Mono',monospace",
            color:G.textInv3, letterSpacing:"2px", textTransform:"uppercase",
          }}>
            COT Three Actor Analysis — SP500 · Multi-Panel Quant Model Output
          </p>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:G.green, boxShadow:`0 0 5px ${G.green}` }} />
            <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:G.textInv3, letterSpacing:"1px", textTransform:"uppercase" }}>
              Live Market Data
            </span>
          </div>
        </div>

        <img
          src={chartImg}
          alt="Quantitative model output — COT analysis on SP500"
          style={{
            display:"block",
            width:"100%",
            maxWidth:1200,
            margin:"0 auto",
            borderRadius:"4px 4px 0 0",
          }}
        />
      </div>

      {/* ── SUB-HEADLINE + CTA ── */}
      <section style={{
        maxWidth:640,
        margin:"0 auto",
        padding:"72px 40px 80px",
        textAlign:"center",
      }}>
        <p className="fu5" style={{
          fontSize:17, color:G.text2, lineHeight:1.75,
          fontWeight:300, marginBottom:40,
        }}>
          Backtest strategies, run valuations, and analyze markets —
          without writing a single formula. The quant toolkit, built for everyone.
        </p>

        <div className="fu6" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:14 }}>
          <button
            onClick={() => navigate("/markets")}
            style={{
              background:G.bgDark, color:G.textInv,
              border:"none", cursor:"pointer",
              fontSize:14, fontFamily:"'DM Sans',sans-serif", fontWeight:600,
              padding:"15px 36px", borderRadius:4, transition:"all .2s",
              letterSpacing:"0.2px",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.18)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}
          >
            Explore Markets →
          </button>
          <button
            onClick={() => navigate("/models")}
            style={{
              background:"none", color:G.text2,
              border:`1px solid ${G.border}`, cursor:"pointer",
              fontSize:14, fontFamily:"'DM Sans',sans-serif", fontWeight:400,
              padding:"15px 28px", borderRadius:4, transition:"all .2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=G.text; e.currentTarget.style.color=G.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=G.border; e.currentTarget.style.color=G.text2; }}
          >
            View Models
          </button>
        </div>

        <p style={{
          fontSize:11, color:G.text3, marginTop:20,
          fontFamily:"'DM Mono',monospace", letterSpacing:"0.3px",
        }}>
          Free to use · No account required
        </p>
      </section>

      {/* ── DIVIDER ── */}
      <div style={{ maxWidth:1160, margin:"0 auto", padding:"0 40px" }}>
        <div style={{ height:1, background:G.border }} />
      </div>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth:1160, margin:"0 auto", padding:"80px 40px" }}>
        <div style={{ marginBottom:52 }}>
          <p style={{
            fontSize:10, fontFamily:"'DM Mono',monospace", color:G.text3,
            letterSpacing:"2px", textTransform:"uppercase", marginBottom:12,
          }}>
            What's inside
          </p>
          <h2 style={{
            fontFamily:"'Playfair Display',serif",
            fontSize:"clamp(26px, 2.8vw, 38px)",
            fontWeight:700, letterSpacing:"-0.5px", color:G.text,
          }}>
            Everything you need.<br/>Nothing you don't.
          </h2>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:2 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              padding:"36px 32px",
              background: i === 1 ? G.bgDark : G.s1,
              borderRadius: i === 0 ? "8px 0 0 8px" : i === 2 ? "0 8px 8px 0" : 0,
            }}>
              <span style={{
                fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:"1px",
                color: i === 1 ? G.textInv3 : G.text3,
              }}>{f.num}</span>
              <h3 style={{
                fontFamily:"'Playfair Display',serif",
                fontSize:21, fontWeight:700, letterSpacing:"-0.3px",
                color: i === 1 ? G.textInv : G.text,
                margin:"12px 0 12px",
              }}>{f.title}</h3>
              <p style={{
                fontSize:14, lineHeight:1.75, fontWeight:300,
                color: i === 1 ? G.textInv2 : G.text2,
              }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DARK CTA BAND ── */}
      <section style={{ background:G.bgDarker, padding:"88px 40px", textAlign:"center" }}>
        <p style={{
          fontSize:10, fontFamily:"'DM Mono',monospace",
          color:G.textInv3, letterSpacing:"2px", textTransform:"uppercase", marginBottom:20,
        }}>
          Get started
        </p>
        <h2 style={{
          fontFamily:"'Playfair Display',serif",
          fontSize:"clamp(28px, 3.2vw, 46px)",
          fontWeight:900, letterSpacing:"-0.5px",
          color:G.textInv, marginBottom:20, lineHeight:1.08,
        }}>
          Stop guessing.<br/>Start modeling.
        </h2>
        <p style={{
          fontSize:15, color:G.textInv2, fontWeight:300,
          maxWidth:380, margin:"0 auto 40px", lineHeight:1.7,
        }}>
          Free to use. No account required. Open the app and start exploring in seconds.
        </p>
        <button
          onClick={() => navigate("/markets")}
          style={{
            background:G.textInv, color:G.bgDark,
            border:"none", cursor:"pointer",
            fontSize:14, fontFamily:"'DM Sans',sans-serif", fontWeight:600,
            padding:"15px 40px", borderRadius:4, transition:"all .2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(255,255,255,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}
        >
          Explore Markets →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background:G.bgDarker, borderTop:`1px solid ${G.borderDk}`,
        padding:"24px 40px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:G.textInv3 }}>
          Signum
        </span>
        <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:G.textInv3, letterSpacing:"0.5px" }}>
          Market data via yFinance · For informational purposes only
        </span>
      </footer>
    </div>
  );
}
