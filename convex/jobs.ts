import { internalMutation } from "./_generated/server";
import { computeTier } from "./transit";

export const recomputeTiers = internalMutation({ args: {}, handler: async (ctx) => { const intents = await ctx.db.query("transitIntents").collect(); for (const intent of intents) if (intent.status === "pending") await ctx.db.patch(intent._id, { tier: computeTier(intent.desiredTime, Date.now(), intent.manualUrgentOverride) }); } });
export const refreshFallback = internalMutation({ args: {}, handler: async (ctx) => { const now = Date.now(); const rows = await ctx.db.query("transitFallbackCache").collect(); for (const row of rows) await ctx.db.patch(row._id, { nextArrivals: row.nextArrivals.map(t => t > now ? t : t + 30 * 60_000), fetchedAt: now }); } });
