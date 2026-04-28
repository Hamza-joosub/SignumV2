# CLAUDE.md

**Before starting any task, read this file and identify which doc(s) apply. Do not read all docs.**

This file is a router. Feature docs live in `.claude-context/docs/` (a symlink to an Obsidian vault — both tools can follow the same paths). Each doc is self-contained for its scope. Pick by task, not by curiosity.

---

## Hard constraints (always in effect)

These apply to every task. Violating any of them is a bug regardless of what the task asked for.

- **No price predictions or forecasts.** Not in the UI, not in AI summaries, not in any future feature. No "this means the market will…" language. Legal + reputational.
- **No buy/sell recommendations.** No trade signals, no setup scores, no ranking as investment advice. Kurtopy describes; it doesn't prescribe.
- **No user accounts, auth, payments, or PII.** This is a read-only public dashboard.
- **No emojis anywhere.** UI, AI summaries, button labels, comments. Non-negotiable. Typographic glyphs (`▲ ▼ • –`) are not emojis and are fine.
- **yFinance has real rate limits.** Never add per-request yFinance calls on a hot path. The scheduler-writes-CSV / endpoints-read-CSV pattern is the rule. `/api/instrument/{ticker}`, `/api/chart/{ticker}/...`, `/api/news/{ticker}` are the only routes that legitimately call yFinance per request — these are leaf pages, not mass traffic.
- **Dealers are not speculators.** COT dealer positioning is never presented as a directional view. This rule is load-bearing for credibility with finance-literate users.
- **`ANTHROPIC_API_KEY` in env only.** Never hardcoded, never committed. Rotate if exposed.

---

## Router — pick docs by task

| If the task is about… | Read |
|---|---|
| "How does the system fit together? What's where?" | `.claude-context/docs/ARCHITECTURE.md` |
| Any unknown acronym or jargon (AM, HF, pp, p95, coverage tier, Conc_Gross_LE_4…) | `.claude-context/docs/GLOSSARY.md` first |
| Change the **financial** COT data pipeline / compute_overview / INSTRUMENT_MAP / Claude prompt | `.claude-context/docs/COT_PIPELINE.md` |
| Add a new instrument to **financial** COT | `.claude-context/docs/COT_PIPELINE.md` (workflow section) |
| Change the **commodity** COT data pipeline / compute_commodity_overview / INSTRUMENT_MAP | `.claude-context/docs/COT_COMMODITY_PIPELINE.md` |
| Add a new instrument to **commodity** COT | `.claude-context/docs/COT_COMMODITY_PIPELINE.md` (workflow section) |
| Change the **financial** COT overview page UI | `.claude-context/docs/COT_FRONTEND.md` |
| Change the **commodity** COT overview page UI (heatmap grid) | `.claude-context/docs/COT_COMMODITY_FRONTEND.md` |
| Change the Markets treemap, the Category page, or the Instrument page | `.claude-context/docs/MARKET_HEATMAP.md` |
| Add or modify an instrument in the treemap | `.claude-context/docs/MARKET_HEATMAP.md` (weights, drill-down sections) |
| Change an API endpoint's params, response shape, or behaviour | `.claude-context/docs/API_ENDPOINTS.md` |
| Understand the model registry pattern or add a new model | `.claude-context/docs/MODELS.md` |
| Touch colours, typography, spacing, theme, or any `tokens.js` value | `.claude-context/docs/DESIGN_TOKENS.md` |
| Understand *why* something was built a specific way / rejected approaches | `.claude-context/docs/DECISIONS.md` |
| Check known bugs, cleanup tasks, roadmap | `.claude-context/docs/PENDING.md` |
| Write an LLM prompt for a new feature | `.claude-context/docs/DECISIONS.md` (LLM prompt-engineering section) + `COT_PIPELINE.md` (the existing financial prompt as reference). Note: commodity COT LLM summary is **not wired yet** — see `COT_COMMODITY_PIPELINE.md`. |
| Add caching, persistence, or a DB | `.claude-context/docs/DECISIONS.md` (file-based-cache entry) + `ARCHITECTURE.md` |
| Deploy, CI, CORS, or env vars | `.claude-context/docs/ARCHITECTURE.md` (Environment + Runbook sections) |

If a task spans multiple docs (e.g. "change the COT API response") — read them in the order: *DECISIONS (why) → feature doc (how) → API_ENDPOINTS (contract).*

---

## Dev commands

> **If the system seems broken or you're returning after a break**, read the Runbook in `.claude-context/docs/ARCHITECTURE.md` *before* debugging — it covers the common "stale CSV / scheduler didn't fire / Anthropic call failed" failure modes.

```bash
# Backend (from repo root)
conda activate quantlab
uvicorn api.main:app --reload
# → Swagger UI at http://localhost:8000/docs

# Frontend (from frontend/)
cd frontend
npm run dev
# → uses .env.local, hits backend at localhost:8000

# Force a COT refresh locally
rm cot_clean.csv && rm financials_cot_overview_*.json
rm commodity_cot_clean.csv && rm commodity_cot_overview_*.json
# Restart uvicorn; boot refresh regenerates

# Force a heatmap refresh locally
rm heatmap_data.csv
# Restart uvicorn; boot refresh regenerates
```

