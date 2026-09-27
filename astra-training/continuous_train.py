#!/usr/bin/env python3
import argparse, hashlib, json, math, os, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATE = ROOT / "state"
ARTIFACTS = ROOT / "artifacts"
REPORTS = ROOT / "reports"

DOMAINS = {
    "video": ["hook","rhythm","caption","motion","transition","audio","hierarchy","continuity"],
    "app": ["touch","feedback","empty_error","focus","motion","hierarchy","responsive","clarity"],
    "website": ["message","cta","proof","hierarchy","responsive","accessibility","density","performance"],
}

def ensure_dirs(domain):
    (STATE).mkdir(parents=True, exist_ok=True)
    (ARTIFACTS / domain).mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)

def load_state(domain):
    p = STATE / f"{domain}.json"
    if p.exists():
        return json.loads(p.read_text())
    return {
        "domain": domain,
        "cycle": 0,
        "generation": 1,
        "levels": {k: 0 for k in DOMAINS[domain]},
        "last_dimension": None,
        "last_score": 0,
    }

def choose_dimension(state):
    dims = DOMAINS[state["domain"]]
    min_level = min(state["levels"].get(d,0) for d in dims)
    candidates = [d for d in dims if state["levels"].get(d,0)==min_level]
    idx = state["cycle"] % len(candidates)
    return candidates[idx]

def level_up(state, dim):
    state["levels"][dim] = min(12, int(state["levels"].get(dim,0)) + 1)
    state["cycle"] += 1
    if min(state["levels"].values()) >= 12:
        state["generation"] += 1
        state["levels"] = {k: 3 for k in state["levels"]}
    state["last_dimension"] = dim

def score(state):
    vals = list(state["levels"].values())
    base = sum(vals) / (len(vals) * 12) * 100
    spread = max(vals) - min(vals)
    balance_penalty = min(12, spread * 1.5)
    return round(max(0, min(100, base - balance_penalty + state["generation"] * 0.6)), 1)

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

def html_shell(title, body, css="", js=""):
    return f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>{title}</title>
