import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { computeTier } from "./transit";

const DAYS = ["north_gate", "south_gate", "music_meadow", "hellman_hollow", "lands_end", "panhandle"] as const;
const FESTIVAL_START = Date.parse("2026-08-02T00:00:00-07:00");
const FESTIVAL_END = Date.parse("2026-09-13T23:59:00-07:00");
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const STARTING_POINT_BY_ZONE: Record<string, string[]> = {
  north_gate: ["501 Folsom St, San Francisco, CA 94105", "North Gate Station entry", "Stadium Drive lot", "Haight-Balboa stop", "Panhandle parking lot"],
  south_gate: ["501 Folsom St, San Francisco, CA 94105", "South Gate Plaza", "Lombard St stop", "Lower Grove parking lot", "Sloat Blvd pickup"],
  music_meadow: ["501 Folsom St, San Francisco, CA 94105", "Music Meadow entrance", "Arguello MUNI stop", "Golden Gate Club lot", "John F Kennedy stop"],
  hellman_hollow: ["501 Folsom St, San Francisco, CA 94105", "Hellman Hollow stage gate", "Johnston Ave stop", "Main parking lot", "Sunset/Geary stop"],
  lands_end: ["501 Folsom St, San Francisco, CA 94105", "Lands End loop stop", "Lincoln Way stop", "Ocean Beach lot", "Sloat Blvd stop"],
  panhandle: ["501 Folsom St, San Francisco, CA 94105", "Panhandle picnic field", "Geary/36th stop", "Parking gate lane", "Carl Street lot"],
};
const REAL_NAMES = [
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
const DIRECTIONS = ["arrival", "departure"] as const;
const SCHEDULE_HOURS = [7, 10, 14, 18, 20] as const;

const isAfterFestival = (ms: number) => ms > FESTIVAL_END - 60_000;

export const seedSyntheticDemoIntents = mutation({
  args: {},
  handler: async (ctx) => {
    const now = FESTIVAL_START;
    let insertedIntents = 0;
    const users = [];
    let createdCount = 0;

    for (let dayOffset = 0; ; dayOffset++) {
      const dayStart = FESTIVAL_START + dayOffset * DAY_MS;
      if (dayStart > FESTIVAL_END) break;

      for (const zone of DAYS) {
        const zoneIndex = DAYS.indexOf(zone);
        for (const direction of DIRECTIONS) {
          for (let slotIndex = 0; slotIndex < SCHEDULE_HOURS.length; slotIndex++) {
            const baseTime = dayStart + SCHEDULE_HOURS[slotIndex] * HOUR_MS;
            const jitter = ((slotIndex * 13 + zoneIndex * 7 + dayOffset * 3) % 30) * MINUTE_MS;
            const desired = baseTime + jitter;
            if (isAfterFestival(desired)) continue;

            users.push(await ctx.db.insert("users", { displayName: REAL_NAMES[insertedIntents % REAL_NAMES.length], authType: "guest" }));
            const flexibilityMinutes = 40 + (slotIndex * 5 + zoneIndex * 3) % 25;
            const manualUrgentOverride = createdCount % 83 === 0;

            await ctx.db.insert("transitIntents", {
              userId: users[users.length - 1],
              direction,
              desiredTime: desired,
              locationZone: zone,
              flexibilityMinutes,
              startingPoint: STARTING_POINT_BY_ZONE[zone][insertedIntents % STARTING_POINT_BY_ZONE[zone].length],
              tier: computeTier(desired, now),
              manualUrgentOverride,
              status: "pending",
              groupId: createdCount < 2 ? "demo-group" : undefined,
            });

            insertedIntents += 1;
            createdCount += 1;
          }

        }
      }
    }

    return { users: users.length, intents: insertedIntents, windowStart: FESTIVAL_START, windowEnd: FESTIVAL_END };
  },
});

const createRng = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const dayCount = Math.floor((FESTIVAL_END - FESTIVAL_START) / DAY_MS) + 1;
const ROUTE_SEEDS = [
  { stopId: "north_gate", routeId: "5R", name: "Fulton Rapid", scheduleHours: [6, 8, 10, 12, 15, 17, 19] },
  { stopId: "north_gate", routeId: "N-OWL", name: "Judah Owl", scheduleHours: [9, 11, 14, 16, 19, 22] },
  { stopId: "south_gate", routeId: "44", name: "O'Shaughnessy", scheduleHours: [7, 9, 11, 13, 16, 18] },
  { stopId: "south_gate", routeId: "19", name: "Polk", scheduleHours: [6, 10, 12, 15, 20] },
  { stopId: "music_meadow", routeId: "N", name: "Judah", scheduleHours: [6, 9, 12, 14, 16, 20, 22] },
  { stopId: "music_meadow", routeId: "L", name: "L Taraval", scheduleHours: [8, 11, 13, 17, 20] },
  { stopId: "hellman_hollow", routeId: "38", name: "Geary", scheduleHours: [7, 10, 13, 17, 21] },
  { stopId: "hellman_hollow", routeId: "5R", name: "Fulton Loop", scheduleHours: [9, 12, 15, 18, 21] },
  { stopId: "lands_end", routeId: "38L", name: "Lands End Loop", scheduleHours: [8, 11, 13, 16, 19] },
  { stopId: "lands_end", routeId: "1", name: "California", scheduleHours: [6, 9, 12, 15, 18, 22] },
  { stopId: "panhandle", routeId: "5", name: "Arroyo", scheduleHours: [6, 9, 11, 14, 18, 20] },
  { stopId: "panhandle", routeId: "J", name: "Judah Shuttle", scheduleHours: [7, 10, 13, 16, 21] },
] as const;

const BACKUP_STOPS = ["north_gate", "south_gate", "music_meadow", "hellman_hollow", "lands_end", "panhandle"] as const;
const CARPOOL_HOURS = [7, 10, 13, 16, 19, 22] as const;
const LIME_HOURS = [6, 9, 11, 14, 17, 20] as const;

export const seedMockBackendData = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const existingIntents = await ctx.db.query("transitIntents").collect();
    const existingUsers = await ctx.db.query("users").collect();
    const existingFallback = await ctx.db.query("transitFallbackCache").collect();
    const needsLegacyNameRefresh = existingUsers.some(
      (user) => user.displayName.startsWith("Demo Fan") || user.displayName === "Guest fan" || user.displayName === "",
    );

    if (!force && existingIntents.length >= 200 && existingUsers.length >= 200) {
      if (needsLegacyNameRefresh) {
        for (let i = 0; i < existingUsers.length; i++) {
          const user = existingUsers[i];
          await ctx.db.patch(user._id, { displayName: REAL_NAMES[i % REAL_NAMES.length] });
        }
        return {
          seeded: true,
          users: existingUsers.length,
          intents: existingIntents.length,
          fallbackRows: existingFallback.length,
          migratedDisplayNames: true,
        };
      }

      return {
        seeded: false,
        skipped: true,
        users: existingUsers.length,
        intents: existingIntents.length,
        fallbackRows: existingFallback.length,
      };
    }

    const now = Date.now();
    const rng = createRng(20260902);
    let insertedIntents = 0;
    let insertedUsers = 0;
    let insertedFallbackRows = 0;

    // Seed fan intents for matching.
    let createdCount = 0;
    for (let dayOffset = 0; ; dayOffset++) {
      const dayStart = FESTIVAL_START + dayOffset * DAY_MS;
      if (dayStart > FESTIVAL_END) break;

      for (const locationZone of DAYS) {
        const zoneIndex = DAYS.indexOf(locationZone);
        for (const direction of DIRECTIONS) {
          for (let slotIndex = 0; slotIndex < SCHEDULE_HOURS.length; slotIndex++) {
            const desiredTime = dayStart + SCHEDULE_HOURS[slotIndex] * HOUR_MS +
              ((slotIndex * 13 + zoneIndex * 7 + dayOffset * 3) % 30) * MINUTE_MS;
            if (isAfterFestival(desiredTime)) continue;

            const userId = await ctx.db.insert("users", { displayName: REAL_NAMES[insertedIntents % REAL_NAMES.length], authType: "guest" });
            const flexibilityMinutes = 40 + (slotIndex * 5 + zoneIndex * 3) % 25;
            const manualUrgentOverride = createdCount % 83 === 0;

            await ctx.db.insert("transitIntents", {
              userId,
              direction,
              desiredTime,
              locationZone,
              flexibilityMinutes,
              startingPoint: STARTING_POINT_BY_ZONE[locationZone][insertedIntents % STARTING_POINT_BY_ZONE[locationZone].length],
              tier: computeTier(desiredTime, FESTIVAL_START, manualUrgentOverride),
              manualUrgentOverride,
              status: "pending",
              groupId:
                createdCount < 3 ? "demo-group"
                : createdCount % 4 === 0 ? "group-a"
                  : createdCount % 6 === 0 ? "group-b"
                  : undefined,
            });

            insertedUsers += 1;
            insertedIntents += 1;
            createdCount += 1;
          }
        }
      }
    }

    // Seed fallback transit/carpool/lime rows as the mock backend data source.
    for (let day = 0; day < dayCount; day++) {
      const dayStart = FESTIVAL_START + day * DAY_MS;
      for (const route of ROUTE_SEEDS) {
        for (const hour of route.scheduleHours) {
          const departure = dayStart + hour * HOUR_MS + Math.floor(rng() * 25) * MINUTE_MS;
          await ctx.db.insert("transitFallbackCache", {
            routeId: route.routeId,
            stopId: route.stopId,
            nextArrivals: [departure, departure + 10 * MINUTE_MS, departure + 22 * MINUTE_MS],
            fetchedAt: now,
          });
          insertedFallbackRows += 1;
        }
      }

      for (const stopId of BACKUP_STOPS) {
        const compatibleFans = 1 + Math.floor(rng() * 12);
        const scooters = 2 + Math.floor(rng() * 15);
        const seatedScooters = Math.floor(rng() * 4);

        for (const hour of CARPOOL_HOURS) {
          const carpoolBase = dayStart + hour * HOUR_MS;
          await ctx.db.insert("transitFallbackCache", {
            routeId: "CARPOOL_DEMO",
            stopId,
            nextArrivals: [
              carpoolBase + 2 * MINUTE_MS + Math.floor(rng() * 30) * MINUTE_MS,
              carpoolBase + (compatibleFans + 10) * MINUTE_MS,
              carpoolBase + (compatibleFans + 20) * MINUTE_MS,
            ],
            fetchedAt: now,
          });
          insertedFallbackRows += 1;
        }

        for (const hour of LIME_HOURS) {
          const limeBase = dayStart + hour * HOUR_MS;
          await ctx.db.insert("transitFallbackCache", {
            routeId: "LIME_DEMO",
            stopId,
            nextArrivals: [
              limeBase + 1 * MINUTE_MS + Math.floor(rng() * 18) * MINUTE_MS,
              limeBase + (seatedScooters + 7) * MINUTE_MS,
              limeBase + (seatedScooters + 15) * MINUTE_MS,
            ],
            fetchedAt: now,
          });
          insertedFallbackRows += 1;
        }
      }
    }

    const demoBackupRows = (CARPOOL_HOURS.length + LIME_HOURS.length) * BACKUP_STOPS.length * dayCount;
    const transitBackupRows = ROUTE_SEEDS.reduce((sum, route) => sum + route.scheduleHours.length, 0) * dayCount;

    return {
      seeded: true,
      users: insertedUsers,
      intents: insertedIntents,
      fallbackRows: insertedFallbackRows,
      fallbackBreakdown: { transitRows: transitBackupRows, carpoolAndLimeRows: demoBackupRows },
      windowStart: FESTIVAL_START,
      windowEnd: FESTIVAL_END,
    };
  },
});

export const seedDataStatus = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const intents = await ctx.db.query("transitIntents").collect();
    const fallbackRows = await ctx.db.query("transitFallbackCache").collect();
    return {
      users: users.length,
      intents: intents.length,
      fallbackRows: fallbackRows.length,
      seeded: intents.length >= 200 && users.length >= 200 && fallbackRows.length > 0,
    };
  },
});
