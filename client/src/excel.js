import ExcelJS from 'exceljs'

function addSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(name.slice(0, 31)) // Excel sheet name length limit
  sheet.columns = columns
  sheet.addRows(rows)
  sheet.getRow(1).font = { bold: true }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  return sheet
}

async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function exportAuditResults(results, filename = 'website-qa-audit.xlsx') {
  const workbook = new ExcelJS.Workbook()
  addSheet(
    workbook,
    'Audit Results',
    [
      { header: 'Page link', key: 'pageLink', width: 32 },
      { header: 'Section', key: 'section', width: 20 },
      { header: 'Property', key: 'property', width: 16 },
      { header: 'Breakpoint', key: 'breakpoint', width: 12 },
      { header: 'Expected', key: 'expected', width: 14 },
      { header: 'Measured', key: 'measured', width: 14 },
      { header: 'Line height', key: 'lineHeight', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Remarks', key: 'remarks', width: 40 },
    ],
    results
  )
  await downloadWorkbook(workbook, filename)
}

export async function exportSeoCheck(data, filename = 'website-qa-seo.xlsx') {
  const workbook = new ExcelJS.Workbook()
  addSheet(
    workbook,
    'SEO Summary',
    [
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Value', key: 'value', width: 60 },
    ],
    [
      { field: 'Page URL', value: data.url },
      { field: 'Title tag', value: data.title || 'Missing' },
      { field: 'Meta description', value: data.metaDescription || 'Missing' },
      { field: 'H1', value: data.h1 || 'Missing' },
      { field: 'H1 count', value: data.h1Count },
      ...data.allH1s.slice(1).map((h, i) => ({ field: `H1-${i + 2}`, value: h })),
    ]
  )
  await downloadWorkbook(workbook, filename)
}

function h1EvaluationRows(h1Evaluation) {
  const rows = []
  for (const [side, label] of [
    ['staging', 'Staging'],
    ['live', 'Live'],
  ]) {
    const data = h1Evaluation[side]
    rows.push({
      page: label,
      count: data.count,
      status: data.status,
      values: data.values.join(' | ') || '—',
    })
  }
  return rows
}

export async function exportCrawlResults(data, filename = 'website-qa-crawl.xlsx') {
  const workbook = new ExcelJS.Workbook()
  addSheet(
    workbook,
    'Crawled Pages',
    [
      { header: 'URL', key: 'url', width: 55 },
      { header: 'Parent page', key: 'parentUrl', width: 55 },
      { header: 'Depth', key: 'depth', width: 8 },
      { header: 'Status', key: 'statusCode', width: 10 },
      { header: 'Redirected from status', key: 'redirectedFromStatus', width: 20 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Meta description', key: 'metaDescription', width: 50 },
      { header: 'Canonical URL', key: 'canonicalUrl', width: 55 },
      { header: 'Schema types', key: 'schemaTypesStr', width: 30 },
      { header: 'Internal links found', key: 'internalLinkCount', width: 18 },
      { header: 'Duplicate page', key: 'duplicateStr', width: 40 },
      { header: 'Error', key: 'error', width: 30 },
    ],
    data.pages.map((p) => ({
      ...p,
      parentUrl: p.parentUrl || '(start page)',
      redirectedFromStatus: p.redirected && p.redirectChain?.length ? p.redirectChain[0].status : '',
      metaDescription: p.metaDescription || '',
      canonicalUrl: p.canonicalUrl || '',
      schemaTypesStr: (p.schemaTypes || []).join(', '),
      duplicateStr: p.isDuplicate ? `Yes — ${(p.duplicateUrls || []).join(', ')}` : 'No',
    }))
  )
  await downloadWorkbook(workbook, filename)
}

export async function exportCompareResults(data, filename = 'website-qa-compare.xlsx') {
  const workbook = new ExcelJS.Workbook()

  addSheet(
    workbook,
    'H1 Evaluation',
    [
      { header: 'Page', key: 'page', width: 12 },
      { header: 'H1 count', key: 'count', width: 10 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'H1 value(s)', key: 'values', width: 60 },
    ],
    h1EvaluationRows(data.h1Evaluation)
  )

  const diffColumns = [
    { header: 'Content', key: 'content', width: 60 },
    { header: 'Staging count', key: 'stagingCount', width: 14 },
    { header: 'Live count', key: 'liveCount', width: 12 },
    { header: 'Status', key: 'status', width: 16 },
  ]
  addSheet(workbook, 'Headers', diffColumns, data.headers)
  addSheet(workbook, 'Paragraphs', diffColumns, data.paragraphs)
  addSheet(workbook, 'Links', diffColumns, data.links)
  addSheet(workbook, 'Buttons', diffColumns, data.buttons)

  await downloadWorkbook(workbook, filename)
}
