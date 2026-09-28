import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import { useSession, signIn, signOut } from "next-auth/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ─── Language colors (GitHub official) ───────────────────────────────────── */
const LANG = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Java: "#b07219",
  "C++": "#f34b7d", Rust: "#dea584", Go: "#00ADD8", Ruby: "#701516", Swift: "#f05138",
  Kotlin: "#A97BFF", CSS: "#563d7c", HTML: "#e34c26", Shell: "#89e051", PHP: "#4F5D95",
  C: "#555555", "C#": "#178600", Dart: "#00B4AB", Vue: "#41b883", Svelte: "#ff3e00",
};
const lc = (l) => LANG[l] || "#555";
const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n ?? 0));
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const BOOT_LINES = [
  { text: "> initializing devstats...",        delay: 0,    green: false },
  { text: "> connecting to proxy server...",   delay: 300,  green: false },
  { text: "> proxy authenticated",             delay: 600,  green: true  },
  { text: "> fetching user profile...",        delay: 900,  green: false },
  { text: "> resolving repositories...",       delay: 1200, green: false },
  { text: "> computing language breakdown...", delay: 1500, green: false },
  { text: "> building heatmap...",             delay: 1800, green: false },
  { text: "> done.",                           delay: 2100, green: true  },
];

/* ─── Hooks ────────────────────────────────────────────────────────────────── */
function useReducedMotion() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setV(mq.matches);
    const h = (e) => setV(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return v;
}

function useCountUp(target, duration, reduced) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduced || !target) { setV(target); return; }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, reduced]);
  return v;
}

/* ─── Virtual grid ─────────────────────────────────────────────────────────── */
const ROW_H = 130, ROW_GAP = 8;

function useVirtualGrid(items, ref) {
  const [top, setTop]   = useState(0);
  const [h, setH]       = useState(600);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setTop(el.scrollTop);
    const calc = () => {
      setH(el.clientHeight);
      setCols(Math.max(1, Math.floor((el.clientWidth + ROW_GAP) / (230 + ROW_GAP))));
    };
    calc();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", onScroll); ro.disconnect(); };
  }, [ref]);

  const rowH = ROW_H + ROW_GAP;
  const rows = Math.ceil(items.length / cols);
  const totalH = rows * rowH;
  const startRow = Math.max(0, Math.floor(top / rowH) - 2);
  const endRow = Math.min(rows, startRow + Math.ceil(h / rowH) + 4);
  const visible = [];
  for (let r = startRow; r < endRow; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i < items.length) visible.push({ item: items[i], r, c });
    }
  return { totalH, visible, cols };
}

/* ─── CSS ──────────────────────────────────────────────────────────────────── */
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
*{cursor:none!important}

:root{
  --bg:#0a0a0a;--bg2:#111;--bg3:#161616;
  --border:#1e1e1e;--border2:#2a2a2a;
  --text:#e8e8e8;--muted:#767676;--muted2:#a0a0a0;
  --green:#00ff41;--cyan:#00d4ff;--red:#ff5f57;--yellow:#febc2e;
  --mono:'JetBrains Mono',monospace;
  --eoc:cubic-bezier(0.33,1,0.68,1);
  --esp:cubic-bezier(0.34,1.56,0.64,1);
}

body{background:var(--bg)}

@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}
}

.app{
  min-height:100vh;background:var(--bg);
  background-image:radial-gradient(circle,#1f1f1f 1px,transparent 1px);
  background-size:28px 28px;
  color:var(--text);font-family:var(--mono);font-size:13px;line-height:1.6;
  overflow-x:hidden;
}

/* cursor */
.cur-dot{position:fixed;top:0;left:0;width:4px;height:4px;background:var(--green);
  border-radius:50%;pointer-events:none;z-index:99999;transform:translate(-50%,-50%);
  box-shadow:0 0 6px var(--green)}
.cur-ring{position:fixed;top:0;left:0;width:24px;height:24px;
  border:1px solid rgba(0,255,65,.4);border-radius:50%;pointer-events:none;z-index:99998;
  transform:translate(-50%,-50%);transition:width 180ms var(--eoc),height 180ms var(--eoc),border-color 180ms ease}
.cur-ring.h{width:36px;height:36px;border-color:rgba(0,212,255,.6)}
.cur-ring.c{width:16px;height:16px;border-color:var(--green)}

@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.blink{animation:blink 1.1s step-end infinite;color:var(--green)}

/* terminal hero */
.shell{max-width:680px;margin:0 auto;padding:72px 24px 0}
.win{background:var(--bg2);border:1px solid var(--border2);border-radius:10px;
  overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6)}
.titlebar{display:flex;align-items:center;gap:8px;background:var(--bg3);
  border-bottom:1px solid var(--border);padding:10px 14px}
.tl{width:12px;height:12px;border-radius:50%}
.tl.r{background:var(--red)}.tl.y{background:var(--yellow)}.tl.g{background:#28ca41}
.tbpath{flex:1;text-align:center;color:var(--muted2);font-size:11px}
.body{padding:20px 22px 24px}
.prompt-line{font-size:13px;color:var(--muted);margin-bottom:18px}
.prompt-line .g{color:var(--green)}
.hd{font-size:clamp(22px,5vw,36px);font-weight:700;letter-spacing:-.02em;margin-bottom:6px;line-height:1.1}
.sub{color:var(--muted2);font-size:12px;margin-bottom:28px}
.prow{display:flex;align-items:center;background:var(--bg);border:1px solid var(--border2);
  border-radius:5px;padding:12px 16px;transition:border-color 180ms ease,box-shadow 180ms ease}
.prow:focus-within{border-color:var(--green);box-shadow:0 0 0 2px rgba(0,255,65,.08)}
.pdollar{color:var(--green);margin-right:10px;user-select:none}
.pprefix{color:var(--muted2);margin-right:6px;user-select:none;white-space:nowrap}
.pinput{flex:1;background:none;border:none;outline:none;color:var(--text);
  font-family:var(--mono);font-size:14px;caret-color:var(--green);min-width:0}
.pinput::placeholder{color:var(--muted)}
.run{background:none;border:1px solid var(--border2);border-radius:4px;padding:5px 14px;
  color:var(--green);font-family:var(--mono);font-size:12px;cursor:pointer;white-space:nowrap;
  transition:background 150ms ease,border-color 150ms ease,transform 120ms var(--esp);
  flex-shrink:0;margin-left:10px}
.run:hover:not(:disabled){background:rgba(0,255,65,.08);border-color:var(--green);transform:scale(1.04)}
.run:active:not(:disabled){transform:scale(.96)}
.run:disabled{opacity:.35;cursor:not-allowed}
.input-err{font-size:11px;color:var(--red);margin-top:6px}
.auth-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;font-size:11px}

