import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const SPOTIFY_PROFILE_ARG = v.optional(v.object({
  handle: v.optional(v.string()),
  topArtists: v.optional(v.array(v.string())),
  topGenres: v.optional(v.array(v.string())),
  topTracks: v.optional(v.array(v.string())),
  source: v.optional(v.string()),
}));

export function computeTier(desiredTime: number, now = Date.now(), manual = false) {
  if (manual || desiredTime - now < 30 * 60_000) return "urgent" as const;
  if (desiredTime - now < 4 * 60 * 60_000) return "hours" as const;
  if (desiredTime - now <= 48 * 60 * 60_000) return "day" as const;
  return "week" as const;
}

export function compatible(a: {direction:string; desiredTime:number; flexibilityMinutes:number; locationZone:string}, b: typeof a) {
  return a.direction === b.direction && a.locationZone === b.locationZone &&
    Math.max(a.desiredTime - a.flexibilityMinutes * 60_000, b.desiredTime - b.flexibilityMinutes * 60_000) <=
    Math.min(a.desiredTime + a.flexibilityMinutes * 60_000, b.desiredTime + b.flexibilityMinutes * 60_000);
}

type SpotifyProfile = {
  handle?: string;
  topArtists?: string[];
  topGenres?: string[];
  topTracks?: string[];
  source?: string;
};

type SpotifyMatchSignal = {
  overlapArtists: string[];
  overlapGenres: string[];
  score: number;
  label: "music match" | "strong music match" | "no music match";
};

const normalizeSpotifyList = (values?: string[] | null) => {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => item?.toLowerCase().trim())
    .filter(Boolean);
};

function computeSpotifyMatch(currentProfile?: SpotifyProfile | null, candidateProfile?: SpotifyProfile | null): SpotifyMatchSignal {
  const currentArtists = normalizeSpotifyList(currentProfile?.topArtists);
  const candidateArtists = normalizeSpotifyList(candidateProfile?.topArtists);
  const currentGenres = normalizeSpotifyList(currentProfile?.topGenres);
  const candidateGenres = normalizeSpotifyList(candidateProfile?.topGenres);

  if (currentArtists.length === 0 || candidateArtists.length === 0) {
    return { overlapArtists: [], overlapGenres: [], score: 0, label: "no music match" };
  }

  const overlapArtists = currentArtists.filter((artist) => candidateArtists.includes(artist));
  const overlapGenres = currentGenres.filter((genre) => candidateGenres.includes(genre));
  const score = Math.min(100, overlapArtists.length * 22 + overlapGenres.length * 8);

  const hasStrongArtistOverlap = overlapArtists.length >= 2;
  const hasSomeOverlap = overlapArtists.length >= 1 || overlapGenres.length >= 1;

  return {
    overlapArtists,
    overlapGenres,
    score,
    label: hasStrongArtistOverlap ? "strong music match" : hasSomeOverlap ? "music match" : "no music match",
  };
}

const FAN_NAME_FALLBACKS = [
  "Avery Stone",
  "Maya Collins",
  "Jordan Kim",
  "Noah Rivera",
  "Priya Shah",
  "Ethan Brooks",
  "Lena Patel",
  "Carlos Ruiz",
  "Nina Torres",
  "Oliver Hale",
  "Sofia Morales",
  "Kai Chen",
  "Grace Kim",
  "Daniel Ortiz",
  "Arihant Mehta",
  "Emma Brooks",
  "Liam Carter",
  "Isabella Ross",
  "Noah Bennett",
  "Ava Johnson",
  "Lucas Nguyen",
  "Mila Rossi",
  "Eli Chen",
  "Jasmine Patel",
  "Mateo Diaz",
  "Olivia Grant",
  "Noah Santiago",
  "Aria Bell",
  "Leo Martinez",
  "Sara Kim",
  "Nora Whitman",
  "Ibrahim Yusuf",
  "Chloe Bennett",
  "Owen Park",
  "Ivy Brooks",
  "Mina Delgado",
  "Yousef Farah",
  "Harper Quinn",
  "Rafael Diaz",
  "Zoe Carter",
  "Amelia Foster",
  "Ethan Wong",
  "Santiago Cruz",
  "Nadia Khan",
  "Mia Sanders",
  "Theo Morgan",
  "Luca Bellini",
  "Noel Thompson",
  "Isobel Wright",
  "Julian Price",
  "Anika Bose",
  "Seth Kim",
  "Leila Garcia",
];

