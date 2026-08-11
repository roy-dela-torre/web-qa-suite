import fs from 'node:fs'
import path from 'node:path'

// Plain append-only JSON-lines file. Hosts like Render's free plan have no
// attached persistent disk, so this resets whenever the container
// restarts/redeploys — each entry is also echoed to stdout via console.log
// so it still shows up in the host's log history even after that happens.
const FEEDBACK_LOG_PATH = path.join(process.cwd(), 'feedback.jsonl')

export function recordFeedback({ message, email, pageUrl, userAgent }) {
  const entry = {
    timestamp: new Date().toISOString(),
    message,
    email: email || null,
    pageUrl: pageUrl || null,
    userAgent: userAgent || null,
  }
  console.log('[feedback]', JSON.stringify(entry))
  try {
    fs.appendFileSync(FEEDBACK_LOG_PATH, `${JSON.stringify(entry)}\n`)
  } catch (err) {
    console.error('Failed to persist feedback to disk:', err)
  }
  return entry
}

export function listFeedback() {
  let raw
  try {
    raw = fs.readFileSync(FEEDBACK_LOG_PATH, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') return []
    throw err
  }
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .reverse()
}