/* boot */
.boot-wrap{max-width:680px;margin:0 auto;padding:40px 24px}
.boot-line{font-size:12px;line-height:2;opacity:0;transform:translateY(4px);
  transition:opacity 200ms ease,transform 200ms var(--eoc)}
.boot-line.vis{opacity:1;transform:translateY(0)}
.boot-cursor{display:inline-block;width:7px;height:13px;background:var(--green);
  vertical-align:middle;margin-left:2px;animation:blink 1.1s step-end infinite}
.boot-timer{font-size:11px;color:var(--muted);margin-top:10px}

/* empty */
.empty{text-align:center;padding:80px 0}
.empty pre{font-size:12px;color:var(--muted);line-height:2}

/* error states */
.state-box{max-width:480px;margin:48px auto 0;background:var(--bg2);
  border:1px solid var(--border2);border-radius:8px;padding:32px 28px;text-align:center}
.state-box.s404{border-color:rgba(0,212,255,.25)}
.state-box.serr{border-color:rgba(255,95,87,.35)}
.state-code{font-size:10px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:12px}
.state-code.ec{color:var(--cyan)}.state-code.er{color:var(--red)}
.state-title{font-size:18px;font-weight:700;margin-bottom:8px}
.state-sub{font-size:12px;color:var(--muted2);line-height:1.7;margin-bottom:20px}
.retry{background:none;border:1px solid var(--border2);border-radius:4px;padding:8px 20px;
  color:var(--text);font-family:var(--mono);font-size:12px;cursor:pointer;
  transition:border-color 150ms ease,transform 120ms var(--esp)}
.retry:hover{border-color:var(--green);transform:scale(1.03)}

/* dash */
.dash{max-width:1040px;width:100%;margin:0 auto;padding:40px 24px 0;animation:fi .25s var(--eoc)}
@keyframes fi{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

.sec{font-size:10px;color:var(--muted);letter-spacing:.15em;text-transform:uppercase;
  margin-bottom:14px;display:flex;align-items:center;gap:10px}
.sec::after{content:'';flex:1;height:1px;background:var(--border)}
.sec .g{color:var(--green)}

.prof{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:32px;
  background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:24px;position:relative}
.prof::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;
  background:var(--green);border-radius:6px 0 0 6px}
.avatar{width:60px;height:60px;border-radius:4px;border:1px solid var(--border2);flex-shrink:0}
.pinfo{flex:1;min-width:0}
.pname{font-size:20px;font-weight:700;letter-spacing:-.02em;margin-bottom:2px}
.plogin{color:var(--cyan);font-size:12px;text-decoration:none}
.plogin:hover{text-decoration:underline}
.pbio{color:var(--muted2);font-size:12px;margin-top:6px;line-height:1.5}
.pmeta{display:flex;gap:14px;margin-top:8px;flex-wrap:wrap}
.pmeta span{color:var(--muted);font-size:11px}

.tabs{display:flex;gap:2px;margin-bottom:16px}
.tab{background:none;border:1px solid transparent;border-radius:4px;padding:6px 16px;
  color:var(--muted);font-family:var(--mono);font-size:12px;cursor:pointer;
  transition:color 150ms,border-color 150ms,transform 120ms var(--esp)}
.tab:hover{color:var(--text);transform:scale(1.03)}
.tab.on{background:var(--bg3);border-color:var(--border2);color:var(--green)}
.tab.on::before{content:'> '}

.panel{animation:tabIn 200ms var(--eoc) both}
@keyframes tabIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

.bento{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:10px}
.cell{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:18px 20px;
  transition:border-color 180ms ease;min-width:0}
.cell:hover{border-color:var(--border2)}
.clabel{font-size:10px;color:var(--muted);letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px}
.cval{font-size:32px;font-weight:700;line-height:1;letter-spacing:-.03em;
  font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
.cval.gn{color:var(--green)}.cval.cy{color:var(--cyan)}
/* remove fixed col spans — bento is now fully auto-fit */
.c3,.c4,.c5,.c6,.c7,.c8,.c12{grid-column:auto}

/* stagger */
.si{opacity:0;transform:translateY(10px);transition:opacity 220ms ease,transform 220ms var(--eoc)}
.si.in{opacity:1;transform:translateY(0)}

/* heatmap */
.hm-wrap{overflow-x:auto;padding-bottom:4px}
.hm-leg{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:10px;color:var(--muted)}
.hm-cells{display:flex;gap:2px}

/* stacked lang bar */
.lb-stack{height:8px;border-radius:4px;overflow:hidden;display:flex;margin-bottom:12px}
.lb-seg{height:100%;transition:width 900ms var(--eoc)}
.lb-seg:first-child{border-radius:4px 0 0 4px}.lb-seg:last-child{border-radius:0 4px 4px 4px}
.lb-legend{display:flex;flex-wrap:wrap;gap:4px 16px}
.lb-item{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted2);transition:color 150ms}
.lb-item:hover{color:var(--text)}
.lb-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.lb-pct{color:var(--muted);font-size:10px;margin-left:2px}