const OSL_LINEUP_ARTISTS = [
  "Charli XCX",
  "RÜFÜS DU SOL",
  "The Strokes",
  "The xx",
  "Baby Keem",
  "Turnstile",
  "Subtronics",
  "GRiZ",
  "Djo",
  "Labrinth",
  "Empire Of The Sun",
  "PinkPantheress",
  "Dijon",
  "Disco Lines",
  "Death Cab for Cutie",
  "GloRilla",
  "Ethel Cain",
  "Geese",
  "Mariah the Scientist",
  "Modest Mouse",
  "Not for Radio",
  "Clipse",
  "Lucy Dacus",
  "Wet Leg",
  "it's murph",
  "Sierra Ferrell",
  "Malcolm Todd",
  "Lane 8",
  "Snow Strippers",
  "Boris Brejcha",
  "Odd Mob",
  "OMNOM",
  "Tinashe",
  "Audrey Hobert",
  "Ben Böhmer",
  "JADE",
  "The Temper Trap",
  "The Story So Far",
  "kwn",
  "¥ØU$UK€ ¥UK1MAT$U",
  "KI/KI",
  "DJ Trixie Mattel",
  "Łaszewo",
  "Sienna Spiro",
  "DESTIN CONRAD",
  "Boys Noize",
  "Durand Bernarr",
  "Kingfishr",
  "ALLEYCVT",
  "Balu Brigada",
  "Sultan + Shepard",
  "Frost Children",
  "Miss Monique",
  "Die Spitz",
  "Carlita",
  "MPH",
  "Silvana Estrada",
  "Momma",
  "Dylan Brady",
  "Goldie Boutilier",
  "Haute & Freddy",
  "Grace Ives",
  "Kerala Dust",
  "tobiahs",
  "Wunderhorse",
  "Amble",
  "Sports",
  "Yard Act",
  "Faouzia",
  "Infinity Song",
  "Billie Marten",
  "Marlon Funaki",
  "SF Gay Men's Chorus",
  "camoufly",
  "Night Tapes",
  "Bandalos Chinos",
  "X CLUB.",
  "Luke Alessi",
  "After",
  "Bad Nerves",
  "Chezile",
  "RIO KOSTA",
  "sosocamo",
  "Automatic",
  "Sawyer Hill",
  "1-800 GIRLS",
  "NEZZA",
  "Magnus Ferrell",
  "Red Leather",
  "Racing Mount Pleasant",
  "Day We Ran",
  "Ally Evenson",
  "Etari",
  "Britton",
  "Cruz Beckham",
  "RYMAN",
  "Dani Satin and Always Hallways",
  "Vertigo",
  "bad juuju",
];

const OSL_GENRES = [
  "indie rock",
  "electronic",
  "hip hop",
  "r&b",
  "house",
  "indie pop",
  "alt rock",
  "synth pop",
  "folk rock",
  "punk",
  "dance",
  "ambient",
  "chill",
  "experimental",
  "electropop",
  "soul",
  "psychedelic",
];

const SPOTIFY_TOP_ARTIST_COUNT = 10;
const SPOTIFY_TOP_GENRE_COUNT = 4;
const SPOTIFY_LINEUP_DAY_BUCKET_SIZE = 8;
const SPOTIFY_JAMES_BOND_ARTISTS_PER_DAY = 5;

