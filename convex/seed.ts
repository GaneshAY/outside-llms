import { mutation } from "./_generated/server";
import { computeTier } from "./transit";

const DAYS = ["north_gate", "south_gate", "music_meadow", "hellman_hollow", "lands_end", "panhandle"] as const;
const FESTIVAL_START = Date.parse("2026-08-02T00:00:00-07:00");
const FESTIVAL_END = Date.parse("2026-09-13T23:59:00-07:00");
const DEMO_INTENTS = 1000;

export const seedSyntheticDemoIntents = mutation({
  args: {},
  handler: async (ctx) => {
    const now = FESTIVAL_START;
    const windowMs = FESTIVAL_END - FESTIVAL_START;
    const stepMs = Math.max(60_000, Math.floor(windowMs / DEMO_INTENTS));
    let insertedIntents = 0;
    const users = [];
    for (let i = 0; i < DEMO_INTENTS; i++) {
      const displayIndex = i + 1;
      users.push(await ctx.db.insert("users", { displayName: `Demo Fan ${displayIndex}`, authType: "guest" }));
      const jitter = ((i * 7) % 240) * 60_000;
      const desired = Math.min(FESTIVAL_END - 60_000, FESTIVAL_START + i * stepMs + jitter);
      const direction = i % 2 === 0 ? "arrival" : "departure";
      const zone = DAYS[i % DAYS.length];
      const flexibilityMinutes = 15 + (i % 31);
      const manualUrgentOverride = i % 83 === 0;

      await ctx.db.insert("transitIntents", {
        userId: users[i],
        direction,
        desiredTime: desired,
        locationZone: zone,
        flexibilityMinutes,
        tier: computeTier(desired, now),
        manualUrgentOverride,
        status: "pending",
        groupId: i < 2 ? "demo-group" : undefined,
      });

      insertedIntents += 1;
    }

    return { users: users.length, intents: insertedIntents, windowStart: FESTIVAL_START, windowEnd: FESTIVAL_END };
  },
});
