import { chromium } from 'playwright'

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))

function evaluateStatus(measured, min, max, tolerance) {
  if (measured === null) return 'Not Found'
  const lo = num(min)
  const hi = num(max)
  if (lo === null && hi === null) return 'Skipped'
  const lowBound = (lo ?? hi) - tolerance
  const highBound = (hi ?? lo) + tolerance
  return measured >= lowBound && measured <= highBound ? 'Pass' : 'Fail'
}

function expectedLabel(min, max) {
  const lo = num(min)
  const hi = num(max)
  if (lo === null && hi === null) return 'No standard set'
  if (lo === hi) return `${lo}px`
  return `${lo ?? '?'}–${hi ?? '?'}px`
}

async function measureFont(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const cs = getComputedStyle(el)
    return {
      fontSize: parseFloat(cs.fontSize),
      lineHeight: cs.lineHeight,
    }
  }, selector)
}

async function measureSpacing(page, selector, property) {
  return page.evaluate(
    ({ sel, prop }) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const cs = getComputedStyle(el)
      const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      const value = parseFloat(cs[camel])
      return Number.isNaN(value) ? null : value
    },
    { sel: selector, prop: property }
  )
}

async function screenshotElement(page, selector) {
  try {
    const locator = page.locator(selector).first()
    const count = await locator.count()
    if (count === 0) return null
    const buffer = await locator.screenshot({ timeout: 5000 }).catch(() => null)
    if (!buffer) return null
    return `data:image/png;base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

export async function runAudit({
  url,
  breakpoints,
  elements,
  fontStandards,
  spacing,
  tolerance = 2,
  captureScreenshots = true,
}) {
  const browser = await chromium.launch()
  const results = []
  try {
    for (const bp of breakpoints) {
      const page = await browser.newPage({ viewport: { width: bp.width, height: 900 } })
      try {
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
        } catch {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        }

        for (const el of elements) {
          const std = fontStandards?.[bp.key]?.[el.key] || { min: null, max: null }
          const measured = await measureFont(page, el.selector)
          const screenshot = captureScreenshots ? await screenshotElement(page, el.selector) : null
          const status = evaluateStatus(measured?.fontSize ?? null, std.min, std.max, tolerance)
          results.push({
            pageLink: url,
            section: el.label,
            property: 'font-size',
            selector: el.selector,
            breakpoint: bp.label,
            expected: expectedLabel(std.min, std.max),
            measured: measured?.fontSize != null ? `${measured.fontSize}px` : '—',
            lineHeight: measured?.lineHeight ?? '—',
            status,
            screenshot,
            remarks:
              status === 'Fail'
                ? `Expected ${expectedLabel(std.min, std.max)}, measured ${measured.fontSize}px`
                : status === 'Not Found'
                ? `Selector "${el.selector}" not found on page`
                : status === 'Skipped'
                ? 'No standard defined for this breakpoint'
                : 'Matches standard',
          })
        }

        for (const sp of spacing) {
          const std = sp[bp.key] || { min: null, max: null }
          const measured = await measureSpacing(page, sp.selector, sp.property)
          const screenshot = captureScreenshots ? await screenshotElement(page, sp.selector) : null
          const status = evaluateStatus(measured, std.min, std.max, tolerance)
          results.push({
            pageLink: url,
            section: sp.label,
            property: sp.property,
            selector: sp.selector,
            breakpoint: bp.label,
            expected: expectedLabel(std.min, std.max),
            measured: measured != null ? `${measured}px` : '—',
            lineHeight: '—',
            status,
            screenshot,
            remarks:
              status === 'Fail'
                ? `Expected ${expectedLabel(std.min, std.max)}, measured ${measured}px`
                : status === 'Not Found'
                ? `Selector "${sp.selector}" not found on page`
                : status === 'Skipped'
                ? 'No standard defined for this breakpoint'
                : 'Matches standard',
          })
        }
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
  return results
}