/* repo card */
.repo{background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:14px;
  transition:border-color 200ms ease,box-shadow 200ms ease,transform 200ms var(--esp);
  height:100%}
.repo:hover{border-color:var(--repo-color,#555);
  box-shadow:0 0 12px rgba(0,0,0,.4),0 0 0 1px var(--repo-color,#555) inset;
  transform:translateY(-2px)}
.rname{color:var(--cyan);font-size:12px;font-weight:600;text-decoration:none;
  display:block;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rname:hover{text-decoration:underline}
.rdesc{color:var(--muted);font-size:11px;line-height:1.5;margin-bottom:8px}
.rmeta{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.rlang{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted2)}
.rdot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.rstat{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.rfork{font-size:9px;color:var(--muted);border:1px solid var(--border);border-radius:3px;padding:1px 5px;margin-left:auto}
.rgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}

/* virtual scroll */
.vs-out{height:600px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border2) transparent}
.vs-out::-webkit-scrollbar{width:4px}
.vs-out::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.vs-in{position:relative;width:100%}

/* bar chart */
.tt{background:var(--bg3);border:1px solid var(--border2);border-radius:4px;
  padding:8px 12px;font-family:var(--mono);font-size:11px}
.ttl{color:var(--muted);margin-bottom:3px}
.ttv{color:var(--green)}

/* lang bars (languages tab) */
.lbw{margin-bottom:10px}
.lbh{display:flex;justify-content:space-between;margin-bottom:4px}
.lbn{font-size:12px}.lbp{font-size:12px;color:var(--muted)}
.lbt{height:4px;background:var(--border);border-radius:2px;overflow:hidden}
.lbf{height:100%;border-radius:2px;width:0;transition:width 900ms var(--eoc)}

/* private badge */
.pvt{font-size:10px;background:rgba(0,255,65,.08);color:var(--green);
  border:1px solid rgba(0,255,65,.3);border-radius:3px;padding:2px 8px}

/* footer */
.footer{
  max-width:1040px;margin:60px auto 0;padding:24px 24px 48px;
  border-top:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  flex-wrap:wrap;gap:16px;
}
.footer-credit{font-size:12px;color:var(--muted);line-height:1.8}
.footer-credit a{color:var(--muted2);text-decoration:none;transition:color 150ms}
.footer-credit a:hover{color:var(--green)}
.footer-credit .g{color:var(--green)}

/* about button in footer (not fixed) */
.about-btn{
  background:none;border:1px solid var(--border2);
  border-radius:6px;padding:8px 16px;
  color:var(--muted2);font-family:var(--mono);font-size:11px;
  cursor:pointer;transition:border-color 150ms,color 150ms,transform 120ms var(--esp);
}
.about-btn:hover{border-color:var(--green);color:var(--green);transform:scale(1.04)}

.about-overlay{
  position:fixed;inset:0;z-index:200;
  background:rgba(0,0,0,.7);backdrop-filter:blur(4px);
  display:flex;align-items:flex-end;justify-content:center;
  padding:0 0 0 0;
  animation:fadeIn 200ms ease;
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}

.about-panel{
  width:100%;max-width:680px;
  background:var(--bg2);border:1px solid var(--border2);
  border-radius:12px 12px 0 0;
  padding:32px 32px 40px;
  animation:slideUp 250ms var(--eoc);
  max-height:90vh;overflow-y:auto;
}
@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}

.about-close{
  float:right;background:none;border:1px solid var(--border2);
  border-radius:4px;padding:4px 12px;color:var(--muted);
  font-family:var(--mono);font-size:11px;cursor:pointer;
  transition:border-color 150ms,color 150ms;
}
.about-close:hover{border-color:var(--red);color:var(--red)}

.about-title{font-size:15px;font-weight:700;margin-bottom:6px;letter-spacing:-.01em}
.about-desc{font-size:12px;color:var(--muted2);line-height:1.7;margin-bottom:20px}

.about-section{margin-bottom:20px}
.about-label{font-size:10px;color:var(--muted);letter-spacing:.15em;
  text-transform:uppercase;margin-bottom:10px}

/* tech badges */
.badges{display:flex;flex-wrap:wrap;gap:8px}
.badge{
  display:inline-flex;align-items:center;gap:6px;
  background:var(--bg3);border:1px solid var(--border2);
  border-radius:4px;padding:5px 10px;
  font-size:11px;color:var(--text);
  text-decoration:none;
  transition:border-color 150ms,color 150ms,transform 120ms var(--esp);
}
.badge:hover{transform:translateY(-1px)}
.badge-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}

/* feature list */
.feat-list{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:6px}
.feat-list li{font-size:12px;color:var(--muted2);display:flex;gap:8px;align-items:flex-start}
.feat-list li::before{content:'✓';color:var(--green);flex-shrink:0;font-size:11px;margin-top:1px}
@media(max-width:500px){.feat-list{grid-template-columns:1fr}}

.about-links{display:flex;gap:12px;flex-wrap:wrap}
.about-link{
  display:inline-flex;align-items:center;gap:6px;
  background:none;border:1px solid var(--border2);
  border-radius:4px;padding:8px 16px;
  color:var(--text);font-family:var(--mono);font-size:12px;
  text-decoration:none;cursor:pointer;
  transition:border-color 150ms,color 150ms,transform 120ms var(--esp);
}
.about-link:hover{border-color:var(--green);color:var(--green);transform:scale(1.02)}
.about-link.primary{border-color:var(--green);color:var(--green)}
.about-link.primary:hover{background:rgba(0,255,65,.08)}

