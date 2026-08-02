// Demo fixture based on the shape of real SF mobility data, not live availability.
// Transit source shape: https://511.org/open-data/transit (GTFS-RT / StopMonitoring;
// token required). Rider-facing reference: https://www.sfmta.com/nextmuni-real-time-information.
// Park access context: https://sfrecpark.org/1159/Getting-to-Golden-Gate-Park.
export const mockDataNotes = {
  source: "511.org + SFMTA NextMuni reference shape",
  transitStatus: "estimated demo arrivals",
  micromobilityStatus: "mocked Lime scooter availability; not a live Lime API",
} as const;
export const mockMobility = {
  updatedLabel: "Updated just now · demo data",
  transit: [
    { route: "5R", name: "Fulton Rapid", zone: "north_gate", arrivals: [8, 23, 38], crowding: "moderate" },
    { route: "44", name: "O'Shaughnessy", zone: "south_gate", arrivals: [12, 27, 42], crowding: "light" },
    { route: "N", name: "Judah", zone: "music_meadow", arrivals: [6, 21, 36], crowding: "moderate" },
  ],
  carpool: [
    { zone: "north_gate", waiting: 3, timeLabel: "within 15 min" },
    { zone: "music_meadow", waiting: 2, timeLabel: "within 30 min" },
    { zone: "south_gate", waiting: 1, timeLabel: "within 30 min" },
  ],
  lime: [
    { zone: "north_gate", scooters: 7, seatedScooters: 2 },
    { zone: "music_meadow", scooters: 5, seatedScooters: 1 },
    { zone: "south_gate", scooters: 4, seatedScooters: 1 },
  ],
} as const;

export const mockZones = [
  ["north_gate", "North Gate"], ["south_gate", "South Gate"],
  ["music_meadow", "Music Meadow"], ["hellman_hollow", "Hellman Hollow"],
  ["lands_end", "Lands End"], ["panhandle", "Panhandle"],
] as const;