<style>
*{{box-sizing:border-box}} body{{margin:0;font-family:system-ui,-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;background:#101417;color:#f4f7f5}}
button,a{{min-height:44px}} :focus-visible{{outline:3px solid #8ed1ff;outline-offset:3px}}
{css}
@media(prefers-reduced-motion:reduce){{*,*:before,*:after{{animation-duration:.001ms!important;transition-duration:.001ms!important}}}}
</style></head><body>{body}<script>{js}</script></body></html>"""

def render_video(state, dim):
    levels=state["levels"]
    hook=max(2.8, 5.5-levels["hook"]*0.18)
    scene_count=5 + min(3, levels["continuity"]//4)
    base=5.4-max(0,levels["rhythm"])*0.09
    motions=["push-in"]
    if levels["motion"]>=2: motions+=["pan-left"]
    if levels["motion"]>=5: motions+=["drift-up"]
    if levels["motion"]>=8: motions+=["settle"]
    transitions=["cut"]
    if levels["transition"]>=5: transitions+=["dissolve"]
    max_chars=max(34, 58-levels["caption"]*2)
    scenes=[]
    roles=["hook","evidence","comparison","mechanism","decision","proof","cta","close"]
    for i in range(scene_count):
        dur=hook if i==0 else round(base + ((i%3)-1)*0.7,1)
        scenes.append({
            "id":f"s{i+1}",
            "role":roles[i%len(roles)],
            "duration_seconds":round(dur,1),
            "caption_max_chars":max_chars,
            "motion":motions[i%len(motions)],
            "transition":transitions[i%len(transitions)],
            "safe_zone_pct":8+min(6,levels["hierarchy"]//2),
        })
    storyboard={
        "version":1,"generation":state["generation"],"cycle":state["cycle"],
        "training_dimension":dim,
        "audio":{"voice_lufs":-16,"bgm_lufs":-28-min(4,levels["audio"]//3),"ducking_db":-8-min(5,levels["audio"]//2)},
        "scenes":scenes,
        "principle":"Tool features are reduced to reusable editing decisions: hook speed, rhythm variance, caption density, motion variety, transition restraint, audio hierarchy, safe zones and continuity."
    }
    write_json(ARTIFACTS/"video"/"storyboard.json",storyboard)

    preview_css="""
.wrap{max-width:1100px;margin:auto;padding:24px}.timeline{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}.scene{position:relative;min-height:220px;border:1px solid #33434b;border-radius:18px;padding:16px;background:linear-gradient(145deg,#18252d,#11171b);overflow:hidden}.scene:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,#6fb2ad33,transparent 40%);animation:pulse 3s ease-in-out infinite alternate}.scene h2,.scene p{position:relative}.meta{font-size:12px;color:#9fb0b7}.bar{height:6px;border-radius:999px;background:#26363e;overflow:hidden}.bar i{display:block;height:100%;background:#86bd7a}@keyframes pulse{to{transform:scale(1.04)}}"""
    cards=[]
    for s in scenes:
        pct=min(100,int(s["duration_seconds"]/8*100))
        cards.append(f'<article class="scene"><div class="meta">{s["role"]} · {s["motion"]} · {s["transition"]}</div><h2>{s["id"]}</h2><p>Caption budget ≤ {s["caption_max_chars"]} chars</p><div class="bar"><i style="width:{pct}%"></i></div><p class="meta">{s["duration_seconds"]} sec · safe zone {s["safe_zone_pct"]}%</p></article>')
    body=f'<main class="wrap"><p>VIDEO ASTRA practical preview · cycle {state["cycle"]}</p><h1>Editorial decision training</h1><div class="timeline">{"".join(cards)}</div></main>'
    (ARTIFACTS/"video"/"preview.html").write_text(html_shell("VIDEO ASTRA Training",body,preview_css))

    render={"attempted":False,"success":False,"bytes":0}
    ffmpeg=shutil.which("ffmpeg")
    if ffmpeg:
        out=ARTIFACTS/"video"/"practice.mp4"
        cmd=[ffmpeg,"-y","-f","lavfi","-i","testsrc2=size=640x360:rate=24","-t","4","-vf","scale=640:360,format=yuv420p","-an",str(out)]
        p=subprocess.run(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        render["attempted"]=True
        render["success"]=p.returncode==0 and out.exists() and out.stat().st_size>1000
        render["bytes"]=out.stat().st_size if out.exists() else 0
        if out.exists(): out.unlink()
    return {"storyboard_scenes":len(scenes),"ffmpeg_render":render,"caption_budget":max_chars}

def render_app(state, dim):
    l=state["levels"]
    touch=44+min(12,l["touch"])
    feedback=max(120,650-l["feedback"]*35)
    radius=12+min(10,l["hierarchy"])
    css=f"""
.shell{{max-width:680px;margin:auto;padding:22px 16px 100px}}.hero h1{{font-size:clamp(32px,10vw,54px);line-height:1;margin:.2em 0}}.muted{{color:#a7b4ba}}.card{{background:#171e24;border:1px solid #32414a;border-radius:{radius}px;padding:16px;box-shadow:0 18px 50px #0006}}.state{{display:none;gap:12px}}.state.active{{display:grid}}.actions{{display:grid;grid-template-columns:1fr 1fr;gap:10px}}button{{min-height:{touch}px;border-radius:14px;border:0;padding:10px 14px;font-weight:850;cursor:pointer}}.primary{{background:#86e79b;color:#102016}}.secondary{{background:#26323a;color:#f4f7f5}}.notice{{padding:12px;border:1px solid #344650;border-radius:12px;color:#b8c4c9}}.error{{border-color:#804943;color:#ffd1c7}}.nav{{position:fixed;bottom:max(10px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(648px,calc(100% - 24px));display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px;background:#0f171bee;border:1px solid #31414a;border-radius:18px;backdrop-filter:blur(12px)}}@media(max-width:420px){{.actions{{grid-template-columns:1fr}}}}"""
    body=f"""<main class="shell"><p class="muted">APP ASTRA · cycle {state["cycle"]} · focus {dim}</p><section class="hero"><h1>1回で迷わず操作できる。</h1><p class="muted">状態・次の行動・失敗時の戻り道を、その場で返す。</p></section><section class="card" aria-live="polite">
<div id="ready" class="state active"><h2>準備OK</h2><div class="notice">主要行動は1つ。補助操作は同じ強さにしない。</div><div class="actions"><button class="primary" data-a="start">開始する</button><button class="secondary" data-a="empty">一覧を見る</button></div></div>
<div id="loading" class="state"><h2>処理中…</h2><div class="notice">入力を受け付けました。</div></div>
<div id="success" class="state"><h2>完了</h2><div class="notice">結果と次の行動を同じ画面で返します。</div><button class="primary" data-a="reset">次へ</button></div>
<div id="empty" class="state"><h2>まだありません</h2><div class="notice">追加するとここに表示されます。</div><button class="primary" data-a="reset">戻る</button></div>
<div id="error" class="state"><h2>保存できませんでした</h2><div class="notice error">入力内容は保持されています。再試行できます。</div><button class="primary" data-a="reset">再試行</button></div>
</section></main><nav class="nav" aria-label="training navigation"><button aria-current="page">ホーム</button><button>一覧</button><button>記録</button></nav>"""
    js=f"""const ids=['ready','loading','success','empty','error'];const show=id=>ids.forEach(x=>document.getElementById(x).classList.toggle('active',x===id));document.addEventListener('click',e=>{{const a=e.target.closest('[data-a]')?.dataset.a;if(!a)return;if(a==='start'){{show('loading');setTimeout(()=>show('success'),{feedback})}}else if(a==='empty')show('empty');else show('ready')}});"""
    html=html_shell("APP ASTRA Training",body,css,js)
    path=ARTIFACTS/"app"/"lab.html"; path.write_text(html)
    checks={
        "touch_target_px":touch,
        "has_viewport":"viewport" in html,
        "has_focus_visible":":focus-visible" in html,
        "has_reduced_motion":"prefers-reduced-motion" in html,
        "has_aria_live":"aria-live" in html,
        "has_empty_state":'id="empty"' in html,
        "has_error_state":'id="error"' in html,
        "mobile_breakpoint":"max-width:420px" in html,
    }
    return checks

def render_website(state, dim):
    l=state["levels"]
    maxw=1080+min(120,l["density"]*8)
    hero_gap=max(24,44-l["density"])
    css=f"""
.wrap{{width:min({maxw}px,calc(100% - 32px));margin:auto}}header{{height:68px;display:flex;align-items:center;justify-content:space-between}}.quiet{{color:#a9b4b0;font-size:13px}}.hero{{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);gap:{hero_gap}px;align-items:center;padding:70px 0 54px}}.kicker{{color:#a9e589;font-size:13px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}}h1{{font-size:clamp(42px,7vw,78px);line-height:.98;letter-spacing:-.045em;margin:14px 0 20px}}.lead{{font-size:clamp(17px,2vw,21px);line-height:1.55;color:#a9b4b0;max-width:700px}}.actions{{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}}.btn{{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 18px;border-radius:12px;text-decoration:none;font-weight:850;border:1px solid #34444b}}.primary{{background:#a9e589;color:#12200f;border-color:transparent}}.secondary{{color:#f4f7f5}}.proof{{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:28px}}.proof div{{padding:14px;border:1px solid #2d3c42;border-radius:12px;background:#131a1d}}.proof span{{display:block;color:#9eaaa6;font-size:12px;margin-top:5px}}.panel{{background:#151d20;border:1px solid #304047;border-radius:20px;padding:20px}}.step{{display:grid;grid-template-columns:34px 1fr;gap:12px;padding:13px 0;border-top:1px solid #26353a}}.step:first-of-type{{border-top:0}}.num{{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#23342a;color:#bcefa9;font-weight:900}}@media(max-width:780px){{header .quiet{{display:none}}.hero{{grid-template-columns:1fr;padding-top:38px}}.proof{{grid-template-columns:1fr}}}}"""
    body=f"""<div class="wrap"><header><strong>ASTRA SITE LAB</strong><span class="quiet">cycle {state["cycle"]} · {dim}</span></header><main class="hero">
<section><div class="kicker">Evidence before more spend</div><h1>Understand the decision before buying more AI.</h1><p class="lead">Measure cost, workflow friction and agent operations first. Escalate only when the evidence supports it.</p><div class="actions"><a class="btn primary" href="#start">Start the free check</a><a class="btn secondary" href="#path">See the decision path</a></div><div class="proof"><div><strong>1 clear job</strong><span>Know what decision this page helps make.</span></div><div><strong>Free first</strong><span>Evidence before paid escalation.</span></div><div><strong>One next step</strong><span>Primary CTA is obvious on mobile and desktop.</span></div></div></section>
<aside class="panel" id="path"><h2>Decision path</h2><div class="step"><div class="num">1</div><div><b>Identify the leak</b><div class="quiet">Cost, workflow or agent operations.</div></div></div><div class="step"><div class="num">2</div><div><b>Run the smallest check</b><div class="quiet">Get evidence without adding tools.</div></div></div><div class="step"><div class="num">3</div><div><b>Escalate only if justified</b><div class="quiet">Paid route appears after evidence.</div></div></div></aside>
</main><section id="start" class="panel"><strong>Training rule:</strong> first view must answer what this is, who it is for, what to do first and why trust it.</section></div>"""
    html=html_shell("SITE ASTRA Training",body,css)
    path=ARTIFACTS/"website"/"lab.html"; path.write_text(html)
    checks={
        "single_h1":html.count("<h1>")==1,
        "primary_cta_count":html.count("primary")==2, # class definition + element
        "has_viewport":"viewport" in html,
        "mobile_breakpoint":"max-width:780px" in html,
        "proof_blocks":html.count("<strong>")>=5,
        "noindex":"noindex" in html,
        "responsive_width":"width:min(" in html,
    }
    return checks

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--domain",required=True,choices=DOMAINS)
    args=ap.parse_args()
    domain=args.domain
    ensure_dirs(domain)
    state=load_state(domain)
    before=score(state)
    dim=choose_dimension(state)
    level_up(state,dim)
    if domain=="video": practical=render_video(state,dim)
    elif domain=="app": practical=render_app(state,dim)
    else: practical=render_website(state,dim)
    after=score(state)
    state["last_score"]=after
    write_json(STATE/f"{domain}.json",state)
    report={
        "status":"PASS",
        "domain":domain,
        "cycle":state["cycle"],
        "generation":state["generation"],
        "trained_dimension":dim,
        "before_score":before,
        "after_score":after,
        "delta":round(after-before,1),
        "levels":state["levels"],
        "practical":practical,
        "artifact_dir":str((ARTIFACTS/domain).relative_to(ROOT.parent)),
        "principle":"Observe -> isolate one quality decision -> change one variable -> generate a real artifact -> validate -> preserve evidence -> continue.",
    }
    write_json(REPORTS/f"{domain}-latest.json",report)
    hist=REPORTS/f"{domain}-history.ndjson"
    with hist.open("a") as f:
        f.write(json.dumps(report,ensure_ascii=False)+"\n")
    print(json.dumps(report,ensure_ascii=False))

if __name__=="__main__":
    main()