`;

/* ─── Cursor ────────────────────────────────────────────────────────────────── */
function Cursor() {
  const dot = useRef(null), ring = useRef(null);
  const pos = useRef({ x: 0, y: 0 }), rp = useRef({ x: 0, y: 0 });
  const raf = useRef(null);
  useEffect(() => {
    const d = dot.current, r = ring.current;
    if (!d || !r) return;
    const mv = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      d.style.left = `${e.clientX}px`; d.style.top = `${e.clientY}px`;
      r.classList.toggle("h", !!e.target.closest("a,button,.repo,.tab,.run,.retry"));
    };
    const dn = () => r.classList.add("c");
    const up = () => r.classList.remove("c");
    const tick = () => {
      rp.current.x += (pos.current.x - rp.current.x) * 0.13;
      rp.current.y += (pos.current.y - rp.current.y) * 0.13;
      r.style.left = `${rp.current.x}px`; r.style.top = `${rp.current.y}px`;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mousedown", dn);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mousedown", dn);
      window.removeEventListener("mouseup", up);
      cancelAnimationFrame(raf.current);
    };
  }, []);
  return (
    <>
      <div ref={dot} className="cur-dot" />
      <div ref={ring} className="cur-ring" />
    </>
  );
}

/* ─── Boot sequence ─────────────────────────────────────────────────────────── */
function Boot({ username }) {
  const [vis, setVis] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const timers = BOOT_LINES.map((l, i) => setTimeout(() => setVis((v) => [...v, i]), l.delay));
    const tick = setInterval(() => setElapsed(Date.now() - t0), 80);
    return () => { timers.forEach(clearTimeout); clearInterval(tick); };
  }, [username]);
  return (
    <div className="boot-wrap">
      <div className="win">
        <div className="titlebar">
          <span className="tl r" /><span className="tl y" /><span className="tl g" />
          <span className="tbpath">devstats — analyzing {username}</span>
        </div>
        <div className="body">
          {BOOT_LINES.map((l, i) => (
            <div key={i} className={`boot-line${vis.includes(i) ? " vis" : ""}`}
              style={{ color: l.green ? "var(--green)" : "var(--muted)" }}>
              {l.text}
              {i === vis[vis.length - 1] && vis.length < BOOT_LINES.length && (
                <span className="boot-cursor" />
              )}
            </div>
          ))}
          <div className="boot-timer">elapsed: <span style={{ color: "var(--green)" }}>{(elapsed / 1000).toFixed(2)}s</span></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Contribution heatmap ──────────────────────────────────────────────────── */
function Heatmap({ repos }) {
  const [hov, setHov] = useState(null);
  const [shown, setShown] = useState(false);
  const grid = useRef([]);

  useEffect(() => {
    const counts = {};
    repos.forEach((r) => {
      const d = new Date(r.updated_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      counts[k] = (counts[k] || 0) + 1;
    });
    const today = new Date();
    const off = (today.getDay() + 1) % 7;
    const start = new Date(today);
    start.setDate(start.getDate() - 52 * 7 + (6 - off));
    const days = [];
    for (let i = 0; i < 52 * 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ date: k, count: counts[k] || 0, d });
    }
    grid.current = days;
    setTimeout(() => setShown(true), 80);
  }, [repos]);

  const weeks = [];
  for (let w = 0; w < 52; w++) weeks.push(grid.current.slice(w * 7, w * 7 + 7));
  const maxC = Math.max(...grid.current.map((d) => d.count), 1);
  const col = (c) => {
    if (!c) return "#1a1a1a";
    const t = c / maxC;
    if (t < 0.25) return "#003d0f";
    if (t < 0.5)  return "#006622";
    if (t < 0.75) return "#00a832";
    return "#00ff41";
  };
  const C = 11, G = 3;
  const svgW = 52 * (C + G) + 20;
  const svgH = 7 * (C + G) + 20;

  const mlabels = [];
  weeks.forEach((wk, wi) => {
    if (wk[0]?.d?.getDate() <= 7) mlabels.push({ wi, m: MONTHS[wk[0].d.getMonth()].slice(0, 3) });
  });

  return (
    <div>
      <div className="hm-wrap">
        <svg width={svgW} height={svgH + 16} style={{ overflow: "visible", display: "block" }}>
          {mlabels.map(({ wi, m }) => (
            <text key={wi} x={20 + wi * (C + G)} y={10}
              fill="#767676" fontSize={9} fontFamily="'JetBrains Mono',monospace">{m}</text>
          ))}
          {["M", "W", "F"].map((d, i) => (
            <text key={d} x={4} y={20 + (i * 2 + 1) * (C + G) + C / 2 + 3}
              fill="#767676" fontSize={9} fontFamily="'JetBrains Mono',monospace">{d}</text>
          ))}
          {weeks.map((wk, wi) =>
            wk.map((day, di) => {
              const x = 20 + wi * (C + G), y = 16 + di * (C + G);
              return (
                <rect key={day.date} x={x} y={y} width={C} height={C} rx={2}
                  fill={col(day.count)}
                  opacity={shown ? 1 : 0}
                  style={{ transition: `opacity 300ms ease ${(wi * 7 + di) * 2}ms` }}
                  onMouseEnter={() => setHov({ ...day, x, y })}
                  onMouseLeave={() => setHov(null)}
                />
              );
            })
          )}
          {hov && hov.count > 0 && (
            <g>
              <rect x={hov.x - 18} y={hov.y - 22} width={56} height={15} rx={3}
                fill="var(--bg3)" stroke="var(--border2)" strokeWidth={1} />
              <text x={hov.x + 10} y={hov.y - 11} textAnchor="middle"
                fill="var(--green)" fontSize={9} fontFamily="'JetBrains Mono',monospace">
                {hov.count} push{hov.count > 1 ? "es" : ""}
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className="hm-leg">
        <span>less</span>
        <div className="hm-cells">
          {["#1a1a1a", "#003d0f", "#006622", "#00a832", "#00ff41"].map((c) => (
            <svg key={c} width={11} height={11}>
              <rect width={11} height={11} rx={2} fill={c} />
            </svg>
          ))}
        </div>
        <span>more</span>
      </div>
    </div>
  );
}

/* ─── Stacked lang bar ──────────────────────────────────────────────────────── */
function StackedLangBar({ langs }) {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(null);
  useEffect(() => { const t = setTimeout(() => setReady(true), 100); return () => clearTimeout(t); }, [langs]);
  if (!langs.length) return <span style={{ color: "var(--muted)", fontSize: 12 }}>no data</span>;
  const top5 = langs.slice(0, 5);
  const rest = langs.slice(5).reduce((a, l) => a + l.pct, 0);
  const items = rest > 0.5 ? [...top5, { lang: "Other", pct: rest, color: "#444" }] : top5;
  return (
    <div>
      <div className="lb-stack">
        {items.map((l, i) => (
          <div key={l.lang} className="lb-seg" style={{
            width: ready ? `${l.pct}%` : "0%", background: l.color,
            transitionDelay: `${i * 80}ms`,
            opacity: active && active !== l.lang ? 0.35 : 1,
            transition: `width 900ms cubic-bezier(0.33,1,0.68,1) ${i * 80}ms, opacity 150ms ease`,
          }} onMouseEnter={() => setActive(l.lang)} onMouseLeave={() => setActive(null)} />
        ))}
      </div>
      <div className="lb-legend">
        {items.map((l) => (
          <div key={l.lang} className="lb-item"
            style={{ opacity: active && active !== l.lang ? 0.4 : 1 }}
            onMouseEnter={() => setActive(l.lang)} onMouseLeave={() => setActive(null)}>
            <span className="lb-dot" style={{ background: l.color }} />
            <span>{l.lang}</span>
            <span className="lb-pct">{l.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Sparkline ─────────────────────────────────────────────────────────────── */
function Sparkline({ data, color, w = 60, h = 22 }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 80); return () => clearTimeout(t); }, []);
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`).join(" ");
  const area = `M0,${h} L${pts.split(" ").join(" L")} L${w},${h} Z`;
  const gid = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} style={{ overflow: "visible", flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <clipPath id={`c${gid}`}>
          <rect x="0" y="0" height={h}
            width={drawn ? w : 0}
            style={{ transition: "width 700ms cubic-bezier(0.33,1,0.68,1)" }} />
        </clipPath>
      </defs>
      <path d={area} fill={`url(#${gid})`} clipPath={`url(#c${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} clipPath={`url(#c${gid})`} />
    </svg>
  );
}

/* ─── LangBar (languages tab) ────────────────────────────────────────────────── */
function LangBar({ lang, pct, color, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), delay + 60); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div className="lbw">
      <div className="lbh">
        <span className="lbn" style={{ color }}>{lang}</span>
        <span className="lbp">{pct.toFixed(1)}%</span>
      </div>
      <div className="lbt"><div className="lbf" style={{ width: `${w}%`, background: color }} /></div>
    </div>
  );
}

