# DevStats

> `// grep your github, visually`

A terminal-aesthetic GitHub analytics dashboard. Search any public GitHub username and instantly see a contribution heatmap, language breakdown, repo sparklines, and star counts — all routed through a hardened Next.js backend so API tokens never reach the browser.

**[→ Live Demo](https://devstats-vatsal.vercel.app)**  &nbsp;·&nbsp;  **[→ Source Code](https://github.com/Vatsal-A/devstats.git)**

---

## Screenshots

> Search any GitHub username to see the full dashboard

![DevStats Dashboard](https://devstats-vatsal.vercel.app/api/og)

---

## Features

**Data & Visualizations**
- **Contribution heatmap** — 52-week GitHub-style green-square grid, built in custom SVG (no chart library)
- **Stacked language bar** — GitHub's own language bar aesthetic, animated fill on load with hover highlighting
- **Repo sparklines** — Mini activity chart on each repo card, colored with the language's own GitHub color
- **Repo breakdown stats** — Own repos, forks, repos with stars, language count
- **Full repo pagination** — Fetches all pages from GitHub API, no silent 100-repo truncation
- **Virtual scroll** — Only renders visible repo cards in the DOM — handles 500+ repos without lag

**Backend & Security**
- **Server-side proxy** — `GITHUB_TOKEN` lives in `process.env` only, never in the client bundle
- **Per-IP rate limiting** — Sliding-window limiter (10 requests / 60s) on the proxy endpoint
- **10-minute TTL cache** — Repeat lookups served from in-process cache with a freshness timestamp
- **GitHub OAuth login** — Sign in to include private repo stats; token stored in HttpOnly JWT (JS can't read it)

**UI & Polish**
- **Terminal identity** — JetBrains Mono throughout, macOS-style window chrome, `$` prompt input
- **Boot sequence loader** — Fake CLI output while data loads, no generic spinner
- **Staggered entrance animations** — Cards fade+rise in sequence, respects `prefers-reduced-motion`
- **Spring hover interactions** — Repo cards lift with language-color border glow on hover
- **Designed error states** — Distinct 404, rate-limit, and network error UIs each with a retry button
- **Custom cursor** — Dot + lagged ring, expands on interactive elements
- **Open Graph image** — Dynamic 1200×630 preview card via Vercel Edge (`/api/og`)
- **Custom 404 page** — Terminal-themed with fake stack trace and suggested usernames
- **Font preloading** — JetBrains Mono preconnected and preloaded to eliminate flash of unstyled text

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) — Pages Router |
| Auth | [NextAuth.js](https://next-auth.js.org) — GitHub OAuth provider |
| Charts | [Recharts](https://recharts.org) for bar chart; custom SVG for heatmap, stacked bar, sparklines |
| OG Image | [@vercel/og](https://vercel.com/docs/functions/og-image-generation) — Edge runtime |
| Styling | CSS-in-JS string — zero dependencies, full control |
| Font | [JetBrains Mono](https://www.jetbrains.com/lp/mono/) via Google Fonts |
| Hosting | [Vercel](https://vercel.com) |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/Vatsal-A/devstats.git
cd devstats
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values:

```env
# Raises GitHub API rate limit from 60 → 5,000 req/hr
# Create at: github.com/settings/tokens (no scopes needed)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# GitHub OAuth App — for the "sign in with github" button
# Create at: github.com/settings/developers → OAuth Apps → New OAuth App
# Homepage URL:    http://localhost:3000
# Callback URL:    http://localhost:3000/api/auth/callback/github
GITHUB_CLIENT_ID=Ov23lixxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Random 32-char string — run: openssl rand -base64 32
NEXTAUTH_SECRET=your-random-secret-here

# Your app URL (change to your Vercel domain when deploying)
NEXTAUTH_URL=http://localhost:3000
```

### 3. Run

```bash
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) — try searching `torvalds`, `gaearon`, or your own username.

---

## Project Structure

```
devstats/
├── pages/
│   ├── index.js                  # Full dashboard — all components in one file
│   ├── 404.js                    # Custom not-found page (terminal-themed)
│   ├── _app.js                   # NextAuth SessionProvider wrapper
│   ├── _document.js              # Font preloading + OG/Twitter meta tags
│   └── api/
│       ├── github.js             # Proxy: token server-side, rate limit, cache, pagination
│       ├── github-private.js     # Authenticated route for private repos (OAuth token)
│       ├── og.js                 # Edge function: dynamic OG image generator
│       └── auth/
│           └── [...nextauth].js  # GitHub OAuth handler
├── .env.local.example            # Template for environment variables
├── package.json
└── README.md
```

---

## Security

- `GITHUB_TOKEN` is only read in `pages/api/github.js` on the server — it has no `NEXT_PUBLIC_` prefix so Next.js never includes it in the client bundle
- OAuth `access_token` is stored in a signed, **HttpOnly** JWT cookie — JavaScript cannot read it via `document.cookie`
- The `session` object sent to the client contains only `name`, `login`, and `avatar_url` — never the token
- Username input is validated with `/^[a-zA-Z0-9-]{1,39}$/` before any network call is made

---

## Author

Built by **Vatsal Agrawal** 

- GitHub: [@Vatsal-A](https://github.com/Vatsal-A)
- Email: Vatsal98252@gmail.com

---

*Built as a portfolio project demonstrating full-stack Next.js, API security patterns, custom SVG data visualization, and production-grade UI polish.*
