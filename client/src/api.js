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

// The crawl endpoint streams newline-delimited JSON so pages show up as
// they're found instead of all at once at the end (see server/src/index.js).
// onPage is called with each page result as soon as it arrives; the resolved
// value is the final `{ startUrl, totalDiscovered, truncated }` summary.
export async function runCrawl({ url, maxPages, maxDepth }, onPage) {
  const res = await fetch(`${API_BASE}/api/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, maxPages, maxDepth }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Crawl request failed')
  }
  if (!res.body) throw new Error('This browser does not support streaming responses.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let summary = null

  const handleLine = (line) => {
    if (!line.trim()) return
    const msg = JSON.parse(line)
    if (msg.type === 'page') onPage?.(msg.page)
    else if (msg.type === 'done') summary = msg
    else if (msg.type === 'error') throw new Error(msg.error)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newlineIndex
    while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
      handleLine(buffer.slice(0, newlineIndex))
      buffer = buffer.slice(newlineIndex + 1)
    }
  }
  handleLine(buffer)

  return summary || { startUrl: url, totalDiscovered: 0, truncated: false }
}
