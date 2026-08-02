# OSL Together — Design Doc

**Status:** approved for implementation
**Audience:** implementing agent/dev with no prior context on this project

## 0. Context

OutsideLLMS is a one-day AI buildathon combining OpenAI technology with Outside Lands ("OSL"), San Francisco's major music festival (Golden Gate Park, also streamed via Amazon Music). Submissions are judged against three official challenges:

1. **Make More Music** — reduce musician busywork/promotion/admin/monetization burden.
2. **Make the Festival Better** — enhance the live experience, at the park or via the Amazon Music livestream.
3. **Superfan Connection** — deepen bonds between fans and artists, or help artists build community.

This doc specs **OSL Together**, the pre/post-event transit & carpool coordination module of a larger two-module submission. The other module, **FestFit** (in-event taste-matched itinerary + artist discovery, once a fan is inside the festival), is being built **separately by a different team/agent** and will be patched into this backend later. **Do not implement FestFit features from this doc.** FestFit's own spec lives in `osllm.md` in this same directory — it is reference context only, not a build target here.

**Honest scope note:** OSL Together (and FestFit) together fully address Challenge 02, and touch Challenge 03 through group/peer matching and friend-based planning. **Neither module addresses Challenge 01** (musician admin burden) — that's a known gap in this submission's story, not an oversight to fix here.

