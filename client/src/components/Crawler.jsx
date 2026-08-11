import { useState } from 'react'
import { runCrawl } from '../api.js'

function StatusCell({ page }) {
  if (page.error) return <span className="badge badge-fail">Error</span>
  if (!page.statusCode) return <span className="badge badge-skipped">Unknown</span>
  const cls = page.statusCode >= 400 ? 'badge-fail' : 'badge-pass'
  if (page.redirected && page.redirectChain?.length > 1) {
    const hops = page.redirectChain.map((r) => `${r.status ?? '?'} ${r.url}`).join(' → ')
    return (
      <span className={`badge ${cls}`} title={hops}>
        {page.redirectChain[0].status} → {page.statusCode}
      </span>
    )
  }
  return <span className={`badge ${cls}`}>{page.statusCode}</span>
}

function SchemaCell({ page }) {
  if (!page.schemaTypes || page.schemaTypes.length === 0) {
    return <span className="badge badge-skipped">None</span>
  }
  return <span title={page.schemaTypes.join(', ')}>{page.schemaTypes.join(', ')}</span>
}

function DuplicateCell({ page }) {
  if (!page.isDuplicate) return <span className="badge badge-pass">No</span>
  return (
    <span className="badge badge-fail" title={`Duplicate of:\n${page.duplicateUrls.join('\n')}`}>
      Yes ({page.duplicateUrls.length})
    </span>
  )
}

export default function Crawler() {
  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState(150)
  const [maxDepth, setMaxDepth] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pages, setPages] = useState([])
  const [summary, setSummary] = useState(null)
  const [exportingExcel, setExportingExcel] = useState(false)

  const run = async () => {
    setError(null)
    setLoading(true)
    setPages([])
    setSummary(null)
    // Tracked locally (not read off `pages` state) because state updates
    // made via the onPage callback below aren't visible on the `pages`
    // variable captured in this closure until the next render.
    let streamedCount = 0
    try {
      // Pages stream in one at a time as the crawl finds them, so the table
      // below fills in live instead of staying blank until everything is done.
      const result = await runCrawl({ url, maxPages, maxDepth }, (page) => {
        streamedCount += 1
        setPages((prev) => [...prev, page])
      })
      setSummary(result)
      // Duplicate pages can only be identified once every page has been
      // crawled, so this info arrives on the final summary rather than
      // streamed per-page — merge it into the already-rendered rows.
      if (result.duplicates && Object.keys(result.duplicates).length > 0) {
        setPages((prev) =>
          prev.map((p) =>
            result.duplicates[p.url]
              ? { ...p, isDuplicate: true, duplicateUrls: result.duplicates[p.url] }
              : p
          )
        )
      }
    } catch (err) {
      // Whatever already streamed in stays on screen — a crawl that fails
      // partway through (e.g. a very large site) doesn't lose prior results.
      //
      // A dropped connection (backend crashed/ran out of memory mid-crawl,
      // which large crawls can trigger on a memory-constrained host) surfaces
      // in the browser as a generic "Failed to fetch" / CORS-looking error —
      // there's no real CORS misconfiguration, the response just never
      // arrived. Detect that case and explain it rather than showing the
      // confusing raw message.
      const looksLikeDroppedConnection =
        err instanceof TypeError || /failed to fetch|network|cors/i.test(err.message || '')
      setError(
        looksLikeDroppedConnection && streamedCount > 0
          ? `Lost connection to the backend after ${streamedCount} page(s) — this usually means the backend crashed or ran out of memory partway through (common on large crawls), not an actual CORS problem. Try a smaller "Max pages"/"Max depth", or check the backend's logs. (${err.message})`
          : looksLikeDroppedConnection
            ? `Could not reach the backend — it may be down, waking up from sleep, or ran out of memory. This isn't necessarily a real CORS issue even though the browser reports it that way. (${err.message})`
            : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  const exportExcel = async () => {
    setExportingExcel(true)
    try {
      const { exportCrawlResults } = await import('../excel.js')
      await exportCrawlResults({ pages })
    } finally {
      setExportingExcel(false)
    }
  }

  return (
    <div className="panel">
      <h2>Crawl internal links</h2>
      <p className="hint">
        Starting from a URL, follows links to other pages on the <strong>same domain only</strong> and
        records each page's parent — the first page where a link to it was found while crawling. A blog
        listing page that links out to several posts, for example, shows up as the parent of each post.
        Results appear below as each page is crawled, not all at once at the end.
      </p>
      <div className="audit-form">
        <input
          className="url-input"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && url && run()}
        />
        <label className="checkbox-label">
          Max pages
          <input
            className="width-input"
            type="number"
            min="1"
            max="2000"
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value) || 1)}
          />
        </label>
        <label className="checkbox-label">
          Max depth
          <input
            className="width-input"
            type="number"
            min="0"
            max="10"
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value) || 0)}
          />
        </label>
        <button className="run-btn" onClick={run} disabled={loading || !url}>
          {loading ? 'Crawling…' : 'Start crawl'}
        </button>
        {pages.length > 0 && (
          <button className="export-btn" onClick={exportExcel} disabled={exportingExcel}>
            {exportingExcel ? 'Exporting…' : 'Export Excel'}
          </button>
        )}
      </div>
      {error && <div className="error-box">{error}</div>}
      {loading && (
        <div className="hint">
          Crawling — a real page load per link, so larger sites take a while. {pages.length} page(s) found so far…
        </div>
      )}
      {maxPages > 500 && !loading && !summary && (
        <div className="hint">
          Large crawls (500+ pages) can take a long time — results still show up as they're found, so you
          can watch progress rather than wait for it to finish.
        </div>
      )}

      {summary && (
        <p className="hint">
          Found {pages.length} page(s) on this domain
          {summary.truncated ? ' — stopped early, raise "Max pages"/"Max depth" to keep going.' : '.'}
        </p>
      )}

      {pages.length > 0 && (
        <div className="table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Parent page</th>
                <th>Depth</th>
                <th>Status</th>
                <th>Title</th>
                <th>Meta description</th>
                <th>Schema</th>
                <th>Internal links found</th>
                <th>Duplicate</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.url}>
                  <td className="page-link-cell">
                    <a href={p.url} target="_blank" rel="noreferrer">
                      {p.url}
                    </a>
                  </td>
                  <td className="page-link-cell">
                    {p.parentUrl ? (
                      <a href={p.parentUrl} target="_blank" rel="noreferrer">
                        {p.parentUrl}
                      </a>
                    ) : (
                      <em>(start page)</em>
                    )}
                  </td>
                  <td>{p.depth}</td>
                  <td>
                    <StatusCell page={p} />
                  </td>
                  <td>{p.title || '—'}</td>
                  <td>{p.metaDescription || '—'}</td>
                  <td>
                    <SchemaCell page={p} />
                  </td>
                  <td>{p.internalLinkCount}</td>
                  <td>
                    <DuplicateCell page={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
