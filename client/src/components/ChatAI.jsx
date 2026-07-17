import { useState } from 'react'
import { sendChatMessage } from '../api.js'

export default function ChatAI() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setLoading(true)
    try {
      const reply = await sendChatMessage(nextMessages)
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    setMessages([])
    setInput('')
    setError(null)
  }

  return (
    <div className="panel chat-panel">
      <h2>AI Chat</h2>
      <p className="hint">Chat with Claude — ask questions, brainstorm, or get help with anything.</p>

      <div className="chat-messages">
        {messages.length === 0 && <p className="hint">Send a message to start the conversation.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`chat-message chat-message-${m.role}`}>
            <div className="chat-message-role">{m.role === 'user' ? 'You' : 'Claude'}</div>
            <div className="chat-message-content">{m.content}</div>
          </div>
        ))}
        {loading && <div className="hint">Claude is thinking…</div>}
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          placeholder="Message Claude…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="run-btn" onClick={send} disabled={loading || !input.trim()}>
          Send
        </button>
        <button className="export-btn" onClick={clear} disabled={loading || !messages.length}>
          Clear
        </button>
      </div>
    </div>
  )
}
