import { useState } from 'react'
import { runCompare } from '../api.js'

const SECTIONS = [
  { key: 'headers', label: 'Headers' },
  { key: 'paragraphs', label: 'Paragraphs' },
  { key: 'links', label: 'Links' },
  { key: 'buttons', label: 'Buttons' },
]

const STATUS_CLASS = {
  Match: 'badge-pass',
  'Missing on Live': 'badge-fail',
  'Added on Live': 'badge-addedonlive',
  'Count differs': 'badge-countdiffers',
}

const H1_STATUS_CLASS = {
  Missing: 'badge-fail',
  'Single H1': 'badge-pass',
  'Multiple H1': 'badge-countdiffers',
}

function H1EvaluationBox({ h1Evaluation }) {
  if (!h1Evaluation) return null
  const sides = [
    { key: 'staging', label: 'Staging' },
    { key: 'live', label: 'Live' },
  ]
  return (
    <div className="panel h1-eval-box">
      <h3>Evaluate page H1 tag</h3>
      <div className="table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>H1 count</th>
              <th>Status</th>
              <th>H1 value(s)</th>
            </tr>
          </thead>
          <tbody>
            {sides.map(({ key, label }) => {
              const data = h1Evaluation[key]
              return (
                <tr key={key}>
                  <td>{label}</td>
                  <td>{data.count}</td>
                  <td>
                    <span className={`badge ${H1_STATUS_CLASS[data.status]}`}>{data.status}</span>
                  </td>
                  <td className="remarks-cell">
                    {data.count === 0 && '—'}
                    {data.count === 1 && data.values[0]}
                    {data.count > 1 && (
                      <ul className="h1-value-list">
                        {data.values.map((v, i) => (
                          <li key={i}>
                            H1-{i + 1}: {v}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DiffTable({ rows }) {
  if (!rows.length) return <p className="hint">No content found for this section on either page.</p>
  return (
    <div className="table-wrap">
      <table className="results-table">
        <thead>
          <tr>
            <th>Content</th>
            <th>Staging count</th>
            <th>Live count</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="remarks-cell">{r.content}</td>
              <td>{r.stagingCount}</td>
              <td>{r.liveCount}</td>
              <td>
                <span className={`badge ${STATUS_CLASS[r.status]}`}>{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CompareContent() {
  const [stagingUrl, setStagingUrl] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [sectionFilter, setSectionFilter] = useState('All')

  const compare = async () => {
    setError(null)
    setLoading(true)
    setData(null)
    try {
      const result = await runCompare(stagingUrl, liveUrl)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const summary = data
    ? SECTIONS.reduce((acc, s) => {
        const rows = data[s.key] || []
        acc[s.key] = {
          mismatches: rows.filter((r) => r.status !== 'Match').length,
          total: rows.length,
        }
        return acc
      }, {})
    : null

  return (
    <div className="panel">
      <h2>Compare staging vs live</h2>
      <p className="hint">
        Fetches both pages and diffs headers, paragraphs, links and buttons by content — flags what's missing, added,
        or changed between the two.
      </p>
      <div className="audit-form">
        <input
          className="url-input"
          type="url"
          placeholder="Staging URL"
          value={stagingUrl}
          onChange={(e) => setStagingUrl(e.target.value)}
        />
        <input
          className="url-input"
          type="url"
          placeholder="Live URL"
          value={liveUrl}
          onChange={(e) => setLiveUrl(e.target.value)}
        />
        <button className="run-btn" onClick={compare} disabled={loading || !stagingUrl || !liveUrl}>
          {loading ? 'Comparing…' : 'Compare'}
        </button>
      </div>
      {error && <div className="error-box">{error}</div>}
      {loading && <div className="hint">Loading both pages and diffing content…</div>}

      {data && (
        <>
          <H1EvaluationBox h1Evaluation={data.h1Evaluation} />

          <div className="summary-row">
            {SECTIONS.map((s) => (
              <span
                key={s.key}
                className={`summary-chip ${summary[s.key].mismatches ? 'badge-fail' : 'badge-pass'}`}
              >
                {s.label}: {summary[s.key].mismatches} diff{summary[s.key].mismatches === 1 ? '' : 's'} /{' '}
                {summary[s.key].total}
              </span>
            ))}
          </div>

          <div className="filter-row">
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
              <option>All</option>
              {SECTIONS.map((s) => (
                <option key={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {SECTIONS.filter((s) => sectionFilter === 'All' || sectionFilter === s.label).map((s) => (
            <div key={s.key} className="compare-section">
              <h3>{s.label}</h3>
              <DiffTable rows={data[s.key] || []} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
