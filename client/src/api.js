// In local dev this stays empty and requests go through the Vite proxy
// (see vite.config.js). In production (e.g. Vercel), set VITE_API_BASE_URL
// to wherever the backend is actually deployed — Vercel only hosts this
// static frontend, not the Playwright backend (see README).
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function postJson(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request to ${path} failed`)
  return data
}

export async function runAuditRequest(payload) {
  const data = await postJson('/api/audit', payload)
  return data.results
}

export async function runSeoCheck(url) {
  return postJson('/api/seo', { url })
}

export async function runCompare(stagingUrl, liveUrl) {
  return postJson('/api/compare', { stagingUrl, liveUrl })
}

export async function runCrawl({ url, maxPages, maxDepth }) {
  return postJson('/api/crawl', { url, maxPages, maxDepth })
}
