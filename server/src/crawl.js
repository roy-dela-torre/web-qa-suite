import { chromium } from 'playwright'

const SKIP_EXTENSIONS = /\.(pdf|jpe?g|png|gif|svg|webp|ico|zip|rar|mp4|mp3|wav|css|js|mjs|json|xml|rss|woff2?|ttf|eot|dmg|exe)$/i
const SKIP_HREF_PREFIXES = ['#', 'mailto:', 'tel:', 'javascript:']

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

  try {
    let response
    try {
      response = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    } catch {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    }
    statusCode = response ? response.status() : null
    title = (await page.title()) || null

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

        if (!ctx.visited.has(normalized) && ctx.visited.size < ctx.maxPages) {
          ctx.visited.set(normalized, { parentUrl: url, depth: depth + 1 })
          ctx.queue.push({ url: normalized, depth: depth + 1 })
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
    title,
    internalLinkCount,
    error,
  }
}

// Breadth-first crawl restricted to the start URL's own hostname. Each page's
// "parent" is whichever already-visited page first linked to it — that's the
// crawl's own discovery order, so e.g. a blog listing page naturally ends up
// as the parent of the post pages it links to.
export async function crawlSite({ startUrl, maxPages = 150, maxDepth = 5, concurrency = 4 }) {
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
  const browser = await chromium.launch()
  try {
    while (ctx.queue.length && pages.length < ctx.maxPages) {
      const batch = ctx.queue.splice(0, concurrency)
      const settled = await Promise.all(batch.map((item) => visitPage(browser, item, ctx)))
      pages.push(...settled)
    }
  } finally {
    await browser.close()
  }

  return {
    startUrl: start,
    pages,
    totalDiscovered: ctx.visited.size,
    truncated: ctx.queue.length > 0,
  }
}
