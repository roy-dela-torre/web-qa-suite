# Website QA

A small full-stack tool that automatically audits a live webpage's typography and
spacing against a standards table you define — no manual screenshotting or
measuring required.

- **Backend** (`server/`): Node + Express + Playwright. Launches a real headless
  Chromium browser at desktop/tablet/mobile viewport widths, reads the actual
  computed CSS (`font-size`, `line-height`, `padding`, etc.) for the selectors you
  configure, and compares each measurement against your standards.
- **Frontend** (`client/`): React (Vite). Four tabs:
  - **Audit** — paste a URL, click Run, and get a results table matching the QA
    tracker sheet: page link, section, screenshot thumbnail, breakpoint,
    expected vs. measured value, Pass/Fail/Not&nbsp;Found/Skipped status, and an
    auto-written remark. Exportable to CSV.
  - **SEO** — one click reads a page's `<title>`, `<meta name="description">`
    and `<h1>`. Each shows its actual value, or a "Missing" badge if absent.
    Open Graph tags (`og:title`, `og:description`, ...) are intentionally never
    read — this checks plain on-page SEO basics only. Also flags when a page
    has more than one `<h1>`.
  - **Compare** — enter a staging URL and a live URL; it fetches both and diffs
    headers (h1–h6), paragraphs, links (text + href) and buttons by content,
    flagging each as Match / Missing on Live / Added on Live / Count differs.
    Useful for confirming a redesign/revamp on staging carried over the same
    copy as the live site. A dedicated "Evaluate page H1 tag" box shows, per
    side: H1 count, a Single/Multiple/Missing H1 status badge, and the exact
    value(s) — listed as H1-1, H1-2, ... when there's more than one.
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
