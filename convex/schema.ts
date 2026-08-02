import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const locationZones = ["north_gate", "south_gate", "music_meadow", "hellman_hollow", "lands_end", "panhandle"] as const;
export const zoneLabels: Record<(typeof locationZones)[number], string> = {
  north_gate: "North Gate", south_gate: "South Gate", music_meadow: "Music Meadow",
  hellman_hollow: "Hellman Hollow", lands_end: "Lands End", panhandle: "Panhandle",
};

export default defineSchema({
  users: defineTable({
    displayName: v.string(),
    authType: v.union(v.literal("spotify"), v.literal("quiz"), v.literal("guest")),
    contactHandle: v.optional(v.string()),
    spotifyProfile: v.optional(v.object({
      handle: v.optional(v.string()),
      topArtists: v.optional(v.array(v.string())),
      topGenres: v.optional(v.array(v.string())),
      topTracks: v.optional(v.array(v.string())),
      source: v.optional(v.string()),
    })),
  }),
  transitIntents: defineTable({
    userId: v.id("users"), direction: v.union(v.literal("arrival"), v.literal("departure")), desiredTime: v.number(), locationZone: v.string(), flexibilityMinutes: v.number(), tier: v.union(v.literal("week"), v.literal("day"), v.literal("hours"), v.literal("urgent")), manualUrgentOverride: v.boolean(), status: v.union(v.literal("pending"), v.literal("matched"), v.literal("expired")), sourceItineraryId: v.optional(v.string()), groupId: v.optional(v.string()),
    // Placeholder-only user context for carpool/transit matching UX; not yet normalized.
    startingPoint: v.optional(v.string()),
  }).index("by_status_direction_tier", ["status", "direction", "tier"]).index("by_user", ["userId"]),
  transitMatches: defineTable({ blurb: v.string(), status: v.union(v.literal("proposed"), v.literal("confirmed"), v.literal("declined")) }),
  transitMatchMembers: defineTable({ matchId: v.id("transitMatches"), intentId: v.id("transitIntents") }).index("by_match", ["matchId"]).index("by_intent", ["intentId"]),
  transitFallbackCache: defineTable({ routeId: v.string(), stopId: v.string(), nextArrivals: v.array(v.number()), fetchedAt: v.number() }).index("by_stop", ["stopId"]),

  // --- Challenge 01 add-on: Jambase-powered EPK generator (separate feature, own tables) ---
  epkRequests: defineTable({
    artistName: v.string(), status: v.union(v.literal("ready"), v.literal("error")),
    touringHistorySummary: v.optional(v.string()), generatedBio: v.optional(v.string()), generatedPitch: v.optional(v.string()),
    usedRealJambaseData: v.optional(v.boolean()), errorMessage: v.optional(v.string()), createdAt: v.number(),
  }).index("by_created", ["createdAt"]),
});
