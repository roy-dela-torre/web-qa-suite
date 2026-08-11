import express from 'express'
import cors from 'cors'
import { runAudit } from './audit.js'
import { extractSeo } from './seo.js'
import { compareContent } from './compare.js'
import { crawlSite } from './crawl.js'
import {
  defaultBreakpoints,
  defaultElements,
  defaultFontStandards,
  defaultSpacingStandards,
  defaultTolerancePx,
} from './defaultStandards.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

function parseHttpUrl(value) {
  if (!value || typeof value !== 'string') return null
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/defaults', (_req, res) => {
  res.json({
    breakpoints: defaultBreakpoints,
    elements: defaultElements,
    fontStandards: defaultFontStandards,
    spacing: defaultSpacingStandards,
    tolerance: defaultTolerancePx,
  })
})

app.post('/api/audit', async (req, res) => {
  const { url, breakpoints, elements, fontStandards, spacing, tolerance, captureScreenshots } = req.body || {}

  const parsedUrl = parseHttpUrl(url)
  if (!parsedUrl) {
    return res.status(400).json({ error: 'url must be a valid http(s) URL.' })
  }

  try {
    const results = await runAudit({
      url: parsedUrl,
      breakpoints: breakpoints?.length ? breakpoints : defaultBreakpoints,
      elements: elements?.length ? elements : defaultElements,
      fontStandards: fontStandards || defaultFontStandards,
      spacing: spacing?.length ? spacing : defaultSpacingStandards,
      tolerance: typeof tolerance === 'number' ? tolerance : defaultTolerancePx,
      captureScreenshots: captureScreenshots !== false,
    })
    res.json({ results })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Audit failed.' })
  }
})

app.post('/api/seo', async (req, res) => {
  const { url } = req.body || {}
  const parsedUrl = parseHttpUrl(url)
  if (!parsedUrl) {
    return res.status(400).json({ error: 'url must be a valid http(s) URL.' })
  }

  try {
    const data = await extractSeo(parsedUrl)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'SEO check failed.' })
  }
})

app.post('/api/compare', async (req, res) => {
  const { stagingUrl, liveUrl } = req.body || {}
  const parsedStaging = parseHttpUrl(stagingUrl)
  const parsedLive = parseHttpUrl(liveUrl)
  if (!parsedStaging || !parsedLive) {
    return res.status(400).json({ error: 'Both stagingUrl and liveUrl must be valid http(s) URLs.' })
  }

  try {
    const data = await compareContent(parsedStaging, parsedLive)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Compare failed.' })
  }
})

// Streams newline-delimited JSON: one `{ type: 'page', page }` line per page
// as soon as it's crawled, then a final `{ type: 'done', ... }` (or
// `{ type: 'error', ... }`) line. A single buffered JSON response would make
// the client wait for the entire crawl — for a large site that's minutes of
// silence, which reads as a hang and, on hosts with proxy idle timeouts, can
// get the connection killed outright before any results ever arrive.
app.post('/api/crawl', async (req, res) => {
  const { url, maxPages, maxDepth } = req.body || {}
  const parsedUrl = parseHttpUrl(url)
  if (!parsedUrl) {
    return res.status(400).json({ error: 'url must be a valid http(s) URL.' })
  }

  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('X-Accel-Buffering', 'no')

  const send = (obj) => res.write(`${JSON.stringify(obj)}\n`)

  try {
    const result = await crawlSite({
      startUrl: parsedUrl,
      maxPages: Number.isFinite(maxPages) && maxPages > 0 ? Math.min(maxPages, 2000) : 150,
      maxDepth: Number.isFinite(maxDepth) && maxDepth > 0 ? Math.min(maxDepth, 10) : 5,
      onPage: (page) => send({ type: 'page', page }),
    })
    send({
      type: 'done',
      startUrl: result.startUrl,
      totalDiscovered: result.totalDiscovered,
      truncated: result.truncated,
      duplicates: result.duplicates,
    })
  } catch (err) {
    console.error(err)
    send({ type: 'error', error: err.message || 'Crawl failed.' })
  } finally {
    res.end()
  }
})

const PORT = process.env.PORT || 5175
app.listen(PORT, () => {
  console.log(`Website QA server listening on http://localhost:${PORT}`)
})
