import { useState } from 'react'
import { submitFeedback } from '../api.js'

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

// Floating feedback/issue widget shown on every tab (mounted once in
// App.jsx) so visitors always have a way to flag something without leaving
// the page. Submissions go to the backend's /api/feedback log — this is
// intentionally one-way reporting, not a real-time two-way chat.
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('sending')
    setError(null)
    try {
      await submitFeedback({ message: message.trim(), email: email.trim() || undefined })
      setStatus('sent')
      setMessage('')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  const toggle = () => {
    setOpen((v) => !v)
    // Reset the "sent" confirmation once closed so reopening starts fresh.
    if (open && status === 'sent') setStatus('idle')
  }

  return (
    <div className="feedback-widget">
      {open && (
        <div className="feedback-panel">
          <div className="feedback-panel-header">
            <span>Feedback / report an issue</span>
            <button type="button" className="feedback-close-btn" onClick={toggle} aria-label="Close feedback">
              ×
            </button>
          </div>
          {status === 'sent' ? (
            <p className="feedback-sent">Thanks — your feedback was sent.</p>
          ) : (
            <form onSubmit={submit}>
              <textarea
                className="feedback-textarea"
                placeholder="What needs adjusting, or what's broken?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
              />
              <input
                className="feedback-email-input"
                type="email"
                placeholder="Your email (optional, if you want a reply)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {status === 'error' && <div className="error-box">{error}</div>}
              <button
                className="run-btn feedback-submit-btn"
                type="submit"
                disabled={status === 'sending' || !message.trim()}
              >
                {status === 'sending' ? 'Sending…' : 'Send feedback'}
              </button>
            </form>
          )}
        </div>
      )}
      <button
        type="button"
        className="feedback-fab"
        onClick={toggle}
        aria-label={open ? 'Close feedback' : 'Report an issue or leave feedback'}
      >
        {open ? '×' : <ChatIcon />}
      </button>
    </div>
  )
}
