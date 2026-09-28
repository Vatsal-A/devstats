import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#e8e8e8;font-family:'JetBrains Mono',monospace}

.page{
  min-height:100vh;
  background:#0a0a0a;
  background-image:radial-gradient(circle,#1f1f1f 1px,transparent 1px);
  background-size:28px 28px;
  display:flex;align-items:center;justify-content:center;
  padding:24px;
}

.win{
  width:100%;max-width:600px;
  background:#111;border:1px solid #2a2a2a;
  border-radius:10px;overflow:hidden;
  box-shadow:0 24px 80px rgba(0,0,0,.7);
}
.titlebar{
  display:flex;align-items:center;gap:8px;
  background:#161616;border-bottom:1px solid #1e1e1e;
  padding:10px 14px;
}
.tl{width:12px;height:12px;border-radius:50%}
.body{padding:32px 28px 36px;position:relative}
.body::before{
  content:'';position:absolute;top:0;left:0;
  width:3px;height:100%;background:#ff5f57;
}

.code{font-size:clamp(56px,15vw,96px);font-weight:700;
  letter-spacing:-.04em;line-height:1;
  color:#1e1e1e;margin-bottom:4px;user-select:none;
  -webkit-text-stroke:1px #2a2a2a;
}
.err-label{font-size:11px;color:#ff5f57;letter-spacing:.15em;
  text-transform:uppercase;margin-bottom:20px}
.msg{font-size:14px;color:#a0a0a0;line-height:1.7;margin-bottom:28px}
.msg .hl{color:#e8e8e8}
.msg .g{color:#00ff41}
.msg .r{color:#ff5f57}
.msg code{color:#00d4ff;font-family:inherit}

.actions{display:flex;gap:10px;flex-wrap:wrap}
.btn{
  background:none;border:1px solid #2a2a2a;border-radius:4px;
  padding:9px 18px;color:#e8e8e8;font-family:'JetBrains Mono',monospace;
  font-size:12px;text-decoration:none;cursor:pointer;
  transition:border-color 150ms,color 150ms,transform 120ms cubic-bezier(.34,1.56,.64,1);
  display:inline-flex;align-items:center;gap:6px;
}
.btn:hover{transform:scale(1.03)}
.btn.primary{border-color:#00ff41;color:#00ff41}
.btn.primary:hover{background:rgba(0,255,65,.08)}
.btn.sec:hover{border-color:#a0a0a0}

.trace{
  margin-top:28px;padding-top:20px;
  border-top:1px solid #1e1e1e;
  font-size:11px;color:#555;line-height:2;
}
.trace .dim{color:#333}

@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.blink{animation:blink 1.1s step-end infinite;color:#00ff41}

@keyframes typeIn{from{width:0}to{width:100%}}
.typeline{
  overflow:hidden;white-space:nowrap;
  animation:typeIn .6s steps(40,end) forwards;
  width:0;
}
.typeline-2{animation-delay:.7s}
.typeline-3{animation-delay:1.4s}
`;

const SUGGESTIONS = [
  { label: "torvalds", desc: "// linux kernel author" },
  { label: "gaearon",  desc: "// react core team" },
  { label: "Vatsal-A", desc: "// this app's creator" },
];

export default function NotFound() {
  const router = useRouter();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Head>
        <title>404 — DevStats</title>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{CSS}</style>
      </Head>
      <div className="page">
        <div className="win">
          {/* Title bar */}
          <div className="titlebar">
            <span className="tl" style={{ background: "#ff5f57" }} />
            <span className="tl" style={{ background: "#febc2e" }} />
            <span className="tl" style={{ background: "#28ca41" }} />
            <span style={{ flex: 1, textAlign: "center", color: "#767676", fontSize: 11 }}>
              devstats — bash — 404
            </span>
          </div>

          {/* Body */}
          <div className="body">
            <div className="code">404</div>
            <div className="err-label">// page not found</div>

            <div className="msg">
              <div className={`typeline${shown ? "" : ""}`} style={{ animationPlayState: shown ? "running" : "paused" }}>
                <span className="r">✗</span> <span className="hl">route</span> not found — this path doesn{"'"}t exist.
              </div>
              <div className="typeline typeline-2" style={{ animationPlayState: shown ? "running" : "paused" }}>
                <span className="g">$</span> try searching a github username instead.
              </div>
              <div className="typeline typeline-3" style={{ animationPlayState: shown ? "running" : "paused" }}>
                <span style={{ color: "#555" }}>{"// "}</span>or go back to where you came from<span className="blink">█</span>
              </div>
            </div>

            <div className="actions">
              <a className="btn primary" href="/">← devstats home</a>
              <button className="btn sec" onClick={() => router.back()}>↩ go back</button>
            </div>

            {/* Fake stack trace for aesthetic */}
            <div className="trace">
              <div><span className="dim">at</span> Router.resolve <span className="dim">(next/dist/server/router.js:248)</span></div>
              <div><span className="dim">at</span> <span style={{ color: "#767676" }}>GET {typeof window !== "undefined" ? window.location.pathname : "/unknown"}</span></div>
              <div style={{ marginTop: 8, color: "#333" }}>
                {"/* try one of these instead: "}
                {SUGGESTIONS.map((s, i) => (
                  <span key={s.label}>
                    <a href={`/?q=${s.label}`} style={{ color: "#00d4ff", textDecoration: "none" }}>
                      {s.label}
                    </a>
                    {i < SUGGESTIONS.length - 1 ? ", " : ""}
                  </span>
                ))}
                {" */"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
