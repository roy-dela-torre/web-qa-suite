import { useState } from 'react'
import { runCrawl } from '../api.js'

function StatusCell({ page }) {
  if (page.error) return <span className="badge badge-fail">Error</span>
  if (!page.statusCode) return <span className="badge badge-skipped">Unknown</span>
  const cls = page.statusCode >= 400 ? 'badge-fail' : 'badge-pass'
  return <span className={`badge ${cls}`}>{page.statusCode}</span>
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
    try {
      // Pages stream in one at a time as the crawl finds them, so the table
      // below fills in live instead of staying blank until everything is done.
      const result = await runCrawl({ url, maxPages, maxDepth }, (page) => {
        setPages((prev) => [...prev, page])
      })
      setSummary(result)
    } catch (err) {
      // Whatever already streamed in stays on screen — a crawl that fails
      // partway through (e.g. a very large site) doesn't lose prior results.
      setError(err.message)
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
                <th>Internal links found</th>
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
                  <td>{p.internalLinkCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