---

## Maintaining this doc system

The value of this memory compounds only if it stays in sync with the code. Rules:

- **Code change → update the relevant doc in the same session.** If you're unsure which doc, ask.
- **The router table must be maintained.** When you ship a new feature:
  - Add a doc for it (or fold into an existing one — see "when to split" below).
  - **Add a row to the router table above.** A stale router silently degrades — future sessions read the wrong docs or miss new ones entirely.
  - Update cross-references in related docs.
- **Keep the router under ~20 rows.** Currently 14 — good. Past ~20, scanning the table becomes its own problem. If you need a 21st row, first look for redundant or overlapping rows to consolidate.
- **Outdated memory is worse than no memory.** If a doc no longer reflects reality, fix or delete — don't leave it.
- **Each doc is self-contained for its scope.** If working on X, the X doc + cross-referenced docs should be enough. Don't make readers piece feature understanding together from five files.
- **PENDING is not a history log.** When a bug is fixed or a feature ships, remove the entry.
- **Hard constraints above apply regardless of doc content.** They're above the router for a reason — they never don't apply.

### If you ever add a historical-context / transcript seed file

Not present today. If you later drop a `HISTORY.md` or transcript-derived "why did we…" file into `.claude-context/docs/`, give it a router row like:

```
| "Why did we decide X two months ago?" / historical context / transcript search | .claude-context/docs/HISTORY.md |
```

Keep that doc separate from `DECISIONS.md` — `DECISIONS.md` is the curated "here's the rule and why", `HISTORY.md` would be the raw record that curation came from.

### When to create a new doc vs fold into existing

- **New doc when**: a feature has its own domain concepts, its own UX conventions, and enough depth to warrant 150+ lines. Example: `COT_PIPELINE` and `COT_FRONTEND` are separate because the backend methodology and the UI conventions are each substantial.
- **Fold into existing when**: the change is a variation on an existing feature, or a small addition that doesn't introduce new concepts. Example: adding a new FX pair to `INSTRUMENT_MAP` is a change *within* `COT_PIPELINE`, not a new doc.
- **Split an existing doc when**: it exceeds ~500 lines or when a section grows self-contained enough that readers asking about it don't need the rest. Record the split in `DECISIONS.md`.
- **LLM prompts**: currently captured in `COT_PIPELINE.md` (feature-specific) and `DECISIONS.md` (generalisable lessons). **When a second LLM feature ships**, extract into a standalone `LLM_PROMPTS.md` and add a router row.

### Cross-reference format

Dual format so both Claude and Obsidian can follow:

```
See [[COT_PIPELINE]] (`.claude-context/docs/COT_PIPELINE.md`) for the instrument-mapping workflow.
```

`[[backlink]]` works in Obsidian. The backticked path works for Claude Code's Read tool.

---

## Repo layout (quick map)

```
SignumV2/
├── CLAUDE.md                    ← you are here (router)
├── .claude-context/docs/*.md    ← feature docs (lazy-loaded)
│
├── api/                         ← FastAPI backend
│   ├── main.py                  ← app + lifespan + scheduler + CORS
│   ├── routes/*.py              ← HTTP layer, thin handlers
│   └── services/                ← business logic + yFinance/CFTC I/O
│       ├── ideas/               ← idea-generation tools (heatmap, instrument viewer, news)
│       ├── models/              ← registry-backed models (COT financial/commodity, ridge, …)
│       └── registry_service.py  ← exposes registry/models_registry.py to /api/models/registry
│
├── registry/
│   └── models_registry.py       ← single-source-of-truth model list
│
├── frontend/
│   └── src/
│       ├── App.jsx              ← routing table
│       ├── pages/*.jsx          ← one per route
│       ├── components/          ← shared components (NewsPanel)
│       └── styles/tokens.js     ← the G design-token object
│
├── Models/                      ← RESEARCH only, not shipped code
│   ├── Capital_Pressure/        ← COT research (archival + active .ipynb)
│   └── FX/                      ← FX research (write_up.md, notebooks)
│
├── Procfile                     ← Railway launch command
├── requirements.txt             ← Python deps (backend on Railway)
├── package.json                 ← stray root package.json (react-markdown — see PENDING)
│
├── heatmap_data.csv                        ← daily-refreshed treemap cache
├── cot_clean.csv                           ← weekly-refreshed financial COT history
├── financials_cot_overview_{13,26,52}w.json← precomputed /api/cot/overview responses
├── commodity_cot_clean.csv                 ← weekly-refreshed commodity COT history
└── commodity_cot_overview_{13,26,52}w.json ← precomputed /api/commodity_cot/overview responses
```

See `.claude-context/docs/ARCHITECTURE.md` for dataflow, deployment, scheduler, and runbook.
