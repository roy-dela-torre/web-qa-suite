import { useMemo, useState } from 'react'
import { runAuditRequest } from '../api.js'
import { downloadCsv, resultsToCsv } from '../csv.js'

const STATUS_ORDER = ['Fail', 'Not Found', 'Skipped', 'Pass']

function StatusBadge({ status }) {
  return <span className={`badge badge-${status.replace(/\s+/g, '').toLowerCase()}`}>{status}</span>
}

export default function AuditRunner({ breakpoints, elements, fontStandards, spacing, tolerance }) {
  const [url, setUrl] = useState('')
  const [captureScreenshots, setCaptureScreenshots] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState([])
  const [breakpointFilter, setBreakpointFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [lightbox, setLightbox] = useState(null)
  const [exportingExcel, setExportingExcel] = useState(false)

  const exportExcel = async () => {
    setExportingExcel(true)
    try {
      const { exportAuditResults } = await import('../excel.js')
      await exportAuditResults(results)
    } finally {
      setExportingExcel(false)
    }
  }

  const runAudit = async () => {
    setError(null)
    setLoading(true)
    setResults([])
    try {
      const data = await runAuditRequest({
        url,
        breakpoints,
        elements,
        fontStandards,
        spacing,
        tolerance,
        captureScreenshots,
      })
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return results
      .filter((r) => breakpointFilter === 'All' || r.breakpoint === breakpointFilter)
      .filter((r) => statusFilter === 'All' || r.status === statusFilter)
  }, [results, breakpointFilter, statusFilter])

  const summary = useMemo(() => {
    const counts = { Pass: 0, Fail: 0, 'Not Found': 0, Skipped: 0 }
    results.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1
    })
    return counts
  }, [results])

  return (
    <div className="panel">
      <h2>Run an audit</h2>
      <div className="audit-form">
        <input
          className="url-input"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && url && runAudit()}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={captureScreenshots}
            onChange={(e) => setCaptureScreenshots(e.target.checked)}
          />
          Capture screenshots
        </label>
        <button className="run-btn" onClick={runAudit} disabled={loading || !url}>
          {loading ? 'Auditing…' : 'Run audit'}
        </button>
        {results.length > 0 && (
          <>
            <button className="export-btn" onClick={() => downloadCsv('website-qa-results.csv', resultsToCsv(results))}>
              Export CSV
            </button>
            <button className="export-btn" onClick={exportExcel} disabled={exportingExcel}>
              {exportingExcel ? 'Exporting…' : 'Export Excel'}
            </button>
          </>
        )}
      </div>
      {error && <div className="error-box">{error}</div>}
      {loading && <div className="hint">Loading a headless browser and measuring each breakpoint — this can take 10-30s…</div>}

      {results.length > 0 && (
        <>
          <div className="summary-row">
            {STATUS_ORDER.map((s) => (
              <span key={s} className={`summary-chip badge-${s.replace(/\s+/g, '').toLowerCase()}`}>
                {s}: {summary[s] || 0}
              </span>
            ))}
          </div>

          <div className="filter-row">
            <select value={breakpointFilter} onChange={(e) => setBreakpointFilter(e.target.value)}>
              <option>All</option>
              {breakpoints.map((bp) => (
                <option key={bp.key}>{bp.label}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All</option>
              {STATUS_ORDER.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Page link</th>
                  <th>Section</th>
                  <th>Screenshot</th>
                  <th>Breakpoint</th>
                  <th>Expected</th>
                  <th>Measured</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i}>
                    <td className="page-link-cell">
                      <a href={r.pageLink} target="_blank" rel="noreferrer">
                        {r.pageLink}
                      </a>
                    </td>
                    <td>
                      {r.section}
                      <div className="selector-tag">{r.selector}</div>
                    </td>
                    <td>
                      {r.screenshot ? (
                        <img
                          className="thumb"
                          src={r.screenshot}
                          alt={r.section}
                          onClick={() => setLightbox(r.screenshot)}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{r.breakpoint}</td>
                    <td>{r.expected}</td>
                    <td>{r.measured}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="remarks-cell">{r.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Screenshot" />
        </div>
      )}
    </div>
  )
}
