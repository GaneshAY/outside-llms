import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const seedFallback = mutation({ args: {}, handler: async (ctx) => { const now = Date.now(); for (const row of [{routeId:"5R",stopId:"north_gate",mins:[8,23,38]},{routeId:"44",stopId:"south_gate",mins:[12,27,42]},{routeId:"N",stopId:"music_meadow",mins:[6,21,36]},{routeId:"CARPOOL_DEMO",stopId:"north_gate",mins:[3,3,3]},{routeId:"LIME_DEMO",stopId:"north_gate",mins:[1,1,1]}]) await ctx.db.insert("transitFallbackCache", { routeId: row.routeId, stopId: row.stopId, nextArrivals: row.mins.map(m => now + m * 60_000), fetchedAt: now }); } });
export const byStop = query({ args: { stopId: v.string() }, handler: async (ctx, { stopId }) => ctx.db.query("transitFallbackCache").withIndex("by_stop", q => q.eq("stopId", stopId)).collect() });
