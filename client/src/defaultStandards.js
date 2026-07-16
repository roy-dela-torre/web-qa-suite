// Mirrors server/src/defaultStandards.js — kept as the client's starting point.
// Editing in the Standards tab only changes local state; nothing is persisted server-side.

export const defaultBreakpoints = [
  { key: 'desktop', label: 'Desktop', width: 1440, rangeLabel: '1920 - 1200' },
  { key: 'tablet', label: 'Tablet', width: 900, rangeLabel: '1199 - 768' },
  { key: 'mobile', label: 'Mobile', width: 390, rangeLabel: '767 - 375' },
]

export const defaultElements = [
  { key: 'h1Home', label: 'H1 (Homepage)', selector: 'h1' },
  { key: 'h1', label: 'H1', selector: 'h1' },
  { key: 'h2', label: 'H2', selector: 'h2' },
  { key: 'h3', label: 'H3', selector: 'h3' },
  { key: 'p', label: 'Paragraph', selector: 'p' },
]

const range = (min, max) => ({ min, max })

export const defaultFontStandards = {
  desktop: {
    h1Home: range(80, 80),
    h1: range(50, 50),
    h2: range(45, 45),
    h3: range(26, 26),
    p: range(16, 16),
  },
  tablet: {
    h1Home: range(null, null),
    h1: range(null, null),
    h2: range(null, null),
    h3: range(null, null),
    p: range(null, null),
  },
  mobile: {
    h1Home: range(40, 50),
    h1: range(35, 35),
    h2: range(30, 30),
    h3: range(20, 20),
    p: range(18, 18),
  },
}

export const defaultSpacingStandards = [
  {
    key: 'bottomPadding',
    label: 'Section bottom padding',
    selector: 'section',
    property: 'padding-bottom',
    desktop: range(100, 100),
    tablet: range(70, 70),
    mobile: range(50, 50),
  },
  {
    key: 'sidePadding',
    label: 'Page side padding',
    selector: 'body',
    property: 'padding-left',
    desktop: range(null, null),
    tablet: range(30, 30),
    mobile: range(20, 20),
  },
]

export const defaultTolerancePx = 2
