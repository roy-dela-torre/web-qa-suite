# Website QA

A small full-stack tool that automatically audits a live webpage's typography and
spacing against a standards table you define — no manual screenshotting or
measuring required.

- **Backend** (`server/`): Node + Express + Playwright. Launches a real headless
  Chromium browser at desktop/tablet/mobile viewport widths, reads the actual
  computed CSS (`font-size`, `line-height`, `padding`, etc.) for the selectors you
  configure, and compares each measurement against your standards.
- **Frontend** (`client/`): React (Vite) + React Router. Each tab is its own
  route/page (`/audit`, `/seo`, `/compare`, `/crawler`, `/standards`):
  - **Audit** — paste a URL, click Run, and get a results table matching the QA
    tracker sheet: page link, section, screenshot thumbnail, breakpoint,
    expected vs. measured value, Pass/Fail/Not&nbsp;Found/Skipped status, and an
    auto-written remark. Exportable to CSV or Excel.
  - **SEO** — one click reads a page's `<title>`, `<meta name="description">`
    and `<h1>`. Each shows its actual value, or a "Missing" badge if absent.
    Open Graph tags (`og:title`, `og:description`, ...) are intentionally never
    read — this checks plain on-page SEO basics only. Also flags when a page
    has more than one `<h1>`. Exportable to Excel.
  - **Compare** — enter a staging URL and a live URL; it fetches both and diffs
    headers (h1–h6), paragraphs, links (text + href) and buttons by content,
    flagging each as Match / Missing on Live / Added on Live / Count differs.
    Useful for confirming a redesign/revamp on staging carried over the same
    copy as the live site. A dedicated "Evaluate page H1 tag" box shows, per
    side: H1 count, a Single/Multiple/Missing H1 status badge, and the exact
    value(s) — listed as H1-1, H1-2, ... when there's more than one. Exportable
    to Excel as a workbook with a separate sheet per section (H1 Evaluation,
    Headers, Paragraphs, Links, Buttons) — mirroring how the original tracker
    used separate tabs.
  - **Crawler** — enter a start URL and crawl every internal link reachable
    from it — links to other domains are never followed. Each discovered page
    records its **parent**: the first already-crawled page where a link to it
    was found (so a blog listing page naturally shows up as the parent of the
    posts it links to, and so on down the tree), plus its crawl depth, HTTP
    status (redirect hops like a 301 stay visible instead of only showing the
    final status), `<title>`, meta description, JSON-LD schema types found on
    the page, how many internal links it contains, and whether it's a
    duplicate of another crawled page (same rendered body content, hashed and
    compared once the crawl finishes). "Max pages" (up to 2000) and "Max
    depth" cap how far it goes (defaults: 150 pages, depth 5). Results stream
    in and appear in the table one page at a time as they're crawled, rather
    than all at once at the end — useful for watching progress on a large
    crawl, and it means whatever was found so far survives even if a very
    large crawl fails partway through. The backend also periodically restarts
    its headless browser during long crawls to avoid memory buildup. A
    **"Site structure"** view renders the same results as a collapsible
    parent/child tree instead of a flat table, for visually spotting orphaned
    sections or overly deep pages. Exportable to Excel, or to a standard
    **sitemap.xml** (only 2xx pages, one canonical URL per duplicate group).
  - **Feedback widget** — a floating chat-icon button in the bottom-right
    corner, present on every tab, so anyone using the tool can report a bug
    or request an adjustment without leaving the page. Submissions post to
    `POST /api/feedback` on the backend (message + optional email + the page
    URL it was sent from) and are appended to a `feedback.jsonl` log file
    next to the server process, as well as echoed to the server's console —
    useful because most free hosting tiers (see Deployment below) don't keep
    a persistent disk, so the console log is the durable copy across
    redeploys. View submissions via `GET /api/feedback?token=...`, gated by
    the `FEEDBACK_ADMIN_TOKEN` environment variable — the endpoint stays
    disabled (501) until that variable is set on the backend host.
  - **Standards** — an editable table matching the "Font Sizes" reference sheet
    (breakpoints × H1/H2/H3/paragraph, min/max px per cell) plus a generic
    spacing table (any CSS selector + property, e.g. section bottom padding,
    page side padding).

