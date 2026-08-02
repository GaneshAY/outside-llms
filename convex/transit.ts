import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

export const createGuest = mutation({ args: { displayName: v.string() }, handler: async (ctx, args) => ctx.db.insert("users", { displayName: args.displayName, authType: "guest" }) });
export const createIntent = mutation({ args: { userId: v.id("users"), direction: v.union(v.literal("arrival"), v.literal("departure")), desiredTime: v.number(), locationZone: v.string(), flexibilityMinutes: v.number(), sourceItineraryId: v.optional(v.string()), groupId: v.optional(v.string()) }, handler: async (ctx, args) => ctx.db.insert("transitIntents", { ...args, tier: computeTier(args.desiredTime), manualUrgentOverride: false, status: "pending" }) });
export const updateIntentUrgent = mutation({ args: { intentId: v.id("transitIntents") }, handler: async (ctx, { intentId }) => { await ctx.db.patch(intentId, { manualUrgentOverride: true, tier: "urgent" }); } });
export const pendingForUser = query({ args: { userId: v.id("users") }, handler: async (ctx, { userId }) => ctx.db.query("transitIntents").withIndex("by_user", q => q.eq("userId", userId)).collect() });
export const candidates = query({ args: { intentId: v.id("transitIntents") }, handler: async (ctx, { intentId }) => { const current = await ctx.db.get(intentId); if (!current) return []; const all = await ctx.db.query("transitIntents").withIndex("by_status_direction_tier", q => q.eq("status", "pending").eq("direction", current.direction)).collect(); return all.filter(other => other._id !== intentId && compatible(current, other)); } });