/* ─── Repo card ─────────────────────────────────────────────────────────────── */
function RepoCard({ r, showSpark }) {
  const color = lc(r.language);
  const sparkData = (() => {
    const wks = 12;
    const updated = new Date(r.updated_at).getTime();
    const ageWks = Math.floor((Date.now() - updated) / (7 * 24 * 3600 * 1000));
    return Array.from({ length: wks }, (_, i) => {
      if (i < wks - 1 - Math.min(ageWks, wks - 1)) return 0;
      const base = (r.stargazers_count % 5) + 1;
      return Math.max(0, base + Math.round(Math.sin(i * 1.3 + (r.id % 6)) * 2));
    });
  })();
  return (
    <div className="repo" style={{ "--repo-color": color }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
        <a className="rname" href={r.html_url} target="_blank" rel="noreferrer" style={{ marginBottom: 0, flex: 1, minWidth: 0 }}>{r.name}</a>
        {showSpark && <Sparkline data={sparkData} color={color} />}
      </div>
      {r.description && <p className="rdesc">{r.description.slice(0, 72)}{r.description.length > 72 ? "…" : ""}</p>}
      <div className="rmeta">
        {r.language && <span className="rlang"><span className="rdot" style={{ background: color }} />{r.language}</span>}
        <span className="rstat">★ {fmt(r.stargazers_count)}</span>
        <span className="rstat">⑂ {fmt(r.forks_count)}</span>
        {r.fork && <span className="rfork">fork</span>}
      </div>
    </div>
  );
}

/* ─── Virtual repo grid ─────────────────────────────────────────────────────── */
function VirtualGrid({ repos, showSpark }) {
  const ref = useRef(null);
  const { totalH, visible, cols } = useVirtualGrid(repos, ref);
  return (
    <div className="vs-out" ref={ref} role="list" aria-label={`${repos.length} repositories`}>
      <div className="vs-in" style={{ height: totalH }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: ROW_GAP }}>
          {visible.map(({ item }) => (
            <div key={item.id} role="listitem" style={{ height: ROW_H }}>
              <RepoCard r={item} showSpark={showSpark} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Error states ──────────────────────────────────────────────────────────── */
function State404({ username, onRetry }) {
  return (
    <div className="state-box s404" role="alert">
      <div className="state-code ec">// 404 not found</div>
      <div className="state-title">No user found</div>
      <div className="state-sub"><code style={{ color: "var(--cyan)" }}>"{username}"</code> doesn't exist on GitHub. Check for typos.</div>
      <button className="retry" onClick={onRetry}>← try again</button>
    </div>
  );
}
function StateRate({ onRetry }) {
  return (
    <div className="state-box serr" role="alert">
      <div className="state-code er">// 429 rate limited</div>
      <div className="state-title">Too many requests</div>
      <div className="state-sub">The proxy allows 10 lookups per minute. Wait 60 seconds and try again.</div>
      <button className="retry" onClick={onRetry}>↺ retry in 60s</button>
    </div>
  );
}
function StateNet({ message, onRetry }) {
  return (
    <div className="state-box serr" role="alert">
      <div className="state-code er">// network error</div>
      <div className="state-title">Something went wrong</div>
      <div className="state-sub">{message || "Could not reach the server."} This is usually temporary.</div>
      <button className="retry" onClick={onRetry}>↺ retry</button>
    </div>
  );
}

/* ─── Tooltip ────────────────────────────────────────────────────────────────── */
const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <div className="ttl">{label}</div>
      <div className="ttv">{payload[0]?.value} {payload[0]?.name}</div>
    </div>
  );
};

/* ─── CountUp ────────────────────────────────────────────────────────────────── */
function N({ v, d = 700 }) {
  const reduced = useReducedMotion();
  const n = useCountUp(typeof v === "number" ? v : 0, d, reduced);
  return <span>{fmt(typeof v === "number" ? n : v)}</span>;
}

/* ─── Stagger helper ─────────────────────────────────────────────────────────── */
function SI({ children, delay, reduced }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) { el.classList.add("in"); return; }
    el.style.transitionDelay = `${delay}ms`;
    requestAnimationFrame(() => el.classList.add("in"));
  }, [delay, reduced]);
  return <div ref={ref} className="si">{children}</div>;
}

