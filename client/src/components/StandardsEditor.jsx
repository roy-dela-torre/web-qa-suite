function RangeInput({ value, onChange }) {
  return (
    <div className="range-input">
      <input
        type="number"
        placeholder="min"
        value={value.min ?? ''}
        onChange={(e) => onChange({ ...value, min: e.target.value === '' ? null : Number(e.target.value) })}
      />
      <span className="range-sep">–</span>
      <input
        type="number"
        placeholder="max"
        value={value.max ?? ''}
        onChange={(e) => onChange({ ...value, max: e.target.value === '' ? null : Number(e.target.value) })}
      />
    </div>
  )
}

export default function StandardsEditor({
  breakpoints,
  setBreakpoints,
  elements,
  setElements,
  fontStandards,
  setFontStandards,
  spacing,
  setSpacing,
  tolerance,
  setTolerance,
}) {
  const updateFont = (bpKey, elKey, next) => {
    setFontStandards((prev) => ({
      ...prev,
      [bpKey]: { ...prev[bpKey], [elKey]: next },
    }))
  }

  const updateSpacing = (spKey, bpKey, next) => {
    setSpacing((prev) => prev.map((row) => (row.key === spKey ? { ...row, [bpKey]: next } : row)))
  }

  const updateElement = (elKey, field, value) => {
    setElements((prev) => prev.map((el) => (el.key === elKey ? { ...el, [field]: value } : el)))
  }

  const updateSpacingMeta = (spKey, field, value) => {
    setSpacing((prev) => prev.map((row) => (row.key === spKey ? { ...row, [field]: value } : row)))
  }

  const updateBreakpointWidth = (bpKey, width) => {
    setBreakpoints((prev) => prev.map((bp) => (bp.key === bpKey ? { ...bp, width: Number(width) } : bp)))
  }

  return (
    <div className="panel">
      <h2>Font size standards</h2>
      <p className="hint">
        Min/max define an acceptable px range per breakpoint. Set min = max for an exact target, or leave both blank
        to skip that check.
      </p>
      <div className="table-wrap">
        <table className="standards-table">
          <thead>
            <tr>
              <th>Breakpoint</th>
              <th>Test width (px)</th>
              {elements.map((el) => (
                <th key={el.key}>{el.label}</th>
              ))}
            </tr>
            <tr className="selector-row">
              <th />
              <th />
              {elements.map((el) => (
                <th key={el.key}>
                  <input
                    className="selector-input"
                    value={el.selector}
                    onChange={(e) => updateElement(el.key, 'selector', e.target.value)}
                    title="CSS selector"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {breakpoints.map((bp) => (
              <tr key={bp.key}>
                <td className="bp-label">
                  {bp.label}
                  <div className="bp-range">{bp.rangeLabel}</div>
                </td>
                <td>
                  <input
                    type="number"
                    className="width-input"
                    value={bp.width}
                    onChange={(e) => updateBreakpointWidth(bp.key, e.target.value)}
                  />
                </td>
                {elements.map((el) => (
                  <td key={el.key}>
                    <RangeInput
                      value={fontStandards[bp.key]?.[el.key] ?? { min: null, max: null }}
                      onChange={(next) => updateFont(bp.key, el.key, next)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Spacing standards</h2>
      <p className="hint">Checks an arbitrary CSS selector + property (padding, margin, etc.) per breakpoint.</p>
      <div className="table-wrap">
        <table className="standards-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Selector</th>
              <th>CSS property</th>
              {breakpoints.map((bp) => (
                <th key={bp.key}>{bp.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spacing.map((row) => (
              <tr key={row.key}>
                <td>
                  <input value={row.label} onChange={(e) => updateSpacingMeta(row.key, 'label', e.target.value)} />
                </td>
                <td>
                  <input
                    className="selector-input"
                    value={row.selector}
                    onChange={(e) => updateSpacingMeta(row.key, 'selector', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="selector-input"
                    value={row.property}
                    onChange={(e) => updateSpacingMeta(row.key, 'property', e.target.value)}
                  />
                </td>
                {breakpoints.map((bp) => (
                  <td key={bp.key}>
                    <RangeInput
                      value={row[bp.key] ?? { min: null, max: null }}
                      onChange={(next) => updateSpacing(row.key, bp.key, next)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tolerance-row">
        <label>
          Tolerance (± px)
          <input
            type="number"
            min="0"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  )
}
