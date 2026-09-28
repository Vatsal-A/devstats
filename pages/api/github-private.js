// Authenticated GitHub endpoint — uses OAuth token from HttpOnly JWT cookie.
// The client never sees or sends the access token.

import { getToken } from "next-auth/jwt";

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000;

async function fetchAllReposAuthed(accessToken) {
  const all = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&sort=updated&page=${page}&affiliation=owner`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: `Bearer ${accessToken}`,
        },
      }
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

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.accessToken) return res.status(401).json({ error: "Not authenticated" });

  const login = token.login;
  const key = `private:${login}`;
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json({ ...cached.data, cached: true, cachedAt: cached.ts });
  }

  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${token.accessToken}`,
      },
    });
    if (!userRes.ok) throw new Error(`GitHub /user returned ${userRes.status}`);

    const [user, repos] = await Promise.all([userRes.json(), fetchAllReposAuthed(token.accessToken)]);
    const payload = { user, repos, private: true, cachedAt: Date.now(), cached: false };
    CACHE.set(key, { data: payload, ts: Date.now() });
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(payload);
  } catch (err) {
    console.error("[api/github-private]", err);
    return res.status(err.status || 500).json({ error: err.message });
  }
}
