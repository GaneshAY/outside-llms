import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import "./style.css";
import {
  formatClock,
  formatMinutesFrom,
  getCompatibleFansForPlan,
  getLatestCarpoolForZone,
  getLatestLimeForZone,
  getTransitFeedForZone,
  mockDataStats,
  mockDataWindow,
  mockMobility,
  mockZones,
  type MockZone,
} from "./mockData";

const DEFAULT_FLEXIBILITY_MINUTES = 35;
const MATCH_LIMIT = 8;
const NO_MATCH_MESSAGE =
  "No immediate nearby matches found right now. Keep this plan open and we'll keep checking nearby plans as more fans sync.";
const DEMO_LIVE_LOCATION = "501 Folsom St, San Francisco, CA 94105";
const DEFAULT_PLAN_TIME = Date.parse("2026-08-07T10:00:00-07:00");

const createDefaultPlanState = (): FormPlanState => ({
  name: "",
  zone: "north_gate",
  direction: "arrival",
  planTime: formatDateTimeLocal(DEFAULT_PLAN_TIME),
  startingPoint: DEMO_LIVE_LOCATION,
});

const formatDateTimeLocal = (valueMs: number) => {
  const value = new Date(valueMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

const zoneLabelMap = mockZones.reduce<Record<string, string>>((acc, [value, label]) => {
  acc[value] = label;
  return acc;
}, {});

const localEnv = (import.meta as unknown as { env?: { VITE_CONVEX_URL?: string } }).env;
const convexUrl = localEnv?.VITE_CONVEX_URL?.trim();
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

type MatchingCard = {
  _id: string;
  userName: string;
  direction: "arrival" | "departure";
  desiredTime: number;
  locationZone: string;
  flexibilityMinutes: number;
  deltaMinutes: number;
  overlapMinutes: number;
  sameGroup: boolean;
  sameStartingPoint: boolean;
  startingPoint?: string;
};

type MatchConnectState = Set<string>;

type SeedStatus = { users: number; intents: number; fallbackRows: number; seeded: boolean };

type FormPlanState = {
  name: string;
  zone: string;
  direction: "arrival" | "departure";
  planTime: string;
  startingPoint: string;
};

function FormSection({
  state,
  created,
  collapsed,
  isSaving,
  onNameChange,
  onZoneChange,
  onDirectionChange,
  onPlanTimeChange,
  onStartingPointChange,
  onSave,
  onEdit,
  onReset,
}: {
  state: FormPlanState;
  created: boolean;
  collapsed: boolean;
  isSaving: boolean;
  onNameChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  onDirectionChange: (value: "arrival" | "departure") => void;
  onPlanTimeChange: (value: string) => void;
  onStartingPointChange: (value: string) => void;
  onSave: () => void;
  onEdit: () => void;
  onReset: () => void;
}) {
  const zoneLabel = zoneLabelMap[state.zone] ?? "North Gate";
  const friendlyDirection = state.direction === "arrival" ? "Arriving" : "Leaving";

  return (
    <section className="card form-card">
      <div className="section-heading">
        <div>
          <p className="kicker">01 · YOUR PLAN</p>
          <h2>Make a travel plan</h2>
        </div>
        <span className="step">1 / 2</span>
      </div>

      {collapsed ? (
        <div className="plan-summary">
          <div className="summary-line"><span>Direction</span><strong>{friendlyDirection} · {zoneLabel}</strong></div>
          <div className="summary-line"><span>Time</span><strong>{state.planTime || "Not set"}</strong></div>
          <div className="summary-line"><span>From</span><strong>{state.startingPoint || "Not set"}</strong></div>
          <div className="summary-line"><span>Name</span><strong>{state.name || "Outside Lander"}</strong></div>
          <div className="plan-actions">
            <button className="edit-plan" onClick={onEdit} type="button">Edit plan</button>
            <button className="edit-plan" onClick={onReset} type="button">Reset plan</button>
          </div>
        </div>
      ) : (
        <>
          <label>
            Your name
            <input value={state.name} onChange={(e) => onNameChange(e.target.value)} placeholder="Your name" />
          </label>
          <label>
            Where are you starting from?
            <input
              value={state.startingPoint}
              onChange={(e) => onStartingPointChange(e.target.value)}
              placeholder="Gate, street, parking lot, or stop"
            />
          </label>
          <label>
            Park zone
            <select value={state.zone} onChange={(e) => onZoneChange(e.target.value)}>
              {mockZones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="segmented" role="group" aria-label="Direction">
            <button
              className={state.direction === "arrival" ? "selected" : ""}
              onClick={() => onDirectionChange("arrival")}
              type="button"
            >
              Arriving
            </button>
            <button
              className={state.direction === "departure" ? "selected" : ""}
              onClick={() => onDirectionChange("departure")}
              type="button"
            >
              Leaving
            </button>
          </div>
          <label>
            When are you traveling?
            <input type="datetime-local" value={state.planTime} onChange={(e) => onPlanTimeChange(e.target.value)} />
          </label>
        </>
      )}

      <button className="primary" onClick={onSave} disabled={isSaving} type="button">
        {created ? "Plan saved ✓" : isSaving ? "Saving…" : (
          <>
            <span className="ai-stars" aria-label="AI matching" role="img">✨</span>
            <span>Find nearby Outside Landers ✨</span>
          </>
        )}
      </button>

      {created && <p className="success">Your plan is live. We’ll show compatible fans as they appear.</p>}
    </section>
  );
}

function MatchingList({
  created,
  matches,
  direction,
  zoneLabel,
  nowText,
  onNoMatches,
  onConnect,
  connectingMatchIds,
  connectedMatchIds,
}: {
  created: boolean;
  matches: MatchingCard[] | null | undefined;
  direction: "arrival" | "departure";
  zoneLabel: string;
  nowText: string;
  onNoMatches: string;
  onConnect: (matchId: string) => void;
  connectingMatchIds: MatchConnectState;
  connectedMatchIds: MatchConnectState;
}) {
  if (!created) return null;
  const friendlyDirection = direction === "arrival" ? "Arriving" : "Leaving";

  if (!matches) {
    return (
      <section className="card match-card">
        <div className="section-heading">
          <div>
            <p className="kicker">02 · MATCHING FANS</p>
            <h2>Nearby compatibility</h2>
          </div>
          <span className="live-dot">● LIVE</span>
        </div>
        <article className="no-match">
          <small>Loading nearby candidates…</small>
        </article>
        <small className="disclaimer">Scanning for compatible fans in {zoneLabel} for {nowText}.</small>
      </section>
    );
  }

  if (matches.length === 0) {
    return (
      <section className="card match-card">
        <div className="section-heading">
          <div>
            <p className="kicker">02 · MATCHING FANS</p>
            <h2>Nearby compatibility</h2>
          </div>
          <span className="live-dot">● LIVE</span>
        </div>
        <article className="no-match">
          <small>{onNoMatches}</small>
        </article>
        <small className="disclaimer">Showing up to 0 fan matches for {nowText}.</small>
      </section>
    );
  }

  return (
    <section className="card match-card">
      <div className="section-heading">
        <div>
          <p className="kicker">02 · MATCHING FANS</p>
          <h2>Nearby compatibility</h2>
        </div>
        <span className="live-dot">● LIVE</span>
      </div>
      <div className="mobility-list match-list">
        {matches.map((fan) => {
          const tag = fan.sameGroup ? "group match"
            : fan.sameStartingPoint ? "same start"
              : fan.overlapMinutes >= 30 ? "great fit"
                : "good fit";
          const origin = fan.startingPoint?.trim();
          const isConnecting = connectingMatchIds.has(fan._id);
          const isConnected = connectedMatchIds.has(fan._id);

          return (
            <article key={fan._id}>
              <span className="icon fan-icon">{fan.sameGroup ? "✨" : "👤"}</span>
              <div>
                <b>{fan.userName}</b>
                <small>{friendlyDirection} in {zoneLabelMap[fan.locationZone] ?? fan.locationZone} · target {formatClock(fan.desiredTime)} • {fan.deltaMinutes} min</small>
                <small>
                  Overlap window: ±{fan.flexibilityMinutes} min {origin ? `· from ${origin}` : ""}
                </small>
              </div>
              <span className="tag">{tag}</span>
              <button
                className={`connect-btn ${isConnected ? "connected" : ""}`}
                onClick={() => onConnect(fan._id)}
                disabled={isConnected || isConnecting}
                type="button"
              >
                {isConnected ? "Connected" : isConnecting ? "Connecting…" : "Connect"}
              </button>
            </article>
          );
        })}
      </div>
      <small className="disclaimer">Showing up to {Math.min(matches.length, MATCH_LIMIT)} fan matches for {nowText}.</small>
    </section>
  );
}

function BackupPanel({
  zone,
  now,
}: {
  zone: string;
  now: number;
}) {
  const currentZone = zone as MockZone;
  const transit = useMemo(() => getTransitFeedForZone(currentZone, now), [currentZone, now]);
  const carpool = useMemo(() => getLatestCarpoolForZone(currentZone, now), [currentZone, now]);
  const lime = useMemo(() => getLatestLimeForZone(currentZone, now), [currentZone, now]);
  const zoneLabel = zoneLabelMap[zone] ?? "North Gate";

  const nearbyTransit = transit.slice(0, 3);

  return (
    <section className="fallback">
      <div className="section-heading">
        <div>
          <p className="kicker">03 · YOUR BACKUP PLAN</p>
          <h2>Near {zoneLabel}</h2>
        </div>
        <span className="live-dot">● LIVE</span>
      </div>
      <p className="updated">{mockMobility.updatedLabel}</p>
      <div className="mobility-list">
        {nearbyTransit.length > 0 ? nearbyTransit.map((item) => (
          <article key={`${item.route}-${item.departureAt}-${item.zone}`}>
            <span className="icon transit-icon">↗</span>
            <div><b>{item.route} · {item.name}</b><small>Next {formatMinutesFrom(item.departureAt, now)} at {formatClock(item.departureAt)} from {zoneLabel}</small></div>
            <span className="tag">{item.crowding}</span>
          </article>
        )) : (
          <article>
            <span className="icon transit-icon">↗</span>
            <div><b>Transit fallback</b><small>No synthetic departures in this window.</small></div>
            <span className="tag">est. data</span>
          </article>
        )}
        <article>
          <span className="icon car-icon">⌁</span>
          <div><b>Carpool pool</b><small>{carpool?.compatibleFans ?? 0} compatible fans · within {(carpool?.waitingMinutes ?? 0)} min</small></div>
          <span className="tag">intro only</span>
        </article>
        <article>
          <span className="icon bike-icon">◒</span>
          <div><b>Lime micromobility</b><small>{lime?.scooters ?? 0} scooters · {lime?.seatedScooters ?? 0} seated</small></div>
          <span className="tag">estimated</span>
        </article>
      </div>
      <small className="disclaimer">Hackathon fallback layer: no ride booking, payment, or vehicle reservation.</small>
      <small className="disclaimer">Fallback data points: transit {mockDataStats.transitEvents}, carpool {mockDataStats.carpoolEvents}, Lime {mockDataStats.limeEvents} from {mockDataWindow.labelStart} to {mockDataWindow.labelEnd}.</small>
    </section>
  );
}

function SeedBanner({
  seedStatus,
  onSeedNow,
  isSeeding,
}: {
  seedStatus: SeedStatus | null | undefined;
  onSeedNow: () => void;
  isSeeding: boolean;
}) {
  if (!seedStatus) {
    return null;
  }

  if (!seedStatus.seeded) {
    return (
      <section className="card seed-banner">
        <button className="seed-btn" onClick={onSeedNow} type="button" disabled={isSeeding}>
          {isSeeding ? "Populating backend data…" : "Populate backend data now"}
        </button>
      </section>
    );
  }

  return null;
}

function PlanScreen({
  usingBackend,
  state,
  created,
  collapsed,
  isSaving,
  saveError,
  matches,
  onSave,
  onEdit,
  onNameChange,
  onZoneChange,
  onDirectionChange,
  onPlanTimeChange,
  onStartingPointChange,
  onReset,
  seedStatus,
  onSeedNow,
  isSeeding,
  onConnect,
  connectingMatchIds,
  connectedMatchIds,
}: {
  usingBackend: boolean;
  state: FormPlanState;
  created: boolean;
  collapsed: boolean;
  isSaving: boolean;
  saveError?: string;
  matches: MatchingCard[] | null | undefined;
  onNameChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  onDirectionChange: (value: "arrival" | "departure") => void;
  onPlanTimeChange: (value: string) => void;
  onStartingPointChange: (value: string) => void;
  onSave: () => void;
  onEdit: () => void;
  onReset: () => void;
  seedStatus: SeedStatus | null | undefined;
  onSeedNow: () => void;
  isSeeding: boolean;
  onConnect: (matchId: string) => void;
  connectingMatchIds: MatchConnectState;
  connectedMatchIds: MatchConnectState;
}) {
  const now = Date.parse(state.planTime || "") || mockDataWindow.nowAnchor;
  const zoneLabel = zoneLabelMap[state.zone] ?? "North Gate";

  return (
    <main>
      <header><p className="eyebrow">OUTSIDE LANDS · OSL TOGETHER</p></header>
      <h1>Find your people on the way there.</h1>
      <p className="lede">A warm introduction to fans heading the same direction — with a transit fallback always in view.</p>

      <FormSection
        state={state}
        created={created}
        collapsed={collapsed}
        isSaving={isSaving}
        onNameChange={onNameChange}
        onZoneChange={onZoneChange}
        onDirectionChange={onDirectionChange}
        onPlanTimeChange={onPlanTimeChange}
        onStartingPointChange={onStartingPointChange}
        onSave={onSave}
        onEdit={onEdit}
        onReset={onReset}
      />

      {saveError && <p className="disclaimer" role="alert">{saveError}</p>}

      {usingBackend && <SeedBanner seedStatus={seedStatus} onSeedNow={onSeedNow} isSeeding={isSeeding} />}

      <MatchingList
        created={created}
        matches={created ? matches : null}
        direction={state.direction}
        zoneLabel={zoneLabel}
        nowText={formatClock(now)}
        onNoMatches={NO_MATCH_MESSAGE}
        onConnect={onConnect}
        connectingMatchIds={connectingMatchIds}
        connectedMatchIds={connectedMatchIds}
      />

      <BackupPanel zone={state.zone} now={now} />
      <footer>OSL Together <span>·</span> travel with a little more togetherness</footer>
    </main>
  );
}

function buildMatchesFromDemo(state: FormPlanState, now: number): MatchingCard[] {
  const localMatches = getCompatibleFansForPlan({
    direction: state.direction,
    locationZone: state.zone as MockZone,
    desiredTime: now,
    flexibilityMinutes: DEFAULT_FLEXIBILITY_MINUTES,
    startingPoint: state.startingPoint,
  }, MATCH_LIMIT);

  return localMatches.map((fan) => ({
    _id: fan.id,
    userName: fan.name,
    direction: fan.direction,
    desiredTime: fan.desiredTime,
    locationZone: fan.locationZone,
    flexibilityMinutes: fan.flexibilityMinutes,
    deltaMinutes: fan.deltaMinutes,
    overlapMinutes: fan.overlapMinutes,
    sameStartingPoint: Boolean(fan.sameStartingPoint),
    sameGroup: false,
    startingPoint: fan.startingPoint,
  }));
}

function buildDemoMatchesWithConnectionState(state: FormPlanState, now: number, connectedMatchIds: MatchConnectState): MatchingCard[] {
  return buildMatchesFromDemo(state, now).filter((fan) => !connectedMatchIds.has(fan._id));
}

function MockApp() {
  const [state, setState] = useState<FormPlanState>(createDefaultPlanState);
  const [created, setCreated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectedMatchIds, setConnectedMatchIds] = useState<MatchConnectState>(new Set());
  const [connectingMatchIds, setConnectingMatchIds] = useState<MatchConnectState>(new Set());

  const now = Date.parse(state.planTime || "") || mockDataWindow.nowAnchor;

  const nearbyMatches = useMemo(
    () => (created ? buildDemoMatchesWithConnectionState(state, now, connectedMatchIds) : []),
    [created, state, now, connectedMatchIds],
  );

  const resetMatchState = () => {
    if (created || collapsed) {
      setCreated(false);
      setCollapsed(false);
    }
    setConnectedMatchIds(new Set());
    setConnectingMatchIds(new Set());
  };

  const resetPlan = () => {
    setState(createDefaultPlanState());
    setCreated(false);
    setCollapsed(false);
    setConnectedMatchIds(new Set());
    setConnectingMatchIds(new Set());
  };

  const onSave = () => {
    if (isSaving) return;
    setIsSaving(true);
    setCreated(true);
    setCollapsed(true);
    setConnectedMatchIds(new Set());
    setConnectingMatchIds(new Set());
    setIsSaving(false);
  };

  const onConnect = (matchId: string) => {
    if (connectedMatchIds.has(matchId) || connectingMatchIds.has(matchId)) return;

    setConnectingMatchIds((prev) => {
      const next = new Set(prev);
      next.add(matchId);
      return next;
    });

    setConnectedMatchIds((prev) => {
      const next = new Set(prev);
      next.add(matchId);
      return next;
    });
    setConnectingMatchIds((prev) => {
      const next = new Set(prev);
      next.delete(matchId);
      return next;
    });
  };

  return (
    <PlanScreen
      usingBackend={false}
      state={state}
      created={created}
      collapsed={collapsed}
      isSaving={isSaving}
      matches={created ? nearbyMatches : null}
      onSave={onSave}
      onConnect={onConnect}
      connectingMatchIds={connectingMatchIds}
      connectedMatchIds={connectedMatchIds}
      onNameChange={(name) => {
        setState((prev) => ({ ...prev, name }));
        resetMatchState();
      }}
      onZoneChange={(zone) => {
        setState((prev) => ({ ...prev, zone }));
        resetMatchState();
      }}
      onDirectionChange={(direction) => {
        setState((prev) => ({ ...prev, direction }));
        resetMatchState();
      }}
      onPlanTimeChange={(planTime) => {
        setState((prev) => ({ ...prev, planTime }));
        resetMatchState();
      }}
      onStartingPointChange={(startingPoint) => {
        setState((prev) => ({ ...prev, startingPoint }));
        resetMatchState();
      }}
      onEdit={() => {
        setCreated(false);
        setCollapsed(false);
        setConnectedMatchIds(new Set());
        setConnectingMatchIds(new Set());
      }}
      onReset={resetPlan}
      seedStatus={undefined}
      onSeedNow={() => {}}
      isSeeding={false}
    />
  );
}

if (convexClient) {
  function ConnectedApp() {
    const [state, setState] = useState<FormPlanState>(createDefaultPlanState);
    const [created, setCreated] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [createdIntentId, setCreatedIntentId] = useState<Id<"transitIntents"> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [connectError, setConnectError] = useState("");
    const [isSeedingBackend, setIsSeedingBackend] = useState(false);
    const [didAutoSeedAttempted, setDidAutoSeedAttempted] = useState(false);
    const [connectedMatchIds, setConnectedMatchIds] = useState<MatchConnectState>(new Set());
    const [connectingMatchIds, setConnectingMatchIds] = useState<MatchConnectState>(new Set());

    const now = Date.parse(state.planTime || "") || mockDataWindow.nowAnchor;

    const seedStatus = useQuery(api.seed.seedDataStatus) as SeedStatus | null | undefined;
    const queryResult = useQuery(api.transit.matchingFansForIntent, {
      intentId: createdIntentId || undefined,
      limit: MATCH_LIMIT,
    }) as MatchingCard[] | null | undefined;
    const createPlanWithGuest = useMutation(api.transit.createPlanWithGuest);
    const seedBackend = useMutation(api.seed.seedMockBackendData);
    const proposeMatch = useMutation(api.matching.proposeMatch);

    useEffect(() => {
      if (didAutoSeedAttempted || isSeedingBackend || !seedStatus || seedStatus.seeded) {
        return;
      }
      setDidAutoSeedAttempted(true);
      setIsSeedingBackend(true);
      seedBackend({ force: false })
        .catch((error) => {
          setSaveError(
            error instanceof Error ? `Auto-seed failed: ${error.message}` : "Unable to seed backend data right now.",
          );
        })
        .finally(() => {
          setIsSeedingBackend(false);
        });
    }, [didAutoSeedAttempted, isSeedingBackend, seedStatus, seedBackend]);

    const resetMatchState = () => {
      if (created || collapsed) {
        setCreated(false);
        setCollapsed(false);
      }
      setCreatedIntentId(null);
      setConnectedMatchIds(new Set());
      setConnectingMatchIds(new Set());
      setConnectError("");
      setSaveError("");
    };

    const resetPlan = () => {
      setState(createDefaultPlanState());
      setCreated(false);
      setCollapsed(false);
      setCreatedIntentId(null);
      setConnectedMatchIds(new Set());
      setConnectingMatchIds(new Set());
      setConnectError("");
      setSaveError("");
    };

    const onSave = async () => {
      if (isSaving) return;
      setIsSaving(true);
      setSaveError("");
      const desiredTime = Date.parse(state.planTime);

      try {
        const result = await createPlanWithGuest({
          displayName: state.name.trim() || "Outside Lander",
          direction: state.direction,
          desiredTime: Number.isNaN(desiredTime) ? DEFAULT_PLAN_TIME : desiredTime,
          locationZone: state.zone,
          flexibilityMinutes: DEFAULT_FLEXIBILITY_MINUTES,
          sourceItineraryId: undefined,
          groupId: undefined,
          startingPoint: state.startingPoint.trim() || undefined,
        }) as { intentId: Id<"transitIntents"> };

        setCreatedIntentId(result?.intentId ?? null);
        setCreated(true);
        setCollapsed(true);
        setConnectedMatchIds(new Set());
        setConnectingMatchIds(new Set());
        setConnectError("");
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Unable to save plan right now. Try again.");
        setCreated(false);
        setCollapsed(false);
        setCreatedIntentId(null);
      } finally {
        setIsSaving(false);
      }
    };

    const onSeedNow = async () => {
      if (isSeedingBackend) return;
      setIsSeedingBackend(true);
      setSaveError("");
      try {
        await seedBackend({ force: false });
      } catch (error) {
        setSaveError(error instanceof Error ? `Manual seed failed: ${error.message}` : "Unable to seed backend data right now.");
      } finally {
        setIsSeedingBackend(false);
      }
    };

    const matches = createdIntentId ? queryResult : null;
    const activeMatches = useMemo(() => {
      if (!matches) return null;
      return matches.filter((match) => !connectedMatchIds.has(match._id));
    }, [matches, connectedMatchIds]);

    const onConnect = async (matchId: string) => {
      if (!createdIntentId || connectingMatchIds.has(matchId) || connectedMatchIds.has(matchId)) return;

      setConnectError("");
      setConnectingMatchIds((prev) => {
        const next = new Set(prev);
        next.add(matchId);
        return next;
      });

      try {
        await proposeMatch({
          firstIntentId: createdIntentId,
          secondIntentId: matchId as Id<"transitIntents">,
          blurb: "You matched in OSL Together! Hi and coordinate your route.",
        });
        setConnectedMatchIds((prev) => {
          const next = new Set(prev);
          next.add(matchId);
          return next;
        });
      } catch (error) {
        setConnectError(error instanceof Error ? error.message : "Unable to connect with this fan right now.");
      } finally {
        setConnectingMatchIds((prev) => {
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
      }
    };

    return (
      <PlanScreen
        usingBackend={true}
        state={state}
        created={created}
        collapsed={collapsed}
        isSaving={isSaving}
        saveError={connectError ? `${saveError ? `${saveError} ` : ""}${connectError}`.trim() : saveError}
        matches={created ? activeMatches : null}
        onSave={onSave}
        onConnect={onConnect}
        connectingMatchIds={connectingMatchIds}
        connectedMatchIds={connectedMatchIds}
        onReset={resetPlan}
        onEdit={() => {
          setCreated(false);
          setCollapsed(false);
          setCreatedIntentId(null);
          setConnectedMatchIds(new Set());
          setConnectingMatchIds(new Set());
          setConnectError("");
        }}
        onNameChange={(name) => {
          setState((prev) => ({ ...prev, name }));
          resetMatchState();
        }}
        onZoneChange={(zone) => {
          setState((prev) => ({ ...prev, zone }));
          resetMatchState();
        }}
        onDirectionChange={(direction) => {
          setState((prev) => ({ ...prev, direction }));
          resetMatchState();
        }}
        onPlanTimeChange={(planTime) => {
          setState((prev) => ({ ...prev, planTime }));
          resetMatchState();
        }}
        onStartingPointChange={(startingPoint) => {
          setState((prev) => ({ ...prev, startingPoint }));
          resetMatchState();
        }}
        seedStatus={seedStatus}
        onSeedNow={onSeedNow}
        isSeeding={isSeedingBackend}
      />
    );
}

  createRoot(document.getElementById("root")!).render(
    <ConvexProvider client={convexClient}>
      <ConnectedApp />
    </ConvexProvider>,
  );
} else {
  createRoot(document.getElementById("root")!).render(<MockApp />);
}
