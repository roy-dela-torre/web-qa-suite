import { chromium } from 'playwright'
import crypto from 'node:crypto'

const SKIP_EXTENSIONS = /\.(pdf|jpe?g|png|gif|svg|webp|ico|zip|rar|mp4|mp3|wav|css|js|mjs|json|xml|rss|woff2?|ttf|eot|dmg|exe)$/i
const SKIP_HREF_PREFIXES = ['#', 'mailto:', 'tel:', 'javascript:']

// Playwright's page.goto() follows redirects transparently and only hands
// back the final response, so a 301/302 hop would otherwise vanish from the
// results entirely. Walking the request's redirect chain backwards recovers
// each hop's own status (e.g. 301 -> 200) so redirects stay visible.
async function buildRedirectChain(response) {
  if (!response) return []
  let request = response.request()
  const requestChain = []
  while (request) {
    requestChain.unshift(request)
    request = request.redirectedFrom()
  }
  const chain = []
  for (const req of requestChain) {
    const resp = await req.response().catch(() => null)
    chain.push({ url: req.url(), status: resp ? resp.status() : null })
  }
  return chain
}

function normalizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    parsed.hash = ''
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1)
    }
    return parsed.toString()
  } catch {
    return null
  }
}

async function visitPage(browser, item, ctx) {
  const { url, depth } = item
  const discovered = ctx.visited.get(url)
  const page = await browser.newPage()
  let statusCode = null
  let title = null
  let error = null
  let internalLinkCount = 0
  let redirectChain = []
  let metaDescription = null
  let schemaTypes = []
  let canonicalUrl = null
  let contentHash = null

  try {
    let response
    try {
      response = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    } catch {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    }
    statusCode = response ? response.status() : null
    title = (await page.title()) || null
    redirectChain = await buildRedirectChain(response)

    const pageData = await page.evaluate(() => {
      const clean = (t) => (t || '').replace(/\s+/g, ' ').trim()
      const metaDescEl = document.querySelector('meta[name="description"]')
      const metaDescription = clean(metaDescEl?.getAttribute('content'))

      // Collect every @type found in JSON-LD structured data, including
      // types nested under an @graph array (a common pattern for pages that
      // describe multiple entities, e.g. Organization + WebPage together).
      const schemaTypes = []
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        try {
          const json = JSON.parse(script.textContent)
          const items = Array.isArray(json) ? json : [json]
          for (const item of items) {
            const nodes = item && item['@graph'] ? item['@graph'] : [item]
            for (const node of nodes) {
              const t = node && node['@type']
              if (!t) continue
              if (Array.isArray(t)) schemaTypes.push(...t)
              else schemaTypes.push(t)
            }
          }
        } catch {
          // Malformed JSON-LD — skip it rather than failing the whole page.
        }
      })

      const canonicalEl = document.querySelector('link[rel="canonical"]')
      let canonicalUrl = null
      if (canonicalEl?.getAttribute('href')) {
        try {
          // Resolve relative hrefs (e.g. "/page") against the document's own
          // base URL rather than the crawled URL string, so <base href> tags
          // are respected the same way a real browser would apply them.
          canonicalUrl = new URL(canonicalEl.getAttribute('href'), document.baseURI).toString()
        } catch {
          canonicalUrl = null
        }
      }

      const contentText = clean(document.body ? document.body.innerText : '')

      return {
        metaDescription: metaDescription || null,
        schemaTypes: Array.from(new Set(schemaTypes)),
        canonicalUrl,
        contentText,
      }
    })
    metaDescription = pageData.metaDescription
    schemaTypes = pageData.schemaTypes
    canonicalUrl = pageData.canonicalUrl
    // Hashing normalized body text (rather than title/meta alone) catches
    // pages that render the same content under different URLs — the usual
    // definition of "duplicate page" for SEO purposes.
    contentHash = pageData.contentText
      ? crypto.createHash('sha256').update(pageData.contentText).digest('hex')
      : null

    if (depth < ctx.maxDepth) {
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))
      for (const href of hrefs) {
        if (!href || SKIP_HREF_PREFIXES.some((p) => href.startsWith(p))) continue

        let absolute
        try {
          absolute = new URL(href, url).toString()
        } catch {
          continue
        }
        const normalized = normalizeUrl(absolute)
        if (!normalized) continue

        const linkUrl = new URL(normalized)
        if (linkUrl.hostname !== ctx.origin) continue
        if (SKIP_EXTENSIONS.test(linkUrl.pathname)) continue

        internalLinkCount += 1

        if (!ctx.visited.has(normalized)) {
          if (ctx.visited.size < ctx.maxPages) {
            ctx.visited.set(normalized, { parentUrl: url, depth: depth + 1 })
            ctx.queue.push({ url: normalized, depth: depth + 1 })
          } else {
            // Hit the page cap — this link exists but will never be crawled or
            // reported, so the result set is incomplete even though the queue
            // may end up empty (we never enqueued it in the first place).
            ctx.cappedOut = true
          }
        }
      }
    }
  } catch (err) {
    error = err.message
  } finally {
    await page.close()
  }

  return {
    url,
    parentUrl: discovered?.parentUrl || null,
    depth,
    statusCode,
    redirected: redirectChain.length > 1,
    redirectChain,
    title,
    metaDescription,
    schemaTypes,
    canonicalUrl,
    contentHash,
    internalLinkCount,
    error,
  }
}

