type CrowdLevel = "light" | "moderate" | "heavy";

export const mockZones = [
  ["north_gate", "North Gate"],
  ["south_gate", "South Gate"],
  ["music_meadow", "Music Meadow"],
  ["hellman_hollow", "Hellman Hollow"],
  ["lands_end", "Lands End"],
  ["panhandle", "Panhandle"],
] as const;

export type MockZone = (typeof mockZones)[number][0];

type TransitEvent = {
  route: string;
  name: string;
  zone: MockZone;
  departureAt: number;
  crowding: CrowdLevel;
};

type CarpoolEvent = {
  zone: MockZone;
  checkedAt: number;
  waitingMinutes: number;
  compatibleFans: number;
};

type LimeEvent = {
  zone: MockZone;
  checkedAt: number;
  scooters: number;
  seatedScooters: number;
};

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const FESTIVAL_START = Date.parse("2026-08-02T00:00:00-07:00");
const FESTIVAL_END = Date.parse("2026-09-13T23:59:00-07:00");
const DEMO_NOW = Date.parse("2026-08-02T12:00:00-07:00");
const DAYS = Math.floor((FESTIVAL_END - FESTIVAL_START) / DAY_MS) + 1;

const zoneRouteGrid: Record<MockZone, Array<{ route: string; name: string }>> = {
  north_gate: [
    { route: "5R", name: "Fulton Rapid" },
    { route: "N", name: "Judah Streetcar" },
    { route: "N-OWL", name: "Owl Service" },
  ],
  south_gate: [
    { route: "44", name: "O'Shaughnessy" },
    { route: "19", name: "Polk Street" },
    { route: "N", name: "Judah" },
  ],
  music_meadow: [
    { route: "N", name: "Judah Express" },
    { route: "MUNI-M", name: "Market Metro" },
    { route: "L", name: "L Taraval" },
  ],
  hellman_hollow: [
    { route: "N", name: "Judah" },
    { route: "38", name: "Geary Rapid" },
    { route: "5R", name: "Fulton Bridge" },
  ],
  lands_end: [
    { route: "38", name: "Geary Bridge" },
    { route: "1", name: "California" },
    { route: "38L", name: "Lands End Loop" },
  ],
  panhandle: [
    { route: "5", name: "Arroyo" },
    { route: "44", name: "Mendell" },
    { route: "J", name: "Judah Shuttle" },
  ],
};

const createRng = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const crowdingFromRandom = (value: number): CrowdLevel => {
  if (value < 0.33) return "light";
  if (value < 0.68) return "moderate";
  return "heavy";
};

function generateTransitEvents() {
  const rng = createRng(20260902);
  const hours = [6, 8, 10, 12, 15, 17, 19];
  const events: TransitEvent[] = [];

  for (let day = 0; day < DAYS; day++) {
    const dayStart = FESTIVAL_START + day * DAY_MS;
    const zoneList = Object.keys(zoneRouteGrid) as MockZone[];

    for (const zone of zoneList) {
      const routes = zoneRouteGrid[zone];
      for (let routeIndex = 0; routeIndex < routes.length; routeIndex++) {
        const route = routes[routeIndex];
        for (const hour of hours) {
          const baseTime = dayStart + hour * HOUR_MS;
          const jitter = Math.floor(rng() * 18) * MINUTE_MS;
          events.push({
            route: route.route,
            name: route.name,
            zone,
            departureAt: baseTime + jitter,
            crowding: crowdingFromRandom(rng()),
          });
        }
      }
    }
  }

  return events.sort((a, b) => a.departureAt - b.departureAt);
}

function generateCarpoolEvents() {
  const rng = createRng(20260913);
  const hours = [8, 12, 16, 20];
  const events: CarpoolEvent[] = [];

  for (let day = 0; day < DAYS; day++) {
    const dayStart = FESTIVAL_START + day * DAY_MS;
    for (const [zone] of mockZones) {
      for (let i = 0; i < hours.length; i++) {
        const checkedAt = dayStart + hours[i] * HOUR_MS + Math.floor(rng() * 30) * MINUTE_MS;
        events.push({
          zone,
          checkedAt,
          waitingMinutes: 2 + Math.floor(rng() * 35),
          compatibleFans: 1 + Math.floor(rng() * 12),
        });
      }
    }
  }
  return events.sort((a, b) => a.checkedAt - b.checkedAt);
}

function generateLimeEvents() {
  const rng = createRng(20260619);
  const hours = [7, 11, 15, 18, 21];
  const events: LimeEvent[] = [];

  for (let day = 0; day < DAYS; day++) {
    const dayStart = FESTIVAL_START + day * DAY_MS;
    for (const [zone] of mockZones) {
      for (let i = 0; i < hours.length; i++) {
        const checkedAt = dayStart + hours[i] * HOUR_MS + Math.floor(rng() * 25) * MINUTE_MS;
        events.push({
          zone,
          checkedAt,
          scooters: 2 + Math.floor(rng() * 15),
          seatedScooters: Math.floor(rng() * 4),
        });
      }
    }
  }
  return events.sort((a, b) => a.checkedAt - b.checkedAt);
}

export const mockTransitEvents = generateTransitEvents();
export const mockCarpoolEvents = generateCarpoolEvents();
export const mockLimeEvents = generateLimeEvents();

const shortDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Los_Angeles",
});

const clockTime = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

export const mockDataWindow = {
  start: FESTIVAL_START,
  end: FESTIVAL_END,
  labelStart: shortDate.format(new Date(FESTIVAL_START)),
  labelEnd: shortDate.format(new Date(FESTIVAL_END)),
  nowAnchor: DEMO_NOW,
} as const;

export const mockMobility = {
  updatedLabel: `Festival-ready mock feed: ${shortDate.format(new Date(FESTIVAL_START))} to ${shortDate.format(new Date(FESTIVAL_END))}`,
  transit: mockTransitEvents,
  carpool: mockCarpoolEvents,
  lime: mockLimeEvents,
};

export const mockDataStats = {
  transitEvents: mockTransitEvents.length,
  carpoolEvents: mockCarpoolEvents.length,
  limeEvents: mockLimeEvents.length,
} as const;

export const mockDataNotes = {
  source:
    "GTFS-RT shape guidance from 511.org open-data transit catalog and SFMTA rider references; mocked locally for speed.",
  transitStatus: "Estimated mock departures from now through OSL dates.",
  micromobilityStatus: "Mocked Lime/vehicle availability for demo safety.",
  zonePolicy: "Fixed 5-8 zones for Golden Gate Park, fixed to app schema (optional strings only).",
} as const;

export const getTransitFeedForZone = (zone: MockZone, atMs = DEMO_NOW) => {
  return mockTransitEvents
    .filter((event) => event.zone === zone && event.departureAt >= atMs)
    .slice(0, 8);
};

export const getLatestCarpoolForZone = (zone: MockZone, atMs = DEMO_NOW) => {
  const candidates = mockCarpoolEvents.filter((event) => event.zone === zone && event.checkedAt <= atMs);
  return candidates[candidates.length - 1];
};

export const getLatestLimeForZone = (zone: MockZone, atMs = DEMO_NOW) => {
  const candidates = mockLimeEvents.filter((event) => event.zone === zone && event.checkedAt <= atMs);
  return candidates[candidates.length - 1];
};

export const formatMinutesFrom = (reference: number, atMs = DEMO_NOW) => {
  const minutes = Math.max(0, Math.round((reference - atMs) / MINUTE_MS));
  return `${minutes} min`;
};

export const formatClock = (timeMs: number) => {
  return clockTime.format(new Date(timeMs));
};
