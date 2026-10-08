// Shared leaderboard for Cat Match Fever.
// GET  /api/scores  -> top 3 fastest times
// POST /api/scores  -> { name, ms, turns } adds a time, returns the new top 3
import { getStore } from "@netlify/blobs";

const KEY = "scores";
const NAME_RE = /^[\p{L}][\p{L}'\- ]{0,15} \p{L}\.$/u; // e.g. "First L."

export default async (req) => {
  const store = getStore("cat-match-fever");
  const list = (await store.get(KEY, { type: "json" })) || [];

  if (req.method === "GET") {
    return Response.json(list.slice(0, 3), { headers: { "Cache-Control": "no-store" } });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const ms = Number(body.ms);
    const turns = Number(body.turns);
    // 20 cards need at least 10 turns; anything under 5 seconds or over 2 hours is not a real game.
    if (!NAME_RE.test(name) || !Number.isFinite(ms) || ms < 5000 || ms > 7200000 ||
        !Number.isInteger(turns) || turns < 10 || turns > 1000) {
      return new Response("Invalid score", { status: 400 });
    }
    list.push({ name, ms: Math.round(ms), turns, at: Date.now() });
    list.sort((a, b) => a.ms - b.ms);
    const kept = list.slice(0, 50);
    await store.setJSON(KEY, kept);
    return Response.json(kept.slice(0, 3));
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/scores" };
