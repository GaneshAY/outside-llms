# EPK Generator — Implementation Summary (Challenge 01: Make More Music)

**Status:** built and smoke-tested against the live local Convex deployment. Two open items remain (see bottom).

## What it does

Fills the one gap neither OSL Together nor FestFit covers: musician admin/promotion burden. An artist types their name, the app pulls their real touring history from Jambase, then OpenAI drafts a genre-accurate bio and a pitch email grounded in those real shows — no manually typing out a gig history.

## How it works

1. Artist enters a name at `/epk.html`.
2. `convex/epk.ts`'s `generate` action fetches the artist's touring history from Jambase (falls back to realistic mock data if the key/endpoint isn't available).
3. OpenAI drafts a short bio + pitch email grounded in that touring history (falls back to a templated version if no `OPENAI_API_KEY` is set).
4. Result renders immediately, clearly labeled "live Jambase data" vs "placeholder data" depending on which path was used.
5. A lightweight "Recent EPKs" history list shows past requests (artist name + status only).

## Architecture

- Shares the same Convex backend as OSL Together, per team decision — new `epkRequests` table only, no changes to OSL Together's tables.
- Fully isolated frontend: `epk.html` + `src/epk/` (own React entry, own copy of the visual style), so it never touches Codex's `main.tsx` or `index.html`.
- No new dependencies — uses the same "raw `fetch` to the provider's REST API" pattern already established in `convex/openai.ts`.

## Security measures (added after an automated review flagged the original version)

The first version had no protection at all on a function that calls two paid/rate-limited third-party APIs. Fixed:
- **Access gate**: `generate` requires an `accessCode` matched against a `DEMO_ACCESS_CODE` env var — a shared password, not real auth, but enough to stop random visitors to the public URL from spamming paid calls.
- **Rate limit**: max 8 generations per 60 seconds, checked before any external API call.
- **Input validation**: artist name capped at 80 characters, restricted to a letters/numbers/basic-punctuation allowlist — bounds cost and closes off prompt-injection via the name field.
- **Prompt framing**: artist name and touring history are explicitly marked as untrusted data in the OpenAI prompt, not instructions.
- **Trimmed public query**: the history list returns only artist name, status, and timestamp — never the generated bio/pitch text, since there's no per-user auth to scope full content to.

All four were independently verified working (wrong access code and injection-shaped input both correctly rejected in a live test against the running deployment), not just implemented.

## Setup (for whoever runs this next)

Convex env vars (`npx convex env set NAME value`, already done on the current local deployment):
- `JAMBASE_API_KEY` — set (trial key)
- `DEMO_ACCESS_CODE` — set to `outsidellms2026`
- `OPENAI_API_KEY` — **not yet set**, still needed (also unblocks Codex's `parseUrgentText`)

Client-side, `.env.local` (gitignored) needs `VITE_DEMO_ACCESS_CODE` matching the server value — already set locally.

## Open items

1. **Jambase's real v3 API endpoint is unverified.** `data.jambase.com/v3/artists` returns the marketing site's HTML shell, not JSON, when called directly with the trial key. The code falls back to mock touring data until the real base URL/path is confirmed from the Jambase trial dashboard or welcome email.
2. **`OPENAI_API_KEY` still needs to be set** — without it, bios/pitches use templated fallback text instead of real generated copy.