// Restart the browser periodically on long crawls. A single Chromium instance
// slowly accumulates memory across hundreds of navigations even with pages
// closed properly, and on a memory-constrained host (the deployed backend
// runs on Render's free 512MB plan) that eventually gets OOM-killed instead
// of just failing one page — which drops the connection mid-stream and shows
// up client-side as a misleading "CORS" error rather than the real cause.
const RECYCLE_BROWSER_EVERY = 50

// Breadth-first crawl restricted to the start URL's own hostname. Each page's
// "parent" is whichever already-visited page first linked to it — that's the
// crawl's own discovery order, so e.g. a blog listing page naturally ends up
// as the parent of the post pages it links to.
//
// onPage, if given, fires as soon as each individual page finishes (not once
// per batch) so a caller can stream results out incrementally instead of
// waiting for the whole crawl to finish before sending anything back.
//
// concurrency defaults to 2 (not higher) for the same memory-headroom reason
// as RECYCLE_BROWSER_EVERY above — each concurrent page is a real Chromium
// tab loading a real site, and the free-tier host has little RAM to spare.
export async function crawlSite({ startUrl, maxPages = 150, maxDepth = 5, concurrency = 2, onPage }) {
  const start = normalizeUrl(startUrl)
  if (!start) throw new Error('Invalid start URL.')
  const origin = new URL(start).hostname

  const ctx = {
    origin,
    maxPages: Math.max(1, maxPages),
    maxDepth: Math.max(0, maxDepth),
    visited: new Map(),
    queue: [],
  }
  ctx.visited.set(start, { parentUrl: null, depth: 0 })
  ctx.queue.push({ url: start, depth: 0 })

  const pages = []
  let browser = await chromium.launch()
  let pagesSinceRestart = 0
  try {
    while (ctx.queue.length && pages.length < ctx.maxPages) {
      const batch = ctx.queue.splice(0, concurrency)
      const settled = await Promise.all(
        batch.map((item) =>
          visitPage(browser, item, ctx).then((result) => {
            onPage?.(result)
            return result
          })
        )
      )
      pages.push(...settled)
      pagesSinceRestart += settled.length

      if (pagesSinceRestart >= RECYCLE_BROWSER_EVERY && ctx.queue.length && pages.length < ctx.maxPages) {
        await browser.close()
        browser = await chromium.launch()
        pagesSinceRestart = 0
      }
    }
  } finally {
    await browser.close()
  }

  return {
    startUrl: start,
    pages,
    totalDiscovered: ctx.visited.size,
    truncated: ctx.queue.length > 0 || Boolean(ctx.cappedOut),
    duplicates: findDuplicates(pages),
  }
}

// Duplicate pages can only be known once every page's contentHash has been
// computed, so this runs as a final pass rather than per-page — pages with
// the same hash are byte-for-byte-equivalent rendered content living at
// different URLs. Returns a map of url -> the other URLs sharing its hash.
function findDuplicates(pages) {
  const byHash = new Map()
  for (const p of pages) {
    if (!p.contentHash) continue
    if (!byHash.has(p.contentHash)) byHash.set(p.contentHash, [])
    byHash.get(p.contentHash).push(p.url)
  }

  const duplicates = {}
  for (const urls of byHash.values()) {
    if (urls.length < 2) continue
    for (const url of urls) {
      duplicates[url] = urls.filter((u) => u !== url)
    }
  }
  return duplicates
}