/* ─── Tech badges config ─────────────────────────────────────────────────────── */
const STACK = [
  { label: "Next.js 14",        color: "#fff",    bg: "#000"    },
  { label: "React 18",          color: "#61DAFB", bg: "#20232a" },
  { label: "GitHub REST API",   color: "#e8e8e8", bg: "#161b22" },
  { label: "NextAuth.js",       color: "#a78bfa", bg: "#1a0533" },
  { label: "Recharts",          color: "#22c55e", bg: "#052e16" },
  { label: "Vercel Edge",       color: "#fff",    bg: "#000"    },
  { label: "Custom SVG",        color: "#f1e05a", bg: "#1a1600" },
  { label: "CSS Animations",    color: "#00d4ff", bg: "#001f26" },
];

const FEATURES = [
  "Contribution heatmap (52 weeks)",
  "GitHub-style stacked language bar",
  "Repo sparklines per card",
  "Full pagination (100+ repos)",
  "Server-side API proxy",
  "Per-IP rate limiting",
  "10-min TTL cache layer",
  "GitHub OAuth (private repos)",
  "Virtual scroll (DOM-efficient)",
  "Boot sequence loader",
  "Designed error states",
  "Open Graph preview image",
];

/* ─── About panel ────────────────────────────────────────────────────────────── */
function AboutPanel({ onClose }) {
  // Close on backdrop click
  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };
  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="about-overlay" onClick={handleBackdrop} role="dialog" aria-modal="true" aria-label="About DevStats">
      <div className="about-panel">
        <button className="about-close" onClick={onClose}>✕ close</button>

        <div style={{ marginBottom: 20 }}>
          <div className="about-title">// about devstats</div>
          <div className="about-desc">
            A terminal-aesthetic GitHub analytics dashboard. Search any public GitHub username
            and get a contribution heatmap, language breakdown, repo sparklines, and star counts —
            all proxied through a hardened Next.js backend so the API token never touches the browser.
            Log in with GitHub to include private repositories.
          </div>
        </div>

        <div className="about-section">
          <div className="about-label">tech stack</div>
          <div className="badges">
            {STACK.map((s) => (
              <span key={s.label} className="badge" style={{ borderColor: s.color + "44" }}>
                <span className="badge-dot" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="about-section">
          <div className="about-label">features</div>
          <ul className="feat-list">
            {FEATURES.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>

        <div className="about-section">
          <div className="about-label">links</div>
          <div className="about-links">
            <a className="about-link primary"
              href="https://github.com/Vatsal-A/devstats"
              target="_blank" rel="noreferrer">
              ↗ view source on github
            </a>
            <a className="about-link"
              href="https://github.com/Vatsal-A"
              target="_blank" rel="noreferrer">
              github.com/Vatsal-A
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────────── */
function Footer({ onAbout }) {
  return (
    <div className="footer">
      <div className="footer-credit">
        <div><span className="g">{"// "}</span>built by{" "}
          <a href="https://github.com/Vatsal-A" target="_blank" rel="noreferrer">Vatsal Agrawal</a>
        </div>
        <div><span className="g">{"// "}</span>
          <a href="https://github.com/Vatsal-A/devstats" target="_blank" rel="noreferrer">source code</a>
          {" · "}
          <a href="https://github.com/Vatsal-A" target="_blank" rel="noreferrer">portfolio</a>
        </div>
        <div style={{ marginTop: 4, fontSize: 11 }}>
          <span style={{ color: "var(--border2)" }}>
            {"/* next.js · github rest api · nextauth · recharts · vercel */"}
          </span>
        </div>
      </div>
      <button className="about-btn" onClick={onAbout}>
        {"// about this project"}
      </button>
    </div>
  );
}

/* ─── App ────────────────────────────────────────────────────────────────────── */
export default function App() {
  const { data: session }         = useSession();
  const [q, setQ]                 = useState("");
  const [user, setUser]           = useState(null);
  const [repos, setRepos]         = useState([]);
  const [langs, setLangs]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [errType, setErrType]     = useState(null);
  const [inputErr, setInputErr]   = useState("");
  const [tab, setTab]             = useState("overview");
  const [lines, setLines]         = useState([]);
  const [dashKey, setDashKey]     = useState(0);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const lastQ                     = useRef("");
  const reduced                   = useReducedMotion();
  const [showAbout, setShowAbout] = useState(false);

  const log = (txt, ok) => setLines((l) => [...l.slice(-8), { txt, ok }]);

  /* private load when session starts */
  useEffect(() => {
    if (session?.user?.isAuthed) loadPrivate();
  }, [session]);

  const loadPrivate = useCallback(async () => {
    setLoading(true); setError(""); setUser(null); setRepos([]);
    setLines([]); setTab("overview"); setIsPrivate(true); setErrType(null);
    log(`$ devstats analyze --private (${session?.user?.login})`, true);
    try {
      const res = await fetch("/api/github-private");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      apply(data);
    } catch (e) {
      setError(e.message); setIsPrivate(false); setErrType("network");
    } finally {
      setLoading(false);
    }
  }, [session]);

  const run = useCallback(async (uname) => {
    setLoading(true); setError(""); setUser(null); setRepos([]);
    setLines([]); setTab("overview"); setIsPrivate(false); setErrType(null);
    lastQ.current = uname;
    log(`$ devstats analyze ${uname}`, true);
    log("  routing through proxy...", false);
    try {
      const res = await fetch(`/api/github?username=${encodeURIComponent(uname)}`);
      const data = await res.json();
      if (res.status === 429) { setErrType("rate");    throw new Error(data.error); }
      if (res.status === 404) { setErrType("404");     throw new Error(data.error); }
      if (!res.ok)            { setErrType("network"); throw new Error(data.error || `Error ${res.status}`); }
      log(`  ✓ ${data.user.name || data.user.login} — ${data.repos.length} repos`, true);
      if (data.cached) log(`  ↩ cached ${Math.round((Date.now() - data.cachedAt) / 1000)}s ago`, false);
      apply(data);
    } catch (e) {
      log(`  ✗ ${e.message}`, false);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const go = () => {
    setInputErr("");
    const val = q.trim();
    if (!val) { setInputErr("enter a github username"); return; }
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(val)) { setInputErr("letters, numbers, hyphens only — max 39 chars"); return; }
    run(val);
  };

  function apply(data) {
    setUser(data.user);
    setRepos(data.repos);
    setCacheInfo({ cached: data.cached, cachedAt: data.cachedAt });
    const map = {};
    data.repos.forEach((x) => { if (x.language) map[x.language] = (map[x.language] || 0) + 1; });
    const tot = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    setLangs(Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 8)
      .map(([lang, count]) => ({ lang, count, pct: (count / tot) * 100, color: lc(lang) })));
    setDashKey((k) => k + 1);
  }

  const top   = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
  const all   = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
  const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);
  const forks = repos.reduce((a, r) => a + r.forks_count, 0);
  const own   = repos.filter((r) => !r.fork);

  const TB = (t) => (
    <button key={t} className={`tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{t}</button>
  );

  return (
    <>
      <Head>
        <title>DevStats — GitHub Analytics</title>
        <style>{CSS}</style>
      </Head>
      <Cursor />
      <div className="app">

        {/* Terminal hero */}
        <div className="shell">
          <div className="win">
            <div className="titlebar">
              <span className="tl r" /><span className="tl y" /><span className="tl g" />
              <span className="tbpath">devstats — bash — 80×24</span>
            </div>
            <div className="body">
              <div className="prompt-line">
                <span className="g">vatsal@devstats</span>:<span style={{ color: "#4a9eff" }}>~/projects</span>$
              </div>
              <div className="hd">GitHub Analytics<span className="blink">█</span></div>
              <div className="sub">// grep your github, visually</div>
              <div className="prow">
                <span className="pdollar">$</span>
                <span className="pprefix">devstats analyze</span>
                <input className="pinput" value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && go()}
                  placeholder="username" autoFocus spellCheck={false}
                  aria-label="GitHub username" />
                <button className="run" onClick={go} disabled={loading || !q.trim()}>
                  {loading ? "running…" : "[enter]"}
                </button>
              </div>
              {inputErr && <div className="input-err" role="alert">⚠ {inputErr}</div>}
              <div className="auth-row">
                {session ? (
                  <>
                    <span style={{ color: "var(--green)" }}>● logged in as <strong>{session.user.login}</strong></span>
                    <span style={{ color: "var(--muted)" }}>— private repos visible</span>
                    <button className="run" style={{ marginLeft: "auto" }} onClick={() => signOut()}>sign out</button>
                  </>
                ) : (
                  <>
                    <span style={{ color: "var(--muted)" }}>anonymous — public repos only</span>
                    <button className="run" style={{ marginLeft: "auto", borderColor: "var(--cyan)", color: "var(--cyan)" }}
                      onClick={() => signIn("github")}>sign in with github →</button>
                  </>
                )}
              </div>
              {lines.length > 0 && (
                <div style={{ marginTop: 16, fontSize: 12 }}>
                  {lines.map((l, i) => (
                    <div key={i} style={{ color: l.ok ? "var(--green)" : "var(--muted)", marginBottom: 2 }}>{l.txt}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Boot sequence */}
        {loading && <Boot username={q} />}

        {/* Empty state */}
        {!loading && !user && !error && (
          <div className="empty">
            <pre style={{ fontSize: 12, color: "var(--muted)", lineHeight: 2 }}>
              {"  "}<span style={{ color: "var(--green)" }}>$</span>{" devstats analyze "}<span style={{ color: "var(--cyan)" }}>torvalds</span>{"\n"}
              {"  "}<span style={{ color: "var(--green)" }}>$</span>{" devstats analyze "}<span style={{ color: "var(--cyan)" }}>gaearon</span>{"\n"}
              {"  "}<span style={{ color: "var(--green)" }}>$</span>{" devstats analyze "}<span style={{ color: "var(--cyan)" }}>sindresorhus</span>{"\n"}
              {"  "}<span style={{ color: "var(--green)" }}>$</span>{" devstats analyze "}<span style={{ color: "#f1e05a" }}>Vatsal-A</span>
            </pre>
          </div>
        )}

        {/* Error states */}
        {!loading && error && errType === "404"     && <State404 username={lastQ.current} onRetry={() => { setError(""); setErrType(null); }} />}
        {!loading && error && errType === "rate"    && <StateRate onRetry={() => { setError(""); setErrType(null); run(lastQ.current); }} />}
        {!loading && error && errType === "network" && <StateNet message={error} onRetry={() => run(lastQ.current)} />}

        {/* Dashboard */}
        {!loading && user && (
          <div key={dashKey} className="dash">

            {/* Profile */}            <div className="sec">
              <span className="g">//</span> profile
              {cacheInfo && (
                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>
                  {cacheInfo.cached
                    ? `↩ cached · ${Math.round((Date.now() - cacheInfo.cachedAt) / 60000)}m ago`
                    : `↺ live · ${new Date(cacheInfo.cachedAt).toLocaleTimeString()}`}
                </span>
              )}
            </div>
            <div className="prof">
              <img className="avatar" src={user.avatar_url} alt={user.login} />
              <div className="pinfo">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 2 }}>
                  <div className="pname">{user.name || user.login}</div>
                  {isPrivate && <span className="pvt">● private mode</span>}
                </div>
                <a className="plogin" href={user.html_url} target="_blank" rel="noreferrer">@{user.login}</a>
                {user.bio && <div className="pbio">{user.bio}</div>}
                <div className="pmeta">
                  {user.location && <span>📍 {user.location}</span>}
                  {user.company  && <span>🏢 {user.company}</span>}
                  {user.blog     && <span>🔗 {user.blog.replace(/https?:\/\//, "")}</span>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">{["overview", "repositories", "languages"].map(TB)}</div>

            {/* Overview */}
            {tab === "overview" && (
              <div key="overview" className="panel">
                {/* Stat row — uniform cards, equal height */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:10 }}>
                  {[
                    { label:"public repos",  val:user.public_repos, cls:"",   d:55  },
                    { label:"own repos",     val:own.length,        cls:"",   d:110 },
                    { label:"following",     val:user.following,    cls:"",   d:165 },
                    { label:"followers",     val:user.followers,    cls:"cy", d:220 },
                    { label:"total stars",   val:stars,             cls:"gn", d:275 },
                    { label:"total forks",   val:forks,             cls:"",   d:330 },
                    { label:"top language",  val:langs[0]?.lang||"—", cls:"", d:385, color:lc(langs[0]?.lang) },
                  ].map(({ label, val, cls, d, color }) => (
                    <div key={label} className="si cell" ref={el=>{
                      if(!el)return;
                      if(reduced){el.classList.add("in");return;}
                      el.style.transitionDelay=`${d}ms`;
                      requestAnimationFrame(()=>el.classList.add("in"));
                    }} style={{ minHeight:90 }}>
                      <div className="clabel">{label}</div>
                      <div className={`cval ${cls}`} style={{ fontSize: typeof val === "string" && val.length > 3 ? 16 : 32, color: color || undefined, marginTop: typeof val === "string" ? 6 : 0 }}>
                        {typeof val === "number" ? <N v={val} /> : val}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Two column layout: left = heatmap + repos, right = lang + top repos */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>

                  {/* Left col: heatmap full width */}
                  <SI delay={440} reduced={reduced}>
                    <div className="cell" style={{ gridColumn:"1 / -1" }}>
                      <div className="clabel">// contribution heatmap — 52 weeks</div>
                      <Heatmap repos={repos} />
                    </div>
                  </SI>

                  {/* Left col bottom: language distribution */}
                  <SI delay={495} reduced={reduced}>
                    <div className="cell">
                      <div className="clabel">// language distribution</div>
                      <StackedLangBar langs={langs} />
                    </div>
                  </SI>

                  {/* Right col bottom: quick stats recap */}
                  <SI delay={530} reduced={reduced}>
                    <div className="cell">
                      <div className="clabel">// repo breakdown</div>
                      {[
                        ["own repos",   own.length],
                        ["forks",       repos.filter(r=>r.fork).length],
                        ["with stars",  repos.filter(r=>r.stargazers_count>0).length],
                        ["languages",   langs.length],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"5px 0", borderBottom:"1px solid var(--border)" }}>
                          <span style={{ color:"var(--muted)" }}>{label}</span>
                          <span style={{ fontVariantNumeric:"tabular-nums", fontWeight:600 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </SI>

                </div>

                {/* Top repos — full width below */}
                <SI delay={550} reduced={reduced}>
                  <div className="cell" style={{ marginBottom:10 }}>
                    <div className="clabel">// top repositories by stars</div>
                    <div className="rgrid">
                      {top.map((r, i) => (
                        <SI key={r.id} delay={600 + i * 50} reduced={reduced}>
                          <RepoCard r={r} showSpark={true} />
                        </SI>
                      ))}
                    </div>
                  </div>
                </SI>
              </div>
            )}

            {/* Repositories */}
            {tab === "repositories" && (
              <div key="repos" className="panel">
                <div className="cell" style={{ gridColumn: "1 / -1" }}>
                  <div className="clabel">// {repos.length} repositories</div>
                  <VirtualGrid repos={all} showSpark={false} />
                </div>
              </div>
            )}

            {/* Languages */}
            {tab === "languages" && (
              <div key="langs" className="panel">
                <div className="bento">
                  <div className="cell">
                    <div className="clabel">// breakdown by repo count</div>
                    {langs.length > 0
                      ? langs.map((l, i) => <LangBar key={l.lang} lang={l.lang} pct={l.pct} color={l.color} delay={i * 80} />)
                      : <span style={{ color: "var(--muted)", fontSize: 12 }}>no language data</span>}
                  </div>
                  <div className="cell">
                    <div className="clabel">// repos per language</div>
                    <ResponsiveContainer width="100%" height={Math.max(langs.length * 36 + 20, 180)}>
                      <BarChart data={langs} layout="vertical" barSize={8}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#767676", fontFamily: "var(--mono)" }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="lang" type="category" tick={{ fontSize: 11, fill: "#a0a0a0", fontFamily: "var(--mono)" }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip content={<TT />} />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]} name="repos"
                          isAnimationActive={!reduced} animationBegin={100} animationDuration={700} animationEasing="ease-out">
                          {langs.map((l, i) => <Cell key={i} fill={l.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
        {/* Footer */}
        <Footer onAbout={() => setShowAbout(true)} />

        {/* About panel */}
        {showAbout && <AboutPanel onClose={() => setShowAbout(false)} />}

      </div>
    </>
  );
}