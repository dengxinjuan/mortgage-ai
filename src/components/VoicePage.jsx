import { useEffect, useRef, useState } from 'react'
import Vapi from '@vapi-ai/web'

const VAPI_PUBLIC_KEY   = import.meta.env.VITE_VAPI_PUBLIC_KEY   || ''
const RATE_AGENT_ID     = import.meta.env.VITE_VAPI_RATE_AGENT_ID    || ''
const SUPPORT_AGENT_ID  = import.meta.env.VITE_VAPI_SUPPORT_AGENT_ID || ''

const LOAN_TYPE_LABELS = {
  '30yr-fixed': '30-Year Fixed',
  '15yr-fixed': '15-Year Fixed',
  variable:     'Variable Rate',
}

const CREDIT_LABELS = {
  excellent: 'Excellent (750+)',
  good:      'Good (700–749)',
  fair:      'Fair (650–699)',
  poor:      'Poor (<650)',
}

export default function VoicePage({ userData, onBack }) {
  const vapiRef        = useRef(null)
  const logEndRef      = useRef(null)

  const [callStatus, setCallStatus]       = useState('idle')   // idle | connecting | active | ended
  const [isMuted, setIsMuted]             = useState(false)
  const [isSpeaking, setIsSpeaking]       = useState(false)
  const [latestLine, setLatestLine]       = useState('')
  const [transcript, setTranscript]       = useState([])
  const [activeAgent, setActiveAgent]     = useState('rate')
  const [callError, setCallError]         = useState('')

  // Init Vapi once
  useEffect(() => {
    if (!VAPI_PUBLIC_KEY) return
    const vapi = new Vapi(VAPI_PUBLIC_KEY)
    vapiRef.current = vapi

    vapi.on('call-start',   () => setCallStatus('active'))
    vapi.on('call-end',     () => { setCallStatus('ended'); setIsSpeaking(false) })
    vapi.on('speech-start', () => setIsSpeaking(true))
    vapi.on('speech-end',   () => setIsSpeaking(false))
    vapi.on('error',        (e) => {
      console.error('Vapi error:', e)
      setCallError(e?.message || JSON.stringify(e) || 'Unknown error')
      setCallStatus('ended')
    })

    vapi.on('message', (msg) => {
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        const entry = { role: msg.role, text: msg.transcript, id: Date.now() }
        setTranscript(prev => [...prev, entry])
        if (msg.role === 'assistant') setLatestLine(msg.transcript)
      }
    })

    return () => { vapi.stop() }
  }, [])

  // Auto-scroll transcript log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  function startCall() {
    if (!vapiRef.current) return
    setCallStatus('connecting')
    setCallError('')
    setTranscript([])
    setLatestLine('')

    const agentId = activeAgent === 'rate' ? RATE_AGENT_ID : SUPPORT_AGENT_ID
    const loanFmt = userData?.loan ? `$${(+userData.loan).toLocaleString()}` : 'your loan'
    const downPct = userData?.loan && userData?.down
      ? Math.round((userData.down / userData.loan) * 100) + '% down'
      : ''
    const creditLabel = CREDIT_LABELS[userData?.creditScore] || ''

    vapiRef.current.start(agentId, {
      firstMessage: `Hi ${userData?.name || 'there'}! Based on your profile — ${loanFmt}, ${downPct}, ${creditLabel} credit — your estimated rate is ${userData?.rate}%. Want me to walk you through your options?`,
      variableValues: {
        userName:       userData?.name || '',
        loanAmount:     userData?.loan || 0,
        downPayment:    userData?.down || 0,
        rate:           userData?.rate || 0,
        monthlyPayment: userData?.monthly || 0,
        loanType:       LOAN_TYPE_LABELS[userData?.loanType] || '',
        creditScore:    creditLabel,
      },
    })
  }

  function endCall() {
    vapiRef.current?.stop()
    setCallStatus('ended')
    setIsSpeaking(false)
  }

  function toggleMute() {
    if (!vapiRef.current) return
    const next = !isMuted
    vapiRef.current.setMuted(next)
    setIsMuted(next)
  }

  function switchAgent(agent) {
    if (callStatus === 'active') endCall()
    setActiveAgent(agent)
    setCallStatus('idle')
    setTranscript([])
    setLatestLine('')
  }

  const statusLabel = {
    idle:       'Ready',
    connecting: 'Connecting…',
    active:     'Live',
    ended:      'Call Ended',
  }

  return (
    <div className="voice-page">

      {/* Header */}
      <header className="voice-header">
        <div className="voice-header-logo">
          <div className="header-logo-icon">M</div>
          <span className="header-logo-name">Mortgage AI</span>
        </div>

        <div className={`voice-status-pill ${callStatus}`}>
          <div className={`status-dot ${callStatus}`} />
          {statusLabel[callStatus]}
        </div>

        <button className="btn-outline" onClick={onBack} style={{ fontSize: '0.8rem' }}>
          ← Back to Form
        </button>
      </header>

      {/* Body */}
      <div className="voice-body">

        {/* ── Left sidebar ── */}
        <aside className="voice-sidebar-left">
          <div>
            <p className="sidebar-section-title">Client Profile</p>
            <div className="profile-card">
              <div className="profile-avatar">
                {userData?.name ? userData.name[0].toUpperCase() : '?'}
              </div>
              <p className="profile-name">{userData?.name || '—'}</p>
              <p className="profile-email">{userData?.email || '—'}</p>
            </div>
          </div>

          <div>
            <p className="sidebar-section-title">Rate Summary</p>
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
              <span className="summary-rate-big">{userData?.rate}</span>
              <span className="summary-rate-pct">%</span>
            </div>
            {[
              { label: 'Loan Amount',    value: userData?.loan    ? `$${(+userData.loan).toLocaleString()}`    : '—' },
              { label: 'Down Payment',   value: userData?.down    ? `$${(+userData.down).toLocaleString()}`    : '—' },
              { label: 'Monthly Est.',   value: userData?.monthly ? `$${(+userData.monthly).toLocaleString()}` : '—' },
              { label: 'Loan Type',      value: LOAN_TYPE_LABELS[userData?.loanType] || '—' },
              { label: 'Credit Score',   value: CREDIT_LABELS[userData?.creditScore]   || '—' },
            ].map(r => (
              <div className="summary-row" key={r.label}>
                <span className="summary-label">{r.label}</span>
                <span className="summary-value">{r.value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Center stage ── */}
        <main className="voice-center">

          {callStatus === 'idle' && (
            <div className="start-prompt">
              <p className="start-prompt-title">Ready to Talk?</p>
              <p className="start-prompt-sub">
                Your rate is {userData?.rate}% — press start and the AI advisor will greet you.
              </p>
            </div>
          )}

          {/* Orb */}
          <div className="orb-wrapper">
            <div className="orb-ring" />
            <div className="orb-ring" />
            <div className="orb-ring" />
            <div className={`orb ${isSpeaking ? 'speaking' : 'idle-state'}`}>
              <div className="orb-inner-shine" />
            </div>
          </div>

          {/* Waveform */}
          <div className="waveform">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`wave-bar ${isSpeaking ? 'active' : ''}`}
                style={{ height: isSpeaking ? undefined : '6px', opacity: isSpeaking ? 1 : 0.25 }}
              />
            ))}
          </div>

          {/* Transcript bubble */}
          <div className="transcript-bubble">
            {latestLine
              ? <p className="transcript-bubble-text">"{latestLine}"</p>
              : <p className="transcript-bubble-placeholder">
                  {callStatus === 'idle'    ? 'AI response will appear here…'  : ''}
                  {callStatus === 'connecting' ? 'Connecting to AI advisor…'    : ''}
                  {callStatus === 'active'  ? 'Listening…'                      : ''}
                  {callStatus === 'ended'   ? 'Call ended. Start a new call to continue.' : ''}
                </p>
            }
          </div>

          {/* Controls */}
          <div className="voice-controls">
            <div className="ctrl-item">
              <button
                className={`ctrl-btn mute ${isMuted ? 'on' : ''}`}
                onClick={toggleMute}
                disabled={callStatus !== 'active'}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? '🔇' : '🎤'}
              </button>
              <span className="ctrl-label">{isMuted ? 'Unmute' : 'Mute'}</span>
            </div>

            <div className="ctrl-item">
              {callStatus !== 'active' && callStatus !== 'connecting' ? (
                <>
                  <button className="ctrl-btn call-start" onClick={startCall} title="Start Call">📞</button>
                  <span className="ctrl-label">Start</span>
                </>
              ) : (
                <>
                  <button className="ctrl-btn call-end" onClick={endCall} title="End Call">📵</button>
                  <span className="ctrl-label">End Call</span>
                </>
              )}
            </div>

            <div className="ctrl-item">
              <button className="ctrl-btn speaker" title="Speaker (always on)">🔊</button>
              <span className="ctrl-label">Speaker</span>
            </div>
          </div>

          {callError && (
            <p style={{ color: '#e87878', fontSize: '0.78rem', textAlign: 'center', maxWidth: '380px', padding: '10px 14px', background: 'rgba(220,80,80,0.08)', borderRadius: '8px', border: '1px solid rgba(220,80,80,0.2)' }}>
              Error: {callError}
            </p>
          )}

          {!VAPI_PUBLIC_KEY && (
            <p style={{ color: '#e87878', fontSize: '0.78rem', textAlign: 'center', maxWidth: '340px' }}>
              Add <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>VITE_VAPI_PUBLIC_KEY</code> and <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>VITE_VAPI_RATE_AGENT_ID</code> to your <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>.env</code> file to enable the AI voice call.
            </p>
          )}
        </main>

        {/* ── Right sidebar ── */}
        <aside className="voice-sidebar-right">
          <div>
            <p className="sidebar-section-title">Agent</p>
            <div className="agent-switch">
              {[
                { id: 'rate',    icon: '📊', name: 'Rate Advisor',  desc: 'Explains rates & options' },
                { id: 'support', icon: '💬', name: 'Support Agent', desc: 'Follow-up questions'      },
              ].map(a => (
                <button
                  key={a.id}
                  className={`agent-btn ${activeAgent === a.id ? 'active' : 'inactive'}`}
                  onClick={() => switchAgent(a.id)}
                >
                  <div className="agent-btn-icon">{a.icon}</div>
                  <div>
                    <p className="agent-btn-name">{a.name}</p>
                    <p className="agent-btn-desc">{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <p className="sidebar-section-title">Live Transcript</p>
            <div className="transcript-log">
              {transcript.length === 0
                ? <p className="transcript-empty">Transcript will appear here during the call.</p>
                : transcript.map(entry => (
                  <div key={entry.id} className={`transcript-entry ${entry.role}`}>
                    <p className="transcript-entry-role">
                      {entry.role === 'assistant' ? '🤖 AI Advisor' : '👤 You'}
                    </p>
                    {entry.text}
                  </div>
                ))
              }
              <div ref={logEndRef} />
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}
