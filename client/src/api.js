async function postJson(path, payload) {
  const res = await fetch(path, {
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
