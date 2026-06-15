# coach_data_layer — the data layer for the LoL AI coach

Built to do one thing well: **feed your agents pre-computed FACTS instead of an
early LLM summary.** That single change is what makes coaching specific
("64 CS at 10:00, 3 deaths in BOT_RIVER before 14:00") instead of vague
("farm better, ward more").

Everything here is **plain Python in / plain JSON out**, so it drops straight
into your existing Python + JSON-interface project. The core (timeline,
benchmarks, factpack, ddragon loader) is **stdlib-only — no installs**.

---

## The idea in one picture

```
match.json + timeline.json ──► timeline.py  ──► CS@10, gold/xp diffs vs lane,
                                                deaths-before-14, key events, objectives
Data Dragon json ───────────► ddragon.py   ──► factual grounding (champ/item/rune)
your benchmark table ───────► benchmarks.py──► "you vs expected for your rank+role"
                               factpack.py  ──► ONE FactPack JSON  ──► your agents
coaching .md docs ──────────► rag/          ──► principles matching the findings
```

The **FactPack** (validated by `schemas/fact_pack.schema.json`) is the contract
between this layer and your recap / debate / coaching agents. Hand them
`headline_findings`, `benchmarks`, `grounding`, and `coaching_context`.

---

## Quick start (runs offline, right now)

```bash
cd coach_data_layer

# A) Web UI — pick a player, pick a rank, see the FactPack rendered.
python webapp/serve.py        # then open http://localhost:8000

# B) Command-line demo.
python tools/make_samples.py          # (already generated; regenerates samples)
python examples/build_factpack_demo.py
```

The web UI lets you choose any of the 10 sample players (or paste your own
match.json + timeline.json), pick a rank, and shows the headline findings,
benchmark verdicts, a gold-diff-over-time chart, the retrieved coaching
snippets, and the full FactPack JSON your agents receive — all stdlib, no Flask.

You'll see the computed findings, the benchmark table verdicts, and the RAG
snippets — then a full `factpack.out.json` is written.

Run the tests:

```bash
pip install pytest          # optional; only needed for the test suite
python -m pytest -q
```

---

## Wiring it into your project

```python
from coachdata import factpack, ddragon, benchmarks
from coachdata.rag.store import KnowledgeBase
from coachdata.rag.ingest import ingest_dir

# 1. Optional grounding — run ddragon.fetch_ddragon once per patch on a machine
#    with internet, then load the cache (None is fine to start).
dd = ddragon.load_latest_local("./ddragon_cache")

# 2. Benchmarks — REPLACE the sample table with values from your own match data.
table = benchmarks.load_table("data/benchmarks/benchmarks.sample.json")

# 3. Optional RAG over your coaching corpus (keyword backend until you install
#    chromadb + sentence-transformers; then it auto-upgrades).
kb = KnowledgeBase()
ingest_dir(kb, "data/knowledge")

# 4. Build the FactPack for one player in one match.
pack = factpack.build_fact_pack(
    match_json, timeline_json,
    puuid="<player-puuid>", rank="DIAMOND",
    ddragon=dd, benchmark_table=table, knowledge_base=kb,
)

# pack is plain JSON — send pack["headline_findings"] / pack["benchmarks"] /
# pack["grounding"] / pack["coaching_context"] straight to your agents.
```

### Getting the raw inputs from Riot
You already collect post-game data. The one change that matters: **also pull the
timeline.** For each match id:

- `GET /lol/match/v5/matches/{matchId}`          → `match_json`
- `GET /lol/match/v5/matches/{matchId}/timeline` → `timeline_json`

The timeline is where CS@10, gold diffs, death positions, and objective timings
live. The post-game summary alone cannot give you those.

---

## What each module does

| File | Responsibility | Deps |
|------|----------------|------|
| `coachdata/timeline.py`  | Parse match+timeline → metrics, per-min series, key events | stdlib |
| `coachdata/ddragon.py`   | Fetch + load Data Dragon; champ/item/rune lookups | stdlib |
| `coachdata/benchmarks.py`| Compare metrics to a rank+role table → verdicts + findings | stdlib |
| `coachdata/factpack.py`  | Orchestrate all of the above into one FactPack | stdlib |
| `coachdata/rag/store.py` | Vector store: Chroma if installed, else keyword fallback | optional |
| `coachdata/rag/ingest.py`| Chunk coaching markdown into the store | stdlib |
| `coachdata/rag/retrieve.py`| Turn findings into queries, fetch snippets | stdlib |
| `coachdata/agents/prompts.py`| Turn a FactPack into each agent's prompt (recap / debate / conclusion) | stdlib |
| `coachdata/agents/llm.py`| Provider-neutral LLM: Claude / Ollama / offline Echo adapters | optional |
| `coachdata/agents/pipeline.py`| Orchestrate recap → debate → conclusion | stdlib |

## Agent wiring — how the FactPack feeds the agents

The `agents/` package consumes a FactPack and drives your **recap → debate
(expert vs OTP) → conclusion** flow. The key idea: **every agent reads the same
factual briefing** (rendered from the FactPack by `prompts.render_briefing`),
then gets a role-specific instruction. Each stage can use a *different* model.

```python
from coachdata.agents import pipeline
from coachdata.agents.llm import make_llm

llms = {
    "recap":      make_llm("ollama", model="qwen2.5:7b"),  # cheap/bulk → local
    "debate":     make_llm("ollama", model="qwen2.5:7b"),
    "conclusion": make_llm("claude"),                      # reasoning-heavy → Claude
}
result = pipeline.run_pipeline(factpack, llms=llms, debate_rounds=2)
# result = {"recap": str, "debate": [{speaker, text}...], "conclusion": str, ...}
```

- **Recap** — factual summary from the numbers only (cheap model).
- **Debate** — a Challenger-expert persona and an OTP-main persona argue
  priorities, alternating turns, each seeing the briefing + transcript so far.
- **Conclusion** — a head-coach synthesis into a prioritized plan; routed to
  Claude with adaptive thinking (the `think` flag on that prompt).

**See the exact prompts each agent receives** (offline, no API key) — the
default `EchoLLM` returns the assembled prompt instead of calling a model:

```bash
python examples/run_pipeline_demo.py        # prints every agent's prompt
python examples/run_pipeline_demo.py --live # real output (Claude + Ollama)
```

The web UI's **"Show agent prompts"** button renders the same thing in the browser.

Optional upgrades: `pip install chromadb sentence-transformers jsonschema`
(see `requirements-optional.txt`).

---

## The two things only YOU can make accurate

This scaffold is correct mechanically, but two inputs decide how good the
coaching actually is:

1. **`data/benchmarks/benchmarks.sample.json` is placeholder numbers.** Replace
   them with means/percentiles you aggregate from your own collected matches,
   per rank+role. This is the single biggest accuracy lever.
2. **`data/knowledge/` has two starter docs.** Grow this into your real coaching
   corpus (role guides, matchup notes, macro principles) with front-matter
   `role:` / `topic:` / `champion:` so retrieval can filter.

Add metrics by extending the benchmark table **and** the `_METRIC_SOURCE` map in
`benchmarks.py`. New timeline metrics go in `timeline._snapshot_metrics`.
