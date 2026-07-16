import { useState } from 'react'
import StandardsEditor from './components/StandardsEditor.jsx'
import AuditRunner from './components/AuditRunner.jsx'
import SeoChecker from './components/SeoChecker.jsx'
import CompareContent from './components/CompareContent.jsx'
import {
  defaultBreakpoints,
  defaultElements,
  defaultFontStandards,
  defaultSpacingStandards,
  defaultTolerancePx,
} from './defaultStandards.js'

export default function App() {
  const [tab, setTab] = useState('audit')
  const [breakpoints, setBreakpoints] = useState(defaultBreakpoints)
  const [elements, setElements] = useState(defaultElements)
  const [fontStandards, setFontStandards] = useState(defaultFontStandards)
  const [spacing, setSpacing] = useState(defaultSpacingStandards)
  const [tolerance, setTolerance] = useState(defaultTolerancePx)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Website QA</h1>
        <nav className="tabs">
          <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>
            Audit
          </button>
          <button className={tab === 'seo' ? 'active' : ''} onClick={() => setTab('seo')}>
            SEO
          </button>
          <button className={tab === 'compare' ? 'active' : ''} onClick={() => setTab('compare')}>
            Compare
          </button>
          <button className={tab === 'standards' ? 'active' : ''} onClick={() => setTab('standards')}>
            Standards
          </button>
        </nav>
      </header>

      <main>
        {tab === 'audit' && (
          <AuditRunner
            breakpoints={breakpoints}
            elements={elements}
            fontStandards={fontStandards}
            spacing={spacing}
            tolerance={tolerance}
          />
        )}
        {tab === 'seo' && <SeoChecker />}
        {tab === 'compare' && <CompareContent />}
        {tab === 'standards' && (
          <StandardsEditor
            breakpoints={breakpoints}
            setBreakpoints={setBreakpoints}
            elements={elements}
            setElements={setElements}
            fontStandards={fontStandards}
            setFontStandards={setFontStandards}
            spacing={spacing}
            setSpacing={setSpacing}
            tolerance={tolerance}
            setTolerance={setTolerance}
          />
        )}
      </main>
    </div>
  )
}
