import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { mockMobility, mockZones } from "./mockData";

function App() {
  const [name, setName] = useState("");
  const [zone, setZone] = useState("north_gate");
  const [created, setCreated] = useState(false);
  const carpool = useMemo(() => mockMobility.carpool.find((item) => item.zone === zone) ?? mockMobility.carpool[0], [zone]);
  const lime = useMemo(() => mockMobility.lime.find((item) => item.zone === zone) ?? mockMobility.lime[0], [zone]);
  const transit = mockMobility.transit.find((item) => item.zone === zone);

  return <main>
    <header><p className="eyebrow">OUTSIDE LANDS · OSL TOGETHER</p><span className="demo-pill">DEMO MODE</span></header>
    <h1>Find your people on the way there.</h1>
    <p className="lede">A warm introduction to fans heading the same direction — with a transit fallback always in view.</p>
    <section className="card form-card"><div className="section-heading"><div><p className="kicker">01 · YOUR PLAN</p><h2>Make a travel plan</h2></div><span className="step">1 / 2</span></div>
      <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest fan" /></label>
      <label>Park zone<select value={zone} onChange={(e) => setZone(e.target.value)}>{mockZones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="segmented"><button className="selected">Arriving</button><button>Leaving</button></div>
      <label>When are you traveling?<input type="datetime-local" /></label>
      <button className="primary" onClick={() => setCreated(true)}>{created ? "Plan saved ✓" : "Find compatible fans"}</button>
      {created && <p className="success">Your plan is live. We’ll show compatible fans as they appear.</p>}
    </section>
    <section className="fallback"><div className="section-heading"><div><p className="kicker">02 · YOUR BACKUP PLAN</p><h2>Near {mockZones.find(([value]) => value === zone)?.[1]}</h2></div><span className="live-dot">● LIVE MOCK</span></div><p className="updated">{mockMobility.updatedLabel}</p>
      <div className="mobility-list">
        <article><span className="icon transit-icon">↗</span><div><b>{transit?.route ?? "5R"} · {transit?.name ?? "Fulton Rapid"}</b><small>Next: {transit?.arrivals.join(" · ")} min</small></div><span className="tag">{transit?.crowding ?? "moderate"}</span></article>
        <article><span className="icon car-icon">⌁</span><div><b>Carpool pool</b><small>{carpool.waiting} compatible fans · {carpool.timeLabel}</small></div><span className="tag">intro only</span></article>
        <article><span className="icon bike-icon">◒</span><div><b>Lime micromobility</b><small>{lime.scooters} scooters · {lime.seatedScooters} seated</small></div><span className="tag">estimated</span></article>
      </div><small className="disclaimer">Mocked for the hackathon. No ride booking, payment, or vehicle reservation.</small>
    </section>
    <footer>OSL Together <span>·</span> travel with a little more togetherness</footer>
  </main>;
}
createRoot(document.getElementById("root")!).render(<App />);
