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

function normalizeStartingPoint(value?: string) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized === "" ? undefined : normalized;
}

export const createGuest = mutation({ args: { displayName: v.string() }, handler: async (ctx, args) => ctx.db.insert("users", { displayName: args.displayName, authType: "guest" }) });
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
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", { displayName: args.displayName, authType: "guest" });
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
      const userName = user?.displayName ?? "Outside Lander";
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
      };
    }));

    return withNames
      .sort((a, b) => {
        if (a.sameGroup !== b.sameGroup) return a.sameGroup ? -1 : 1;
        if (a.sameStartingPoint !== b.sameStartingPoint) return a.sameStartingPoint ? -1 : 1;
        if (a.deltaMinutes !== b.deltaMinutes) return a.deltaMinutes - b.deltaMinutes;
        return b.overlapMinutes - a.overlapMinutes;
      })
      .slice(0, Math.min(MATCH_LIMIT_MAX, args.limit ?? MATCH_LIMIT_MAX));
  },
});
