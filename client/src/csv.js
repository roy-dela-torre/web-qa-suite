function escapeCell(value) {
  const str = String(value ?? '')
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function resultsToCsv(results) {
  const headers = [
    'Page link',
    'Section',
    'Property',
    'Breakpoint',
    'Expected',
    'Measured',
    'Line height',
    'Status',
    'Remarks',
  ]
  const rows = results.map((r) => [
    r.pageLink,
    r.section,
    r.property,
    r.breakpoint,
    r.expected,
    r.measured,
    r.lineHeight,
    r.status,
    r.remarks,
  ])
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n')
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