## Running it

Two terminals:

```bash
# Terminal 1 — backend (http://localhost:5175)
cd server
npm install
npx playwright install chromium   # first time only
npm start

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the backend,
so no CORS config is needed.

## Deployment

**Vercel hosts the frontend only.** `vercel.json` at the repo root tells Vercel
to build just `client/` (`cd client && npm run build`, output `client/dist`) —
that's what fixes the 404 you'd otherwise get from Vercel trying to build the
repo root, which has no `package.json`.

The **backend cannot run on Vercel** as a serverless function: it launches a
real headless Chromium via Playwright for 10-30+ seconds per audit, and
Playwright's browser binaries are far larger than what fits in a serverless
function bundle. Deploy `server/` somewhere that runs a persistent Node
process instead — Render, Railway, Fly.io, or a small VPS all work; just make
sure the build step runs `npx playwright install --with-deps chromium`.

Once the backend has a public URL, point the deployed frontend at it:

- In the Vercel project's **Settings → Environment Variables**, add
  `VITE_API_BASE_URL` = `https://your-backend-host.example.com` (no trailing
  slash), then redeploy.
- Locally, leave it unset — `client/vite.config.js` proxies `/api/*` to
  `localhost:5175` for you.

If `VITE_API_BASE_URL` is missing in a production build, the app shows a
banner telling you to set it instead of failing silently on every request.

To read submissions from the feedback widget, set `FEEDBACK_ADMIN_TOKEN` on
the **backend** host (e.g. Render → Environment) to any secret string, then
visit `https://your-backend-host.example.com/api/feedback?token=<that secret>`.

## Customizing standards

Everything in the Standards tab is editable at runtime (selectors, breakpoint
widths, min/max px, tolerance). Nothing is persisted server-side — if you want
your standards to survive a refresh or be shared with teammates, the next step
would be saving/loading a JSON standards file (not yet wired up), or swapping
the in-memory React state for `localStorage`.

## Notes / limitations

- Only the **first** matching element per selector is measured per page. For a
  page with multiple `h2`s you only see one row — narrow the selector (e.g.
  `.hero h2`) if you need a specific instance.
- A blank min/max cell means "no standard defined" — that check is marked
  **Skipped**, not Pass/Fail.
- Screenshots are per-element crops captured live during the audit (not
  persisted/hosted anywhere) — toggle "Capture screenshots" off for a faster,
  text-only run.
- This measures **actual rendered output**, so it only catches deviations that
  show up in the DOM/computed styles at the time of load — it won't detect
  things like broken links redirecting to the wrong tab (that's still a manual
  QA check, better suited to the original tracker sheet).
- **Compare** diffs content as a multiset (how many times each exact header
  text / paragraph / link / button appears on each side) — it flags "this
  paragraph appears once on staging, zero times on live" rather than doing a
  positional/sequence diff. A single word change reads as one item "Missing on
  Live" and a different one "Added on Live", not as a single edit.
- **SEO** and **Compare** both load pages at a single default viewport (no
  breakpoint switching) since meta tags, headings and links don't change
  across screen sizes.
- Excel export uses `exceljs`, loaded on demand (dynamic `import()`) only when
  an "Export Excel" button is clicked, so its ~270&nbsp;kB (gzipped) doesn't
  bloat the initial page load. We use `exceljs` rather than the more common
  `xlsx` (SheetJS) package — the npm-published `xlsx` has unpatched
  high-severity advisories (prototype pollution, ReDoS) in its file-parsing
  code path with no fix available on the registry.
