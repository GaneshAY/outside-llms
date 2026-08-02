import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// UNVERIFIED: data.jambase.com/v3/artists returned the marketing site's HTML shell when
// probed directly (not JSON), and the API reference page is a JS-rendered doc site that
// couldn't be scraped for the exact path. This base URL is a best guess from search results,
// not a confirmed working endpoint. Swap it once the real one is confirmed from the trial
// dashboard/welcome email. Until then this always falls through to mockArtist() below.
const JAMBASE_BASE_URL = "https://data.jambase.com/v3";

async function fetchJambaseArtist(name: string) {
  const key = process.env.JAMBASE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${JAMBASE_BASE_URL}/artists?name=${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) return null; // guards against the HTML-shell case above
    const data = await res.json();
    return data?.artists?.[0] ?? data?.[0] ?? null;
  } catch {
    return null;
  }
}

function mockArtist(name: string) {
  return {
    name,
    events: [
      { venueName: "The Fillmore", city: "San Francisco", date: "2025-11-02" },
      { venueName: "Bottom of the Hill", city: "San Francisco", date: "2025-06-14" },
      { venueName: "The Independent", city: "San Francisco", date: "2024-09-08" },
    ],
  };
}

async function draftCopy(artistName: string, touringHistorySummary: string) {
  const key = process.env.OPENAI_API_KEY;
  const fallbackBio = `${artistName} is an independent artist with a growing live history, including ${touringHistorySummary}.`;
  const fallbackPitch = `Hi — I'm reaching out about ${artistName}, an independent artist with ${touringHistorySummary}. Would love to share music for your next feature or playlist.`;
  if (!key) return { bio: fallbackBio, pitch: fallbackPitch };
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        input: `Write a short, genre-accurate artist bio (2-3 sentences) and a short pitch email (3-4 sentences, addressed to a music blog/playlist curator) for the independent artist "${artistName}". Ground every factual claim in this real touring history, do not invent shows: ${touringHistorySummary}. Return strict JSON with keys "bio" and "pitch", no markdown.`,
      }),
    });
    if (!response.ok) return { bio: fallbackBio, pitch: fallbackPitch };
    const data = await response.json();
    const parsed = JSON.parse(data.output?.[0]?.content?.[0]?.text ?? "{}");
    return { bio: parsed.bio ?? fallbackBio, pitch: parsed.pitch ?? fallbackPitch };
  } catch {
    return { bio: fallbackBio, pitch: fallbackPitch };
  }
}

export const save = internalMutation({
  args: { artistName: v.string(), status: v.union(v.literal("ready"), v.literal("error")), touringHistorySummary: v.optional(v.string()), generatedBio: v.optional(v.string()), generatedPitch: v.optional(v.string()), usedRealJambaseData: v.optional(v.boolean()), errorMessage: v.optional(v.string()), createdAt: v.number() },
  handler: async (ctx, args) => ctx.db.insert("epkRequests", args),
});

export const generate = action({
  args: { artistName: v.string() },
  handler: async (ctx, { artistName }) => {
    try {
      const real = await fetchJambaseArtist(artistName);
      const artist = real ?? mockArtist(artistName);
      const events: Array<{ venueName?: string; city?: string }> = artist.events ?? [];
      const cities = new Set(events.map((e) => e.city).filter(Boolean));
      const touringHistorySummary = events.length
        ? `${events.length} shows across ${cities.size} cities, most recently at ${events[0]?.venueName ?? "a local venue"}${events[0]?.city ? `, ${events[0].city}` : ""}`
        : "a growing catalog of local performances";
      const { bio, pitch } = await draftCopy(artistName, touringHistorySummary);
      const id = await ctx.runMutation(internal.epk.save, { artistName, status: "ready", touringHistorySummary, generatedBio: bio, generatedPitch: pitch, usedRealJambaseData: !!real, createdAt: Date.now() });
      return { id, touringHistorySummary, bio, pitch, usedRealJambaseData: !!real };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const id = await ctx.runMutation(internal.epk.save, { artistName, status: "error", errorMessage, createdAt: Date.now() });
      return { id, error: errorMessage };
    }
  },
});

export const list = query({ args: {}, handler: async (ctx) => ctx.db.query("epkRequests").withIndex("by_created").order("desc").take(20) });
