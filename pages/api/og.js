import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user") || null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          fontFamily: "monospace",
        }}
      >
        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          backgroundImage: "radial-gradient(circle, #1f1f1f 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        {/* Glow */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "50%", display: "flex",
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,63,15,0.5) 0%, transparent 100%)",
        }} />
        {/* Terminal window */}
        <div style={{
          margin: "60px 80px", background: "#111", border: "1px solid #2a2a2a",
          borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
          flex: 1, position: "relative",
        }}>
          {/* Green accent bar */}
          <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "#00ff41", display: "flex" }} />
          {/* Title bar */}
          <div style={{
            background: "#161616", padding: "14px 20px",
            display: "flex", alignItems: "center", gap: 10,
            borderBottom: "1px solid #1e1e1e",
          }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ff5f57", display: "flex" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#febc2e", display: "flex" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#28ca41", display: "flex" }} />
            <div style={{ flex: 1, textAlign: "center", color: "#767676", fontSize: 14 }}>
              devstats — bash — 80x24
            </div>
          </div>
          {/* Body */}
          <div style={{ padding: "44px 52px", display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ color: "#767676", fontSize: 16, marginBottom: 24 }}>
              <span style={{ color: "#00ff41" }}>vatsal@devstats</span>:~/projects$
            </div>
            <div style={{ fontSize: 72, fontWeight: 700, color: "#e8e8e8", letterSpacing: -2, lineHeight: 1, marginBottom: 24, display: "flex", alignItems: "center" }}>
              GitHub Analytics
              <span style={{ display: "inline-block", width: 16, height: 60, background: "#00ff41", marginLeft: 10 }} />
            </div>
            <div style={{ color: "#a0a0a0", fontSize: 20, marginBottom: 40 }}>
              {user ? `// analyzing ${user}s profile` : "// inspect any public developer profile"}
            </div>
            {/* Prompt */}
            <div style={{
              background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 6,
              padding: "16px 22px", display: "flex", alignItems: "center", gap: 14, marginBottom: 32,
            }}>
              <span style={{ color: "#00ff41", fontSize: 20 }}>$</span>
              <span style={{ color: "#a0a0a0", fontSize: 20 }}>devstats analyze</span>
              <span style={{ color: "#e8e8e8", fontSize: 20 }}>{user || "username"}</span>
              <div style={{ width: 13, height: 22, background: "#00ff41", marginLeft: 4, display: "flex" }} />
            </div>
            {/* Pills */}
            <div style={{ display: "flex", gap: 10 }}>
              {["contribution heatmap", "language breakdown", "repo sparklines", "private mode"].map((f) => (
                <div key={f} style={{
                  background: "rgba(0,255,65,0.06)", border: "1px solid rgba(0,255,65,0.2)",
                  borderRadius: 4, padding: "5px 16px", color: "#00ff41", fontSize: 14, display: "flex",
                }}>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
