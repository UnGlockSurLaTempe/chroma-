"""
serve.py — a tiny zero-dependency web UI to try the data layer.

    cd coach_data_layer
    python webapp/serve.py
    # then open http://localhost:8000

Pick a player from the bundled sample match (or paste your own match.json +
timeline.json), choose a rank, and it builds a FactPack and renders the findings,
benchmarks, a gold-diff chart, and the retrieved coaching snippets.

Pure stdlib (http.server). No Flask, no installs.
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from coachdata import factpack, benchmarks, ddragon          # noqa: E402
from coachdata.rag.store import KnowledgeBase                 # noqa: E402
from coachdata.rag.ingest import ingest_dir                   # noqa: E402

# Build the optional pieces once at startup.
TABLE = benchmarks.load_table(os.path.join(ROOT, "data/benchmarks/benchmarks.sample.json"))
DD = ddragon.load_latest_local(os.path.join(ROOT, "ddragon_cache"))  # None unless cached
KB = KnowledgeBase()
ingest_dir(KB, os.path.join(ROOT, "data/knowledge"))

RANKS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER"]


def _load_sample():
    def L(p):
        with open(os.path.join(ROOT, p)) as f:
            return json.load(f)
    return L("data/samples/match.sample.json"), L("data/samples/timeline.sample.json")


def _participants(match):
    return [{"puuid": p["puuid"], "champion": p.get("championName"),
             "role": p.get("teamPosition")} for p in match["info"]["participants"]]


INDEX_HTML = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LoL Coach — Data Layer</title>
<style>
:root{--bg:#0e1116;--panel:#161b22;--line:#222b36;--ink:#e6edf3;--mut:#8b98a5;
--gold:#c8aa6e;--blue:#3aa0ff;--red:#ff5f56;--amber:#f0b429;--green:#3fb950;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
header{padding:18px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:14px}
header h1{font-size:17px;margin:0;color:var(--gold);letter-spacing:.3px}
header span{color:var(--mut);font-size:13px}
main{max-width:1040px;margin:0 auto;padding:22px}
.controls{display:flex;flex-wrap:wrap;gap:12px;align-items:end;background:var(--panel);
border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:20px}
label{display:block;font-size:12px;color:var(--mut);margin-bottom:5px}
select,button{font:inherit;background:#0d1117;color:var(--ink);border:1px solid var(--line);
border-radius:8px;padding:9px 12px}
button{background:var(--gold);color:#1a1206;border:none;font-weight:600;cursor:pointer}
button.ghost{background:transparent;color:var(--mut);border:1px solid var(--line)}
button:hover{filter:brightness(1.08)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:820px){.grid{grid-template-columns:1fr}}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px}
.card h2{font-size:13px;text-transform:uppercase;letter-spacing:.6px;color:var(--mut);margin:0 0 12px}
.summary{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.summary .champ{font-size:22px;font-weight:700;color:var(--gold)}
.tag{font-size:12px;padding:3px 9px;border-radius:999px;border:1px solid var(--line);color:var(--mut)}
.tag.loss{color:var(--red);border-color:#5a2a28}.tag.win{color:var(--green);border-color:#244a30}
ul.find{list-style:none;margin:0;padding:0}
ul.find li{padding:9px 0;border-bottom:1px solid var(--line);display:flex;gap:10px}
ul.find li:last-child{border:none}
.dot{flex:0 0 8px;height:8px;border-radius:50%;margin-top:8px}
table{width:100%;border-collapse:collapse;font-size:14px}
td,th{text-align:left;padding:7px 6px;border-bottom:1px solid var(--line)}
th{color:var(--mut);font-weight:500;font-size:12px}
.v-weak{color:var(--red)}.v-below{color:var(--amber)}.v-on_track{color:var(--mut)}.v-strength{color:var(--green)}
.metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;font-size:14px}
.metrics div{display:flex;justify-content:space-between;border-bottom:1px dotted var(--line);padding:5px 0}
.metrics span{color:var(--mut)}
.snip{font-size:13px;color:#c6d0da;border-left:2px solid var(--gold);padding:4px 0 4px 12px;margin:10px 0}
.snip small{color:var(--mut)}
.full{margin-top:20px}
details summary{cursor:pointer;color:var(--mut);font-size:13px}
pre{background:#0d1117;border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto;font-size:12px;max-height:380px}
.muted{color:var(--mut);font-size:12px}
.adv textarea{width:100%;height:90px;background:#0d1117;color:var(--ink);border:1px solid var(--line);border-radius:8px;font:12px monospace;padding:8px;margin-top:6px}
</style></head>
<body>
<header><h1>LoL Coach · Data Layer</h1><span>FactPack preview — pre-computed facts, not an LLM summary</span></header>
<main>
  <div class="controls">
    <div><label>Player</label><select id="player"></select></div>
    <div><label>Rank context</label><select id="rank"></select></div>
    <div><button id="run">Build FactPack ▶</button></div>
    <div><button class="ghost" id="toggleAdv">Paste own data</button></div>
  </div>
  <div class="adv" id="adv" style="display:none">
    <div class="grid">
      <div><label>match.json</label><textarea id="matchJson" placeholder="paste Riot match-v5 match JSON"></textarea></div>
      <div><label>timeline.json</label><textarea id="timelineJson" placeholder="paste Riot match-v5 timeline JSON"></textarea></div>
    </div>
    <p class="muted">Leave empty to use the bundled sample. Player dropdown above is read from the sample.</p>
  </div>

  <div id="out"></div>
</main>
<script>
const $ = s => document.querySelector(s);
let SAMPLE_PARTS = [];

async function init(){
  const r = await fetch('/api/init').then(r=>r.json());
  SAMPLE_PARTS = r.participants;
  $('#player').innerHTML = r.participants.map(p=>
    `<option value="${p.puuid}">${p.champion} · ${p.role}</option>`).join('');
  $('#rank').innerHTML = r.ranks.map(x=>`<option ${x==='DIAMOND'?'selected':''}>${x}</option>`).join('');
}
$('#toggleAdv').onclick = ()=>{const a=$('#adv');a.style.display=a.style.display==='none'?'block':'none';};

function dotColor(v){return {weak:'var(--red)',below:'var(--amber)',on_track:'var(--mut)',strength:'var(--green)'}[v]||'var(--mut)';}

function chart(series){
  const m=series.minute, g=series.gold_diff.map(x=>x==null?0:x);
  if(!m.length) return '';
  const W=460,H=160,pad=28;
  const xs=i=>pad+(W-2*pad)*i/(m.length-1);
  const max=Math.max(100,...g.map(Math.abs));
  const ys=v=>H/2 - (v/max)*(H/2-pad);
  const pts=g.map((v,i)=>`${xs(i)},${ys(v)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">
    <line x1="${pad}" y1="${ys(0)}" x2="${W-pad}" y2="${ys(0)}" stroke="#2a3440"/>
    <polyline points="${pts}" fill="none" stroke="var(--blue)" stroke-width="2"/>
    <text x="${pad}" y="14" fill="#8b98a5" font-size="11">gold diff vs lane (+ ahead / − behind)</text>
    <text x="${pad}" y="${H-6}" fill="#8b98a5" font-size="11">0'</text>
    <text x="${W-pad-12}" y="${H-6}" fill="#8b98a5" font-size="11">${m[m.length-1]}'</text>
  </svg>`;
}

function render(p){
  const pl=p.player, mt=p.match, opp=(pl.lane_opponent||{}).champion||'?';
  const findings=(p.headline_findings||[]).map(f=>
    `<li><span class="dot" style="background:var(--gold)"></span>${f}</li>`).join('');
  const benchRows=(p.benchmarks||[]).map(b=>`<tr>
    <td>${b.label}</td><td>${b.value}</td><td class="muted">${b.expected}</td>
    <td class="v-${b.verdict}">${b.verdict}</td></tr>`).join('');
  const tm=p.timeline_metrics, pick=['cs_at_10','cs_diff_at_10','gold_diff_at_10','gold_diff_at_15','deaths_before_14','first_legendary_item_min','objective_participation','level_at_14'];
  const metrics=pick.map(k=>`<div><span>${k}</span><b>${tm[k]??'—'}</b></div>`).join('');
  const snips=(p.coaching_context||[]).map(c=>
    `<div class="snip">${(c.text||'').split('\n')[0].slice(0,160)}…<br><small>${(c.metadata||{}).source||''} · score ${c.score??''}</small></div>`).join('')||'<p class="muted">No snippets (add docs to data/knowledge/).</p>';

  $('#out').innerHTML = `
    <div class="summary">
      <span class="champ">${pl.champion}</span>
      <span class="tag">${pl.role}</span>
      <span class="tag">${pl.rank_context}</span>
      <span class="tag">vs ${opp}</span>
      <span class="tag ${mt.win?'win':'loss'}">${mt.win?'WIN':'LOSS'}</span>
      <span class="tag">patch ${mt.patch}</span>
      <span class="tag">${Math.round(mt.duration_s/60)} min</span>
    </div>
    <div class="grid">
      <div class="card"><h2>Headline findings (computed, not AI)</h2><ul class="find">${findings}</ul></div>
      <div class="card"><h2>Gold diff over time</h2>${chart(p.series||{minute:[],gold_diff:[]})}</div>
      <div class="card"><h2>Benchmarks · ${pl.rank_context} ${pl.role}</h2>
        <table><tr><th>Metric</th><th>You</th><th>Exp</th><th>Verdict</th></tr>${benchRows}</table></div>
      <div class="card"><h2>Key timeline metrics</h2><div class="metrics">${metrics}</div></div>
      <div class="card" style="grid-column:1/-1"><h2>Retrieved coaching context (RAG)</h2>${snips}</div>
    </div>
    <div class="full"><details><summary>Full FactPack JSON (this is what your agents receive)</summary>
      <pre>${JSON.stringify(p,null,2)}</pre></details></div>`;
}

$('#run').onclick = async ()=>{
  $('#out').innerHTML='<p class="muted">Building…</p>';
  const body={puuid:$('#player').value, rank:$('#rank').value};
  const mj=$('#matchJson').value.trim(), tj=$('#timelineJson').value.trim();
  try{ if(mj) body.match=JSON.parse(mj); if(tj) body.timeline=JSON.parse(tj); }
  catch(e){ $('#out').innerHTML='<p class="v-weak">Invalid JSON in pasted data: '+e.message+'</p>'; return; }
  const res=await fetch('/api/factpack',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const data=await res.json();
  if(data.error){ $('#out').innerHTML='<p class="v-weak">'+data.error+'</p>'; return; }
  render(data);
};

init().then(()=>$('#run').click());
</script>
</body></html>"""


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):  # quieter console
        pass

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            return self._send(200, INDEX_HTML, "text/html; charset=utf-8")
        if self.path == "/api/init":
            match, _ = _load_sample()
            return self._send(200, json.dumps({
                "participants": _participants(match),
                "ranks": RANKS,
                "ddragon_loaded": DD is not None,
                "rag_backend": KB.backend_name,
            }))
        return self._send(404, json.dumps({"error": "not found"}))

    def do_POST(self):
        if self.path != "/api/factpack":
            return self._send(404, json.dumps({"error": "not found"}))
        try:
            length = int(self.headers.get("Content-Length", 0))
            req = json.loads(self.rfile.read(length) or b"{}")
            sample_match, sample_tl = _load_sample()
            match = req.get("match") or sample_match
            timeline = req.get("timeline") or sample_tl
            puuid = req.get("puuid") or _participants(sample_match)[0]["puuid"]
            rank = req.get("rank") or "DIAMOND"
            pack = factpack.build_fact_pack(
                match, timeline, puuid=puuid, rank=rank,
                ddragon=DD, benchmark_table=TABLE, knowledge_base=KB)
            return self._send(200, json.dumps(pack))
        except Exception as e:  # surface errors to the UI
            return self._send(200, json.dumps({"error": f"{type(e).__name__}: {e}"}))


def main(port=8000):
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"LoL Coach data-layer UI  →  http://localhost:{port}")
    print(f"  RAG backend: {KB.backend_name} | Data Dragon: {'loaded' if DD else 'not cached (grounding off)'}")
    print("  Ctrl+C to stop.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 8000)
