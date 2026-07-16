import { chromium } from 'playwright'

// Only the plain <title> and <meta name="description"> are read.
// Open Graph tags (og:title, og:description, ...) are intentionally ignored —
// they're a separate concern from on-page SEO basics.
export async function extractSeo(url) {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    } catch {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    }

    const data = await page.evaluate(() => {
      const clean = (t) => (t || '').replace(/\s+/g, ' ').trim()
      const title = clean(document.title)
      const metaDescEl = document.querySelector('meta[name="description"]')
      const metaDescription = clean(metaDescEl?.getAttribute('content'))
      const h1Els = Array.from(document.querySelectorAll('h1'))
      const h1s = h1Els.map((el) => clean(el.textContent)).filter(Boolean)
      return { title, metaDescription, h1s }
    })

    return {
      url,
      title: data.title || null,
      metaDescription: data.metaDescription || null,
      h1: data.h1s[0] || null,
      h1Count: data.h1s.length,
      allH1s: data.h1s,
    }
  } finally {
    await browser.close()
  }
}
