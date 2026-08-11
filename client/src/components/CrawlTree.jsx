import { useMemo, useState } from 'react'

// Builds a hierarchy from the flat crawl results using each page's
// parentUrl — the same discovery-order relationship shown in the table's
// "Parent page" column, just rendered as nested nodes instead of rows. A
// page whose parent isn't itself in the crawled set (normally just the
// start page, whose parentUrl is null) becomes a root.
function buildTree(pages) {
  const nodesByUrl = new Map()
  for (const p of pages) {
    nodesByUrl.set(p.url, { ...p, children: [] })
  }
  const roots = []
  for (const node of nodesByUrl.values()) {
    const parent = node.parentUrl && nodesByUrl.get(node.parentUrl)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

function StatusDot({ page }) {
  let cls = 'tree-dot-skipped'
  let label = 'Unknown'
  if (page.error) {
    cls = 'tree-dot-fail'
    label = 'Error'
  } else if (page.statusCode) {
    label = String(page.statusCode)
    if (page.statusCode >= 400) cls = 'tree-dot-fail'
    else if (page.redirected) {
      cls = 'tree-dot-redirect'
      label = `${page.redirectChain[0]?.status ?? '?'} → ${page.statusCode}`
    } else cls = 'tree-dot-pass'
  }
  return <span className={`tree-dot ${cls}`} title={label} />
}

function TreeNode({ node, collapsed, toggleCollapse }) {
  const isCollapsed = collapsed.has(node.url)
  const hasChildren = node.children.length > 0

  return (
    <li className="tree-node">
      <div className="tree-row">
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            onClick={() => toggleCollapse(node.url)}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span className="tree-toggle-spacer" />
        )}
        <StatusDot page={node} />
        <a href={node.url} target="_blank" rel="noreferrer" className="tree-link" title={node.url}>
          {node.title || node.url}
        </a>
        {node.isDuplicate && (
          <span className="badge badge-fail tree-dup-badge" title={`Duplicate of:\n${node.duplicateUrls.join('\n')}`}>
            Dup
          </span>
        )}
        {hasChildren && <span className="tree-count">{node.children.length}</span>}
      </div>
      {hasChildren && !isCollapsed && (
        <ul className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.url} node={child} collapsed={collapsed} toggleCollapse={toggleCollapse} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function CrawlTree({ pages }) {
  const [collapsed, setCollapsed] = useState(() => new Set())
  const roots = useMemo(() => buildTree(pages), [pages])
  const parentUrls = useMemo(() => new Set(pages.map((p) => p.parentUrl).filter(Boolean)), [pages])

  const toggleCollapse = (url) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  return (
    <div>
      <div className="tree-controls">
        <button type="button" className="export-btn" onClick={() => setCollapsed(new Set())}>
          Expand all
        </button>
        <button type="button" className="export-btn" onClick={() => setCollapsed(new Set(parentUrls))}>
          Collapse all
        </button>
      </div>
      <div className="tree-wrap">
        <ul className="tree-root">
          {roots.map((root) => (
            <TreeNode key={root.url} node={root} collapsed={collapsed} toggleCollapse={toggleCollapse} />
          ))}
        </ul>
      </div>
    </div>
  )
}
