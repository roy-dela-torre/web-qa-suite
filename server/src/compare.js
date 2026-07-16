import { chromium } from 'playwright'

const SELECTORS = {
  headers: 'h1, h2, h3, h4, h5, h6',
  paragraphs: 'p',
  links: 'a[href]',
  buttons: 'button, input[type="submit"], input[type="button"], [role="button"]',
}

async function extractPageContent(browser, url) {
  const page = await browser.newPage()
  try {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    } catch {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    }

    return await page.evaluate((selectors) => {
      const clean = (t) => (t || '').replace(/\s+/g, ' ').trim()
      const headers = Array.from(document.querySelectorAll(selectors.headers))
        .map((el) => ({ tag: el.tagName.toLowerCase(), text: clean(el.textContent) }))
        .filter((h) => h.text)
      const paragraphs = Array.from(document.querySelectorAll(selectors.paragraphs))
        .map((el) => clean(el.textContent))
        .filter(Boolean)
      const links = Array.from(document.querySelectorAll(selectors.links))
        .map((el) => ({ text: clean(el.textContent), href: el.getAttribute('href') }))
        .filter((l) => l.text || l.href)
      const buttons = Array.from(document.querySelectorAll(selectors.buttons))
        .map((el) => clean(el.textContent || el.value || ''))
        .filter(Boolean)
      return { headers, paragraphs, links, buttons }
    }, SELECTORS)
  } finally {
    await page.close()
  }
}

// Multiset diff: for each distinct item, compare how many times it appears on
// each side. Good enough for "did the content carry over" QA checks without
// needing full sequence alignment.
function diffLists(stagingItems, liveItems, keyFn) {
  const stagingCounts = new Map()
  stagingItems.forEach((item) => {
    const k = keyFn(item)
    stagingCounts.set(k, (stagingCounts.get(k) || 0) + 1)
  })
  const liveCounts = new Map()
  liveItems.forEach((item) => {
    const k = keyFn(item)
    liveCounts.set(k, (liveCounts.get(k) || 0) + 1)
  })

  const allKeys = new Set([...stagingCounts.keys(), ...liveCounts.keys()])
  const rows = []
  for (const key of allKeys) {
    const stagingCount = stagingCounts.get(key) || 0
    const liveCount = liveCounts.get(key) || 0
    let status
    if (stagingCount > 0 && liveCount === 0) status = 'Missing on Live'
    else if (stagingCount === 0 && liveCount > 0) status = 'Added on Live'
    else if (stagingCount === liveCount) status = 'Match'
    else status = 'Count differs'
    rows.push({ content: key, stagingCount, liveCount, status })
  }

  const statusRank = { 'Missing on Live': 0, 'Added on Live': 1, 'Count differs': 2, Match: 3 }
  return rows.sort((a, b) => statusRank[a.status] - statusRank[b.status])
}

function evaluateH1s(pageContent) {
  const values = pageContent.headers.filter((h) => h.tag === 'h1').map((h) => h.text)
  return {
    count: values.length,
    status: values.length === 0 ? 'Missing' : values.length === 1 ? 'Single H1' : 'Multiple H1',
    values,
  }
}

export async function compareContent(stagingUrl, liveUrl) {
  const browser = await chromium.launch()
  try {
    const [staging, live] = await Promise.all([
      extractPageContent(browser, stagingUrl),
      extractPageContent(browser, liveUrl),
    ])
    return {
      h1Evaluation: {
        staging: evaluateH1s(staging),
        live: evaluateH1s(live),
      },
      headers: diffLists(staging.headers, live.headers, (h) => `${h.tag.toUpperCase()}: ${h.text}`),
      paragraphs: diffLists(staging.paragraphs, live.paragraphs, (t) => t),
      links: diffLists(staging.links, live.links, (l) => `${l.text || '(no text)'} → ${l.href}`),
      buttons: diffLists(staging.buttons, live.buttons, (t) => t),
    }
  } finally {
    await browser.close()
  }
}
