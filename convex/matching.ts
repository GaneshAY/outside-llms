import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { compatible } from "./transit";

export const proposeMatch = mutation({ args: { firstIntentId: v.id("transitIntents"), secondIntentId: v.id("transitIntents"), blurb: v.optional(v.string()) }, handler: async (ctx, args) => { const a = await ctx.db.get(args.firstIntentId), b = await ctx.db.get(args.secondIntentId); if (!a || !b || a.status !== "pending" || b.status !== "pending" || !compatible(a,b)) throw new Error("These intents are no longer compatible."); const matchId = await ctx.db.insert("transitMatches", { blurb: args.blurb ?? "You both want to travel together — say hello and coordinate your route.", status: "proposed" }); await ctx.db.insert("transitMatchMembers", { matchId, intentId: a._id }); await ctx.db.insert("transitMatchMembers", { matchId, intentId: b._id }); await ctx.db.patch(a._id, { status: "matched" }); await ctx.db.patch(b._id, { status: "matched" }); return matchId; } });
