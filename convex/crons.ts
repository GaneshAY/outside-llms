import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("recompute pending tiers", { minutes: 5 }, internal.jobs.recomputeTiers);
crons.interval("refresh fallback estimates", { minutes: 2 }, internal.jobs.refreshFallback);
export default crons;
