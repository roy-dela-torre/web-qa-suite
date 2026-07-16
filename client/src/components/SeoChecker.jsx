import { useState } from 'react'
import { runSeoCheck } from '../api.js'

function ValueRow({ label, value }) {
  const missing = !value
  return (
    <div className="seo-row">
      <div className="seo-label">{label}</div>
      <div className={missing ? 'seo-value seo-missing' : 'seo-value'}>
        {missing ? <span className="badge badge-fail">Missing</span> : value}
      </div>
    </div>
  )
}

export default function SeoChecker() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const check = async () => {
    setError(null)
    setLoading(true)
    setData(null)
    try {
      const result = await runSeoCheck(url)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <h2>SEO meta check</h2>
      <p className="hint">
        One click reads the page's &lt;title&gt;, &lt;meta name="description"&gt; and H1 — Open Graph tags (og:title,
        og:description, ...) are intentionally not read.
      </p>
      <div className="audit-form">
        <input
          className="url-input"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && url && check()}
        />
        <button className="run-btn" onClick={check} disabled={loading || !url}>
          {loading ? 'Checking…' : 'Check SEO'}
        </button>
      </div>
      {error && <div className="error-box">{error}</div>}

      {data && (
        <div className="seo-card">
          <ValueRow label="Title tag" value={data.title} />
          <ValueRow label="Meta description" value={data.metaDescription} />
          <ValueRow label="H1" value={data.h1} />
          {data.h1Count > 1 && (
            <div className="seo-warning">
              ⚠ {data.h1Count} &lt;h1&gt; elements found on this page (best practice is exactly one):
              <ul>
                {data.allH1s.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
