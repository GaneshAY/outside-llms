import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient, useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import "./style.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

type Result = { touringHistorySummary?: string; bio?: string; pitch?: string; usedRealJambaseData?: boolean; error?: string };

function App() {
  const [artistName, setArtistName] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const generate = useAction(api.epk.generate);
  const history = useQuery(api.epk.list);

  async function onGenerate() {
    if (!artistName.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const accessCode = (import.meta.env.VITE_DEMO_ACCESS_CODE as string) ?? "";
      const res = await generate({ artistName: artistName.trim(), accessCode });
      setResult(res);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header><p className="eyebrow">OUTSIDE LANDS · CHALLENGE 01</p><span className="demo-pill">DEMO MODE</span></header>
      <h1>Your press kit, drafted from your real shows.</h1>
      <p className="lede">Pulls verified touring history from Jambase, then drafts a bio and pitch email — no manual gig-list typing.</p>

      <section className="card form-card">
        <div className="section-heading"><div><p className="kicker">01 · ARTIST</p><h2>Who are we pitching?</h2></div></div>
        <label>Artist name<input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="e.g. Charli XCX" /></label>
        <button className="primary" onClick={onGenerate} disabled={loading || !artistName.trim()}>{loading ? "Generating…" : "Generate EPK"}</button>
      </section>

      {result && !result.error && (
        <section className="card result-card">
          <div className="section-heading">
            <div><p className="kicker">02 · RESULT</p><h2>{artistName}</h2></div>
            <span className={result.usedRealJambaseData ? "live-dot" : "tag"}>{result.usedRealJambaseData ? "● LIVE JAMBASE DATA" : "PLACEHOLDER DATA"}</span>
          </div>
          <p className="updated">{result.touringHistorySummary}</p>
          <article><b>Bio</b><p>{result.bio}</p></article>
          <article><b>Pitch email</b><p>{result.pitch}</p></article>
          {!result.usedRealJambaseData && <small className="disclaimer">Jambase endpoint not yet confirmed — showing generated copy grounded in placeholder touring data instead.</small>}
        </section>
      )}

      {result?.error && <section className="card result-card"><p className="disclaimer">Something went wrong: {result.error}</p></section>}

      {history && history.length > 0 && (
        <section className="fallback">
          <div className="section-heading"><div><p className="kicker">HISTORY</p><h2>Recent EPKs</h2></div></div>
          <div className="mobility-list">
            {history.map((h) => (
              <article key={h._id}><span className="icon transit-icon">♪</span><div><b>{h.artistName}</b><small>{new Date(h.createdAt).toLocaleTimeString()}</small></div><span className="tag">{h.status}</span></article>
            ))}
          </div>
        </section>
      )}

      <footer>EPK Generator <span>·</span> Jambase-grounded, OpenAI-drafted</footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
);
