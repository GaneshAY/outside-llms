import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const FESTIVAL_START = Date.parse("2026-08-02T00:00:00-07:00");
const FESTIVAL_END = Date.parse("2026-09-13T23:59:00-07:00");
const DAY_COUNT = Math.floor((FESTIVAL_END - FESTIVAL_START) / DAY_MS) + 1;

const createRng = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

type RouteSeed = { stopId: string; routeId: string; scheduleHours: number[]; name: string };
const transitSeeds: RouteSeed[] = [
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
];

const backupStops = ["north_gate", "south_gate", "music_meadow", "hellman_hollow", "lands_end", "panhandle"];

export const seedFallback = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rng = createRng(20260902);
    let inserted = 0;

    for (let day = 0; day < DAY_COUNT; day++) {
      const dayStart = FESTIVAL_START + day * DAY_MS;

      for (const route of transitSeeds) {
        for (const hour of route.scheduleHours) {
          const departure = dayStart + hour * HOUR_MS + Math.floor(rng() * 25) * MINUTE_MS;
          await ctx.db.insert("transitFallbackCache", {
            routeId: route.routeId,
            stopId: route.stopId,
            nextArrivals: [departure, departure + 10 * MINUTE_MS, departure + 22 * MINUTE_MS],
            fetchedAt: now,
          });
          inserted += 1;
        }
      }

      for (const stopId of backupStops) {
        const carpoolWait = 2 + Math.floor(rng() * 38);
        const limeWait = 1 + Math.floor(rng() * 12);
        await ctx.db.insert("transitFallbackCache", {
          routeId: "CARPOOL_DEMO",
          stopId,
          nextArrivals: [
            now + carpoolWait * MINUTE_MS,
            now + (carpoolWait + 10) * MINUTE_MS,
            now + (carpoolWait + 20) * MINUTE_MS,
          ],
          fetchedAt: now,
        });
        await ctx.db.insert("transitFallbackCache", {
          routeId: "LIME_DEMO",
          stopId,
          nextArrivals: [
            now + limeWait * MINUTE_MS,
            now + (limeWait + 7) * MINUTE_MS,
            now + (limeWait + 15) * MINUTE_MS,
          ],
          fetchedAt: now,
        });
        inserted += 2;
      }
    }

    return { inserted, dayCount: DAY_COUNT, start: FESTIVAL_START, end: FESTIVAL_END };
  },
});

export const byStop = query({
  args: { stopId: v.string() },
  handler: async (ctx, { stopId }) => ctx.db.query("transitFallbackCache").withIndex("by_stop", (q) => q.eq("stopId", stopId)).collect(),
});
