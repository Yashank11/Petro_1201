import { useState, useRef, useEffect, useCallback } from 'react'
import { postChat } from '../api/client'

// ── Suggested starter prompts ────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: 'Top Emitters', text: 'Who are the top 5 CO₂ emitters right now?' },
  { label: 'Active Alerts', text: 'Show me all critical flaring alerts today.' },
  { label: 'Oil Prices', text: 'What are the live Brent and WTI crude prices?' },
  { label: 'USA Baseline', text: 'How does USA current flaring compare to the 2024 baseline?' },
  { label: 'Ghawar Field', text: 'Fly to the Ghawar oil field in Saudi Arabia.' },
  { label: 'Carbon Tax', text: 'Calculate EU CBAM tax for 10,000 tonnes of CO₂.' },
  { label: 'Global Pulse', text: 'What is the global emissions pulse status today?' },
  { label: 'Iraq Alerts', text: 'Any anomalous flaring detected in Iraq?' },
]

// ── Markdown-lite renderer for bot replies ───────────────────────────────────
function RenderMarkdown({ text }) {
  const lines = text.split('\n')
  return (
    <div className="copilot-markdown">
      {lines.map((line, i) => {
        // Bold: **text**
        const bolded = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          return (
            <div key={i} className="copilot-bullet"
              dangerouslySetInnerHTML={{ __html: '• ' + bolded.replace(/^[-•]\s*/, '') }} />
          )
        }
        // Headings: ## text
        if (line.startsWith('## ')) {
          return <div key={i} className="copilot-heading">{line.replace('## ', '')}</div>
        }
        // Empty line = spacer
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />
        return <div key={i} dangerouslySetInnerHTML={{ __html: bolded }} style={{ lineHeight: 1.6 }} />
      })}
    </div>
  )
}

// ── Animated thinking indicator ──────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="copilot-thinking">
      <span className="copilot-ai-badge">AI</span>
      <div className="copilot-dots">
        <span /><span /><span />
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>Analysing data…</span>
    </div>
  )
}

// ── Tools used indicator ────────────────────────────────────────────────────
function ToolsUsed({ tools }) {
  if (!tools?.length) return null
  const TOOL_LABELS = {
    get_summary:        '📊 Summary',
    get_top_emitters:   '🏭 Emitters',
    get_alerts:         '🚨 Alerts',
    get_oil_prices:     '💰 Oil Prices',
    get_compare_2024:   '📅 Baseline',
    get_pulse:          '💓 Pulse',
    calculate_carbon_tax: '🧮 Carbon Tax',
    fly_to_location:    '🗺 Map Nav',
    filter_map:         '🔍 Filter',
  }
  return (
    <div className="copilot-tools-used">
      {[...new Set(tools)].map(t => (
        <span key={t} className="copilot-tool-chip">
          {TOOL_LABELS[t] || t}
        </span>
      ))}
    </div>
  )
}

