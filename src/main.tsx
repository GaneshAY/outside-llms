import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import {
  formatClock,
  formatMinutesFrom,
  getLatestCarpoolForZone,
  getLatestLimeForZone,
  getTransitFeedForZone,
  mockDataStats,
  mockDataWindow,
  mockMobility,
  mockZones,
  type MockZone,
} from "./mockData";

function App() {
  const [name, setName] = useState("");
  const [zone, setZone] = useState("north_gate");
  const [direction, setDirection] = useState<"arrival" | "departure">("arrival");
  const [created, setCreated] = useState(false);
  const now = mockDataWindow.nowAnchor;
  const currentZone = zone as MockZone;
  const transit = useMemo(() => getTransitFeedForZone(currentZone, now), [currentZone, now]);
  const carpool = useMemo(() => getLatestCarpoolForZone(currentZone, now), [currentZone, now]);
  const lime = useMemo(() => getLatestLimeForZone(currentZone, now), [currentZone, now]);
  const zoneLabel = useMemo(() => mockZones.find(([value]) => value === zone)?.[1] ?? "North Gate", [zone]);
  const transitHasData = transit.length > 0;
  const nearbyTransit = transit.slice(0, 3);

  return <main>
    <header><p className="eyebrow">OUTSIDE LANDS · OSL TOGETHER</p></header>
    <h1>Find your people on the way there.</h1>
    <p className="lede">A warm introduction to fans heading the same direction — with a transit fallback always in view.</p>
    <section className="card form-card"><div className="section-heading"><div><p className="kicker">01 · YOUR PLAN</p><h2>Make a travel plan</h2></div><span className="step">1 / 2</span></div>
      <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest fan" /></label>
      <label>Park zone<select value={zone} onChange={(e) => setZone(e.target.value)}>{mockZones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="segmented">
        <button
          className={direction === "arrival" ? "selected" : ""}
          onClick={() => setDirection("arrival")}
          type="button"
        >
          Arriving
        </button>
        <button
          className={direction === "departure" ? "selected" : ""}
          onClick={() => setDirection("departure")}
          type="button"
        >
          Leaving
        </button>
      </div>
      <label>When are you traveling?<input type="datetime-local" /></label>
      <button className="primary" onClick={() => setCreated(true)}>
        {created ? (
          "Plan saved ✓"
        ) : (
          <>
            <span className="ai-stars" aria-label="AI matching" role="img">✨</span>
            <span>AI is finding compatible fans</span>
          </>
        )}
      </button>
      {created && <p className="success">Your plan is live. We’ll show compatible fans as they appear.</p>}
    </section>
    <section className="fallback"><div className="section-heading"><div><p className="kicker">02 · YOUR BACKUP PLAN</p><h2>Near {mockZones.find(([value]) => value === zone)?.[1]}</h2></div><span className="live-dot">● LIVE MOCK</span></div><p className="updated">{mockMobility.updatedLabel}</p>
      <div className="mobility-list">
        {transitHasData ? nearbyTransit.map((item) => <article key={`${item.route}-${item.departureAt}-${item.zone}`}>
          <span className="icon transit-icon">↗</span><div><b>{item.route} · {item.name}</b><small>Next {formatMinutesFrom(item.departureAt, now)} at {formatClock(item.departureAt)} from {zoneLabel}</small></div><span className="tag">{item.crowding}</span>
        </article>) : <article><span className="icon transit-icon">↗</span><div><b>Transit fallback</b><small>No synthetic departures in this window.</small></div><span className="tag">mocked data</span></article>}
        <article><span className="icon car-icon">⌁</span><div><b>Carpool pool</b><small>{carpool?.compatibleFans ?? 0} compatible fans · within {(carpool?.waitingMinutes ?? 0)} min</small></div><span className="tag">intro only</span></article>
        <article><span className="icon bike-icon">◒</span><div><b>Lime micromobility</b><small>{lime?.scooters ?? 0} scooters · {lime?.seatedScooters ?? 0} seated</small></div><span className="tag">estimated</span></article>
      </div><small className="disclaimer">Mocked for the hackathon. No ride booking, payment, or vehicle reservation.</small>
      <small className="disclaimer">Mock data points: transit {mockDataStats.transitEvents}, carpool {mockDataStats.carpoolEvents}, Lime {mockDataStats.limeEvents} from {mockDataWindow.labelStart} to {mockDataWindow.labelEnd}.</small>
    </section>
    <footer>OSL Together <span>·</span> travel with a little more togetherness</footer>
  </main>;
}
createRoot(document.getElementById("root")!).render(<App />);