const createSeededRng = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const pickUnique = (input: string[], count: number, rng: () => number) => {
  const pool = [...input];
  const result: string[] = [];
  while (result.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
};

const buildJamesBondProfileArtists = () => {
  const artists: string[] = [];
  const totalBuckets = Math.max(1, Math.ceil(OSL_LINEUP_ARTISTS.length / SPOTIFY_LINEUP_DAY_BUCKET_SIZE));

  for (let dayOffset = 0; dayOffset < totalBuckets; dayOffset++) {
    const bucketStart = dayOffset * SPOTIFY_LINEUP_DAY_BUCKET_SIZE;
    const bucket = OSL_LINEUP_ARTISTS.slice(bucketStart, bucketStart + SPOTIFY_LINEUP_DAY_BUCKET_SIZE);
    artists.push(...bucket.slice(0, Math.min(SPOTIFY_JAMES_BOND_ARTISTS_PER_DAY, bucket.length)));
  }

  return artists;
};

const buildJamesBondProfile = (): SpotifyProfile => {
  const topArtists = buildJamesBondProfileArtists();
  return {
    handle: "@james_bond",
    topArtists,
    topGenres: OSL_GENRES.slice(0, SPOTIFY_TOP_GENRE_COUNT),
    topTracks: topArtists.slice(0, SPOTIFY_TOP_ARTIST_COUNT).map((artist) => `${artist} live`),
    source: "mockJamesBondSeed",
  };
};

const isJamesBondProfileName = (displayName: string) => displayName.toLowerCase().trim() === "james bond";

const buildFallbackSpotifyProfile = (displayName: string) => {
  if (isJamesBondProfileName(displayName)) {
    return buildJamesBondProfile();
  }

  const normalizedName = displayName.toLowerCase().trim();
  const normalizedSeed = hashString(normalizedName);
  const rng = createSeededRng(normalizedSeed + 20260902);

  const sharedArtists = pickUnique(
    OSL_LINEUP_ARTISTS.slice(0, SPOTIFY_TOP_ARTIST_COUNT),
    Math.min(3, SPOTIFY_TOP_ARTIST_COUNT),
    rng,
  );
  const remainingPool = OSL_LINEUP_ARTISTS.filter((artist) => !sharedArtists.includes(artist));
  const topArtists = [...sharedArtists, ...pickUnique(remainingPool, SPOTIFY_TOP_ARTIST_COUNT - sharedArtists.length, rng)];

  return {
    handle: `@${normalizedSeed.toString(36).slice(-10) || "outside_fan"}`,
    topArtists,
    topGenres: pickUnique(OSL_GENRES, SPOTIFY_TOP_GENRE_COUNT, rng),
    topTracks: topArtists.slice(0, SPOTIFY_TOP_ARTIST_COUNT).map((artist) => `${artist} highlight`),
    source: "nameFallback",
  };
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const isLegacyDisplayName = (value: string | undefined | null) => {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed === "" || trimmed === "outside lander" || /^demo fan/.test(trimmed) || /^guest fan/.test(trimmed);
};

const fallbackFanName = (intentId: string, displayName?: string | null) => {
  if (!isLegacyDisplayName(displayName)) {
    return displayName ?? "Outside Lander";
  }

  let hash = 0;
  for (let i = 0; i < intentId.length; i++) {
    hash = (hash * 31 + intentId.charCodeAt(i)) >>> 0;
  }
  return FAN_NAME_FALLBACKS[hash % FAN_NAME_FALLBACKS.length];
};

function normalizeStartingPoint(value?: string) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized === "" ? undefined : normalized;
}

export const createGuest = mutation({
  args: { displayName: v.string(), spotifyProfile: SPOTIFY_PROFILE_ARG },
  handler: async (ctx, args) => {
    const spotifyProfile = args.spotifyProfile ?? buildFallbackSpotifyProfile(args.displayName);
    return ctx.db.insert("users", { displayName: args.displayName, authType: "guest", spotifyProfile });
  },
});
export const createIntent = mutation({ args: { userId: v.id("users"), direction: v.union(v.literal("arrival"), v.literal("departure")), desiredTime: v.number(), locationZone: v.string(), flexibilityMinutes: v.number(), sourceItineraryId: v.optional(v.string()), groupId: v.optional(v.string()), startingPoint: v.optional(v.string()) }, handler: async (ctx, args) => ctx.db.insert("transitIntents", { ...args, tier: computeTier(args.desiredTime), manualUrgentOverride: false, status: "pending" }) });
export const createPlanWithGuest = mutation({
  args: {
    displayName: v.string(),
    direction: v.union(v.literal("arrival"), v.literal("departure")),
    desiredTime: v.number(),
    locationZone: v.string(),
    flexibilityMinutes: v.number(),
    sourceItineraryId: v.optional(v.string()),
    groupId: v.optional(v.string()),
    startingPoint: v.optional(v.string()),
    spotifyProfile: SPOTIFY_PROFILE_ARG,
  },
  handler: async (ctx, args) => {
    const spotifyProfile = args.spotifyProfile ?? buildFallbackSpotifyProfile(args.displayName);
    const userId = await ctx.db.insert("users", {
      displayName: args.displayName,
      authType: "guest",
      spotifyProfile,
    });
    const intentId = await ctx.db.insert("transitIntents", {
      userId,
      direction: args.direction,
      desiredTime: args.desiredTime,
      locationZone: args.locationZone,
      flexibilityMinutes: args.flexibilityMinutes,
      sourceItineraryId: args.sourceItineraryId,
      groupId: args.groupId,
      startingPoint: args.startingPoint,
      tier: computeTier(args.desiredTime),
      manualUrgentOverride: false,
      status: "pending",
    });
    return { userId, intentId };
  },
});
export const updateIntentUrgent = mutation({ args: { intentId: v.id("transitIntents") }, handler: async (ctx, { intentId }) => { await ctx.db.patch(intentId, { manualUrgentOverride: true, tier: "urgent" }); } });
export const pendingForUser = query({ args: { userId: v.id("users") }, handler: async (ctx, { userId }) => ctx.db.query("transitIntents").withIndex("by_user", q => q.eq("userId", userId)).collect() });
export const candidates = query({ args: { intentId: v.id("transitIntents") }, handler: async (ctx, { intentId }) => { const current = await ctx.db.get(intentId); if (!current) return []; const all = await ctx.db.query("transitIntents").withIndex("by_status_direction_tier", q => q.eq("status", "pending").eq("direction", current.direction)).collect(); return all.filter(other => other._id !== intentId && compatible(current, other)); } });

const MATCH_LIMIT_MAX = 25;
function overlapMinutes(a: { desiredTime: number; flexibilityMinutes: number }, b: { desiredTime: number; flexibilityMinutes: number }) {
  return Math.min(a.desiredTime + a.flexibilityMinutes * 60_000, b.desiredTime + b.flexibilityMinutes * 60_000) -
    Math.max(a.desiredTime - a.flexibilityMinutes * 60_000, b.desiredTime - b.flexibilityMinutes * 60_000);
}

export const matchingFansForIntent = query({
  args: { intentId: v.optional(v.id("transitIntents")), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!args.intentId) return [];

    const current = await ctx.db.get(args.intentId);
    if (!current) return [];

    const currentUser = current.userId ? await ctx.db.get(current.userId) : null;
    const currentSpotifyProfile = (currentUser?.spotifyProfile as SpotifyProfile | undefined) ?? null;

    const allCandidates = await ctx.db.query("transitIntents").withIndex("by_status_direction_tier", (q) =>
      q.eq("status", "pending").eq("direction", current.direction),
    ).collect();

    const filtered = allCandidates
      .filter((candidate) => candidate._id !== args.intentId)
      .filter((candidate) => compatible(current, candidate))
      .filter((candidate) => candidate.status === "pending");

    const currentStartingPoint = normalizeStartingPoint(current.startingPoint);

    const withNames = await Promise.all(filtered.map(async (candidate) => {
      const user = candidate.userId ? await ctx.db.get(candidate.userId) : null;
      const spotifyMatch = computeSpotifyMatch(currentSpotifyProfile, (user?.spotifyProfile as SpotifyProfile | undefined) ?? null);
      const userName = fallbackFanName(candidate._id, user?.displayName);
      const deltaMinutes = Math.max(0, Math.round(Math.abs(candidate.desiredTime - current.desiredTime) / 60_000));
      const overlap = overlapMinutes(current, candidate);
      const candidateStart = normalizeStartingPoint(candidate.startingPoint);
      const sameStartingPoint = currentStartingPoint !== undefined && currentStartingPoint === candidateStart;
      return {
        _id: candidate._id,
        userName,
        startingPoint: candidate.startingPoint,
        direction: candidate.direction,
        desiredTime: candidate.desiredTime,
        locationZone: candidate.locationZone,
        flexibilityMinutes: candidate.flexibilityMinutes,
        deltaMinutes,
        overlapMinutes: Math.max(0, Math.round(overlap / 60_000)),
        sameStartingPoint,
        sameGroup: Boolean(current.groupId && candidate.groupId && current.groupId === candidate.groupId),
        spotifyMatch,
      };
    }));

    return withNames
      .sort((a, b) => {
        if (a.sameGroup !== b.sameGroup) return a.sameGroup ? -1 : 1;
        if (a.sameStartingPoint !== b.sameStartingPoint) return a.sameStartingPoint ? -1 : 1;
        if (a.spotifyMatch.score !== b.spotifyMatch.score) return b.spotifyMatch.score - a.spotifyMatch.score;
        if (a.deltaMinutes !== b.deltaMinutes) return a.deltaMinutes - b.deltaMinutes;
        return b.overlapMinutes - a.overlapMinutes;
      })
      .slice(0, Math.min(MATCH_LIMIT_MAX, args.limit ?? MATCH_LIMIT_MAX));
  },
});