Both modules share **one Convex backend** and **one `users` identity table**, so a fan's identity carries across the whole festival journey (pre-event matching → in-event planning) without a separate signup per module. Two fields on `transitIntents` (`sourceItineraryId`, `groupId`) are reserved as future join points into FestFit's itinerary and friend-group data. Build them now as **loosely-typed optional placeholders** (plain strings, not `v.id()` references to tables that don't exist yet) — they get tightened into real Convex `Id` references once FestFit's schema is merged in.

## 1. Product Summary

OSL Together matches fans heading the same direction (to or from the festival) at a compatible time, so they can travel together — shared rideshare/carpool coordination or transit companionship. Matching adapts as departure time approaches (urgency tiers), and the app always shows a live transit fallback so a fan is never left with a dead end even if no match exists.

**Trust model:** intro/coordination only. The app does **not** book rides, arrange payment, or verify identity. Matched fans coordinate their own transportation (their own Uber/Lyft, or just walking to transit together). This avoids stranger's-car liability and keeps the build achievable in a day.

## 2. Architecture

- **Frontend:** mobile-first web app, React + Convex React hooks (`useQuery`/`useMutation`) for automatic live reactivity — no polling needed for match updates to appear.
- **Two entry modes:**
  - *Structured form* (week/day/hours-out planners): time window, direction, location zone, flexibility slider.
  - *Free-text box* (urgent, <30 min, or manual override): parsed into the same structured shape by an OpenAI action.
- **Backend:** Convex — queries, mutations, actions, scheduled functions. No HTTP action/webhook endpoint is needed for this module; all chat-app integrations (WhatsApp/Signal/iMessage) are roadmap-only and out of scope for the demo build.
- **External integrations:**
  - **OpenAI** (via Convex actions, server-side only): (a) parse free-text urgent intent into structured fields, (b) generate a short "here's who you matched with + icebreaker" blurb.
  - **Live transit data:** SF Muni GTFS-realtime feed for routes serving Golden Gate Park. **Unverified as of this doc** — first implementation task should confirm public availability and auth requirements. If it's not straightforward within 1-2 hours of investigation, fall back immediately to a small hardcoded schedule (see §7) rather than losing build time to it.

## 3. Data Model (Convex schema — this module's tables)

```ts
// convex/schema.ts
export default defineSchema({
  users: defineTable({
    displayName: v.string(),
    authType: v.union(v.literal("spotify"), v.literal("quiz"), v.literal("guest")),
    contactHandle: v.optional(v.string()), // roadmap: phone for WhatsApp/Signal, unused in demo
  }),
  // NOTE: authType includes "spotify"/"quiz" because this table is shared with FestFit.
  // OSL Together only ever creates "guest" users; the other values are FestFit's concern.

  transitIntents: defineTable({
    userId: v.id("users"),
    direction: v.union(v.literal("arrival"), v.literal("departure")),
    desiredTime: v.number(),        // unix ms
    locationZone: v.string(),       // one of a fixed small set, see §11
    flexibilityMinutes: v.number(),
    tier: v.union(v.literal("week"), v.literal("day"), v.literal("hours"), v.literal("urgent")),
    manualUrgentOverride: v.boolean(),
    status: v.union(v.literal("pending"), v.literal("matched"), v.literal("expired")),
    // --- FestFit join points: placeholders only, do not implement lookups against them ---
    sourceItineraryId: v.optional(v.string()), // will become v.id("itineraries") post-merge
    groupId: v.optional(v.string()),           // will become v.id("friendGroups") post-merge
  })
    .index("by_status_direction_tier", ["status", "direction", "tier"])
    .index("by_user", ["userId"]),

  transitMatches: defineTable({
    blurb: v.string(),
    status: v.union(v.literal("proposed"), v.literal("confirmed"), v.literal("declined")),
  }),

  transitMatchMembers: defineTable({
    matchId: v.id("transitMatches"),
    intentId: v.id("transitIntents"),
  })
    .index("by_match", ["matchId"])
    .index("by_intent", ["intentId"]),

  transitFallbackCache: defineTable({
    routeId: v.string(),
    stopId: v.string(),
    nextArrivals: v.array(v.number()), // unix ms ETAs
    fetchedAt: v.number(),
  }).index("by_stop", ["stopId"]),
});
```

## 4. Urgency Tiers — concrete thresholds

- `week`: more than 48 hours until `desiredTime`
- `day`: 4–48 hours until `desiredTime`
- `hours`: 30 minutes – 4 hours until `desiredTime`
- `urgent`: less than 30 minutes until `desiredTime`, **or** `manualUrgentOverride = true` regardless of `desiredTime`

Tier is **computed, not fixed at creation**. A scheduled function (Convex `crons`, e.g. every 5 minutes) recomputes `tier` for every `status: "pending"` intent based on current time vs. `desiredTime` — a week-out plan quietly escalates toward `urgent` as the festival approaches, with no re-entry required from the user.

**Manual override:** any user can trigger a mutation (`updateIntentUrgent`) at any time that sets `manualUrgentOverride = true` and `tier = "urgent"` immediately, regardless of the intent's prior tier or `desiredTime`. This covers both a plan that changed last-minute and a first-time user who opens the app already running late with no prior intent on file.

## 5. Matching Logic

- **Compatibility rule:** same `direction`, overlapping time window (`desiredTime ± flexibilityMinutes` overlaps between two intents), same `locationZone`.
- **Week/day tiers:** matching runs as a batch (e.g. on each tier-recompute cycle) and surfaces a **browsable list** of candidates via a reactive query. The user picks who to reach out to — nothing auto-commits.
- **Hours/urgent tiers:** matching is **push-style** — because the query is reactive, the instant a second compatible intent enters the pool, both parties see it live with no manual refresh.
- **On match found:** create one `transitMatches` row + `transitMatchMembers` rows for each participating intent, call the OpenAI action to generate the blurb/icebreaker, set both intents' `status` to `"matched"`.
- **`groupId` handling (placeholder-aware):** if two intents share a non-null `groupId` string, treat them as preferred/priority matches before falling back to the open pool — this is the "carpool with people I already planned my day with" behavior. Since FestFit's real `friendGroups` table doesn't exist yet, this is pure string-equality logic today; no table lookup needed or possible.
- **`sourceItineraryId` handling (placeholder-aware):** if set, it means the UI *would* pre-fill `desiredTime`/`locationZone` from FestFit's itinerary data in the merged system. Since that data doesn't exist yet, just trust whatever `desiredTime`/`locationZone` the intent already carries — there is nothing to look up today.

## 6. No-Match Fallback (always-on)

Every screen showing intent/match status also shows live (or cached-estimated) transit info for the user's zone — the user is never left with a dead end. A scheduled function checks unmatched `urgent`-tier intents on a ~2 minute cadence; if still unmatched, the UI should treat "no match within timeout" as the primary state to display, with the fallback transit info given equal or greater visual weight than "still waiting to match."

## 7. Demo-Safety / Mocking Strategy

- **Muni live feed:** verify public GTFS-realtime access as the *first* implementation task. If blocked by auth requirements, complex GTFS parsing, or rate limits within 1-2 hours, switch immediately to a small hardcoded schedule (2-3 routes/stops near Golden Gate Park) written directly into `transitFallbackCache` via a seed mutation, clearly labeled "estimated" in the UI. Because the UI only ever reads from `transitFallbackCache`, swapping real data for mocked data later is a one-function change, not a UI change.
- **Empty pool problem:** before the demo, run a seed mutation that creates 8-12 synthetic demo intents spread across tiers, zones, and both directions, so live matching is visibly demonstrable even with only one real presenter using the app live.
- **OpenAI parse failures:** if the free-text urgent parse returns low-confidence or malformed output, fall back to showing the structured quick-fields (time/zone dropdowns) pre-filled with best-guess values, rather than blocking the user with an error.

## 8. Error Handling

- Convex mutation/action failures: standard try/catch, surface a simple retryable error state in the UI. No elaborate recovery needed given the one-day scope.
- External API failures (OpenAI, Muni): degrade to the fallback paths in §7 rather than erroring the whole screen.

## 9. Testing

- Manual test script covering: each tier's matching flow, the manual urgent-override button, the empty-pool fallback display, and the free-text-parse-failure fallback to structured fields.
- No full automated suite required for a one-day build. If time allows, a couple of `convex-test` unit tests specifically on the tier-computation function and the compatibility-matching function, since time-window-overlap logic is the most likely place for off-by-one bugs.

## 10. Explicitly Out of Scope (This Module)

- FestFit itself — separate build, separate team/agent, see `osllm.md`.
- WhatsApp/Signal/iMessage integration — roadmap/pitch-slide only, not built live. (Team has existing Signal/signal-cli Docker infra from a prior project, which makes this a credible near-term roadmap item, not hand-waving.)
- Payment or booking of shared rides.
- Identity verification / production auth — guest/session-based identity is sufficient for the demo.

## 11. Open Questions for Implementer

- **Confirm** SF Muni GTFS-realtime public feed availability and auth requirements before committing to it as the live data source (see §7 for the fallback if it doesn't pan out quickly).
- **Define** the fixed list of `locationZone` values for Golden Gate Park (e.g., by stage name or gate/entrance) — do not leave this as freeform text, or matching reliability will suffer. Aim for 5-8 zones.
- **Confirm** the working name "OSL Together" with the team, or rename before shipping UI copy.
