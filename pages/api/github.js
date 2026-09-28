// Server-side proxy for GitHub API calls.
// - GITHUB_TOKEN stays in process.env, never sent to the browser
// - Per-IP sliding window rate limiter: 10 req / 60s
// - In-process TTL cache: 10 minutes
// - Full repo pagination: fetches all pages (GitHub caps at 100/page)

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000;
const RATE = new Map();
const RATE_WINDOW = 60 * 1000;
const RATE_MAX = 10;

function getIP(req) {
  const fwd = req.headers["x-forwarded-for"];
  return (fwd ? fwd.split(",")[0] : req.socket?.remoteAddress) || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const times = (RATE.get(ip) || []).filter((t) => now - t < RATE_WINDOW);
  if (times.length >= RATE_MAX) return true;
  times.push(now);
  RATE.set(ip, times);
  return false;
}

async function ghFetch(path) {
  const token = process.env.GITHUB_TOKEN;
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function fetchAllRepos(username) {
  const all = [];
  let page = 1;
  while (true) {
    const res = await ghFetch(
      `/users/${username}/repos?per_page=100&sort=updated&page=${page}`
    );
    if (!res.ok) {
      const err = new Error(`repos fetch failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
    if (page > 10) break;
  }
  return all;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { username } = req.query;
  if (!username || !/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
    return res.status(400).json({ error: "Invalid username" });
  }

  const ip = getIP(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests — wait 60s and try again." });
  }

  const key = `user:${username.toLowerCase()}`;
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json({ ...cached.data, cached: true, cachedAt: cached.ts });
  }

  try {
    const userRes = await ghFetch(`/users/${username}`);
    if (userRes.status === 404) return res.status(404).json({ error: `User "${username}" not found` });
    if (userRes.status === 403) return res.status(503).json({ error: "GitHub rate limit reached server-side — try again soon" });
    if (!userRes.ok) return res.status(502).json({ error: `GitHub returned ${userRes.status}` });

    const [user, repos] = await Promise.all([userRes.json(), fetchAllRepos(username)]);
    const payload = { user, repos, cachedAt: Date.now(), cached: false };
    CACHE.set(key, { data: payload, ts: Date.now() });
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(payload);
  } catch (err) {
    console.error("[api/github]", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
}
