function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Per the sitemaps.org protocol, a sitemap should only list URLs that
// actually resolve — so pages with errors, non-2xx statuses, or redirects
// (the redirect's *destination* is what should be listed, and it's already
// in `pages` as its own entry) are excluded. Duplicate-content pages are
// also collapsed to a single canonical URL per group, so search engines
// aren't pointed at several URLs serving the same content.
export async function exportSitemap(pages, filename = 'sitemap.xml') {
  const seenDuplicateGroups = new Set()
  const urls = []

  for (const p of pages) {
    if (p.error || !p.statusCode || p.statusCode < 200 || p.statusCode >= 300) continue

    if (p.isDuplicate) {
      const groupKey = [p.url, ...(p.duplicateUrls || [])].sort().join('|')
      if (seenDuplicateGroups.has(groupKey)) continue
      seenDuplicateGroups.add(groupKey)
    }

    urls.push(p.url)
  }

  const body = urls.map((u) => `  <url>\n    <loc>${escapeXml(u)}</loc>\n  </url>`).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

  await downloadFile(xml, filename, 'application/xml')
}
