import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import StandardsEditor from './components/StandardsEditor.jsx'
import AuditRunner from './components/AuditRunner.jsx'
import SeoChecker from './components/SeoChecker.jsx'
import CompareContent from './components/CompareContent.jsx'
import Crawler from './components/Crawler.jsx'
import FeedbackWidget from './components/FeedbackWidget.jsx'
import {
  defaultBreakpoints,
  defaultElements,
  defaultFontStandards,
  defaultSpacingStandards,
  defaultTolerancePx,
} from './defaultStandards.js'

const navClass = ({ isActive }) => (isActive ? 'active' : '')

export default function App() {
  const [breakpoints, setBreakpoints] = useState(defaultBreakpoints)
  const [elements, setElements] = useState(defaultElements)
  const [fontStandards, setFontStandards] = useState(defaultFontStandards)
  const [spacing, setSpacing] = useState(defaultSpacingStandards)
  const [tolerance, setTolerance] = useState(defaultTolerancePx)

  const missingBackendConfig = import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL

  return (
    <div className="app">
      {missingBackendConfig && (
        <div className="error-box banner-warning">
          No backend URL configured. This deployment only serves the frontend — set{' '}
          <code>VITE_API_BASE_URL</code> in your hosting provider's environment variables to point at where the
          Playwright backend is running, then redeploy.
        </div>
      )}
      <header className="app-header">
        <h1>Website QA</h1>
        <nav className="tabs">
          <NavLink to="/audit" className={navClass}>
            Audit
          </NavLink>
          <NavLink to="/seo" className={navClass}>
            SEO
          </NavLink>
          <NavLink to="/compare" className={navClass}>
            Compare
          </NavLink>
          <NavLink to="/crawler" className={navClass}>
            Crawler
          </NavLink>
          <NavLink to="/standards" className={navClass}>
            Standards
          </NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/audit" replace />} />
          <Route
            path="/audit"
            element={
              <AuditRunner
                breakpoints={breakpoints}
                elements={elements}
                fontStandards={fontStandards}
                spacing={spacing}
                tolerance={tolerance}
              />
            }
          />
          <Route path="/seo" element={<SeoChecker />} />
          <Route path="/compare" element={<CompareContent />} />
          <Route path="/crawler" element={<Crawler />} />
          <Route
            path="/standards"
            element={
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
            }
          />
          <Route path="*" element={<Navigate to="/audit" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        © {new Date().getFullYear()} <a href="https://roydetorre.com/" target="_blank" rel="noreferrer">chusie kokoro</a>. All rights reserved.
      </footer>

      <FeedbackWidget />
    </div>
  )
}