// ── Main PetroCopilot component ──────────────────────────────────────────────
export default function PetroCopilot({ mapRef, summary, days = 5 }) {
  const [open,      setOpen]      = useState(false)
  const [messages,  setMessages]  = useState([
    {
      role: 'model',
      content: `👋 **Welcome to PetroCopilot.**\n\nI'm your AI analyst for the Petro Carbon Intelligence platform. Ask me anything about live flaring data, emissions, regulatory risks, or oil prices — or click one of the quick prompts below.`,
      toolsUsed: [],
    },
  ])
  const [input,     setInput]     = useState('')
  const [thinking,  setThinking]  = useState(false)
  const [mapAction, setMapAction] = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  // Apply map action when received
  useEffect(() => {
    if (!mapAction) return
    if (mapAction.type === 'FLY_TO') {
      if (mapRef?.current?.__flyTo) {
        mapRef.current.__flyTo(mapAction.lon, mapAction.lat, mapAction.zoom || 6)
      }
    }
    if (mapAction.type === 'FILTER_COUNTRY') {
      // Dispatch custom event — App.jsx listens for it
      window.dispatchEvent(new CustomEvent('copilot:filter', { detail: { country: mapAction.country } }))
    }
    setMapAction(null)
  }, [mapAction, mapRef])

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || thinking) return

    const userMsg = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setThinking(true)

    // Build context from current dashboard state
    const context = {
      'active_days_window': days,
      'total_co2_kt': summary?.total_co2_kt ?? 'unknown',
      'anomaly_count': summary?.anomaly_count ?? 'unknown',
      'active_sites': summary?.active_sites ?? 'unknown',
    }

    // Convert to API format (exclude the first welcome message from history)
    const apiMessages = newMessages
      .filter(m => m.role === 'user' || (m.role === 'model' && m !== messages[0]))
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await postChat(apiMessages, context)
      const data = res.data
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: data.reply || 'I could not generate a response. Please try again.',
          toolsUsed: data.toolsUsed || [],
        },
      ])
      if (data.mapAction) {
        setMapAction(data.mapAction)
      }
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err.message || 'Network error'
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: `⚠️ **Error:** ${errMsg}`,
          toolsUsed: [],
          isError: true,
        },
      ])
    } finally {
      setThinking(false)
    }
  }, [messages, thinking, days, summary])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'model',
      content: `👋 **Welcome to PetroCopilot.**\n\nI'm your AI analyst for the Petro Carbon Intelligence platform. Ask me anything about live flaring data, emissions, regulatory risks, or oil prices — or click one of the quick prompts below.`,
      toolsUsed: [],
    }])
    setInput('')
  }

  return (
    <>
      {/* ── Toggle button ──────────────────────────────────────────────── */}
      <button
        id="petrocopilot-toggle"
        className={`copilot-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="PetroCopilot AI"
        aria-label="Toggle PetroCopilot AI panel"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2a10 10 0 0 1 10 10c0 4.42-2.87 8.17-6.84 9.49L12 22l-3.16-.51C4.87 20.17 2 16.42 2 12A10 10 0 0 1 12 2z"/>
            <circle cx="8" cy="12" r="1" fill="currentColor"/>
            <circle cx="12" cy="12" r="1" fill="currentColor"/>
            <circle cx="16" cy="12" r="1" fill="currentColor"/>
          </svg>
        )}
        {!open && (
          <span className="copilot-toggle-label">PetroCopilot</span>
        )}
      </button>

      {/* ── Sliding panel ──────────────────────────────────────────────── */}
      <div className={`copilot-panel ${open ? 'copilot-panel--open' : ''}`} role="dialog" aria-label="PetroCopilot AI Assistant">

        {/* Header */}
        <div className="copilot-header">
          <div className="copilot-header-left">
            <div className="copilot-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 0 1 10 10c0 4.42-2.87 8.17-6.84 9.49L12 22l-3.16-.51C4.87 20.17 2 16.42 2 12A10 10 0 0 1 12 2z"/>
                <circle cx="8" cy="12" r="1" fill="currentColor"/>
                <circle cx="12" cy="12" r="1" fill="currentColor"/>
                <circle cx="16" cy="12" r="1" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <div className="copilot-header-title">PetroCopilot</div>
              <div className="copilot-header-sub">Gemini 2.0 Flash · Function Calling</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div className="copilot-status-dot" />
            <button className="copilot-clear-btn" onClick={clearChat} title="Clear conversation">
              Clear
            </button>
          </div>
        </div>

        {/* Message list */}
        <div className="copilot-messages" id="copilot-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`copilot-msg copilot-msg--${msg.role} ${msg.isError ? 'copilot-msg--error' : ''}`}>
              {msg.role === 'model' && (
                <span className="copilot-ai-badge">AI</span>
              )}
              <div className="copilot-msg-bubble">
                {msg.role === 'model'
                  ? <RenderMarkdown text={msg.content} />
                  : <span>{msg.content}</span>
                }
                {msg.toolsUsed?.length > 0 && <ToolsUsed tools={msg.toolsUsed} />}
              </div>
            </div>
          ))}

          {thinking && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 2 && !thinking && (
          <div className="copilot-quick-prompts">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p.label}
                className="copilot-quick-chip"
                onClick={() => sendMessage(p.text)}
                disabled={thinking}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="copilot-input-area">
          <textarea
            ref={inputRef}
            id="copilot-input"
            className="copilot-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about emissions, alerts, operators, basins…"
            rows={2}
            disabled={thinking}
          />
          <button
            id="copilot-send-btn"
            className={`copilot-send-btn ${thinking ? 'thinking' : ''}`}
            onClick={() => sendMessage(input)}
            disabled={thinking || !input.trim()}
            title="Send (Enter)"
            aria-label="Send message"
          >
            {thinking ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="copilot-spin">
                <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>

        <div className="copilot-footer">
          Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
        </div>
      </div>

      {/* Backdrop (mobile) */}
      {open && <div className="copilot-backdrop" onClick={() => setOpen(false)} />}
    </>
  )
}
