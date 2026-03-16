import { useEffect, useRef, useState } from 'react'
import Vapi from '@vapi-ai/web'

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || ''
const RATE_AGENT_ID = import.meta.env.VITE_VAPI_RATE_AGENT_ID || ''
const EDUCATIONAL_AGENT_ID = import.meta.env.VITE_VAPI_EDUCATIONAL_AGENT_ID || ''
const FOLLOWUP_AGENT_ID = import.meta.env.VITE_VAPI_FOLLOWUP_AGENT_ID || ''
const SQUAD_ID = import.meta.env.VITE_VAPI_SQUAD_ID || ''

const LOAN_TYPE_LABELS = {
  '30yr-fixed': '30-Year Fixed',
  '15yr-fixed': '15-Year Fixed',
  variable: 'Variable Rate',
}

const CREDIT_LABELS = {
  excellent: 'Excellent (750+)',
  good: 'Good (700–749)',
  fair: 'Fair (650–699)',
  poor: 'Poor (<650)',
}

export default function VoicePage({ userData, onBack }) {
  const vapiRef = useRef(null)
  const logEndRef = useRef(null)

  const [callStatus, setCallStatus] = useState('idle')   // idle | connecting | active | ended
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [latestLine, setLatestLine] = useState('')
  const [transcript, setTranscript] = useState([])
  const [activeAgent, setActiveAgent] = useState('rate')
  const [callError, setCallError] = useState('')
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('+1')
  const [callRequested, setCallRequested] = useState(false) // 'idle' | 'sending' | 'sent' | 'error'
  const [callReqStatus, setCallReqStatus] = useState('idle')
  const [callReqError, setCallReqError] = useState('')

  // Init Vapi once
  useEffect(() => {
    if (!VAPI_PUBLIC_KEY) return
    const vapi = new Vapi(VAPI_PUBLIC_KEY)
    vapiRef.current = vapi

    vapi.on('call-start', () => setCallStatus('active'))
    vapi.on('call-end', () => {
      setCallStatus('ended')
      setIsSpeaking(false)
      setShowFollowUp(true)
    })
    vapi.on('speech-start', () => setIsSpeaking(true))
    vapi.on('speech-end', () => setIsSpeaking(false))
    vapi.on('error', (e) => {
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

      if (msg.type === 'assistant.started') {
        const id = msg.newAssistant?.id || ''
        if (id === RATE_AGENT_ID) setActiveAgent('rate')
        if (id === EDUCATIONAL_AGENT_ID) setActiveAgent('educational')
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
    setShowFollowUp(false)
    setPhoneNumber('+1')
    setCallReqStatus('idle')
    setActiveAgent('rate')

    const creditLabel = CREDIT_LABELS[userData?.creditScore] || ''

    vapiRef.current.start(
      undefined,
      {
        variableValues: {
          name: userData?.name || '',
          loanAmount: userData?.loan || 0,
          downPayment: userData?.down || 0,
          rate: userData?.rate || 0,
          monthlyPayment: userData?.monthly || 0,
          loanType: LOAN_TYPE_LABELS[userData?.loanType] || '',
          creditScore: creditLabel,
        },
      },
      SQUAD_ID,
    )
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

  async function requestFollowUpCall() {
    if (!phoneNumber.trim() || phoneNumber.trim() === '+1') return
    setCallReqStatus('sending')
    setCallReqError('')
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiBase}/api/start-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          name: userData?.name,
          loanAmount: userData?.loan,
          downPayment: userData?.down,
          loanType: LOAN_TYPE_LABELS[userData?.loanType] || '',
          creditScore: CREDIT_LABELS[userData?.creditScore] || '',
          rate: userData?.rate,
          monthlyPayment: userData?.monthly,
        }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('Server not reachable — is the backend running? (cd server && node server.js)') }
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setCallReqStatus('sent')
    } catch (err) {
      console.error('Follow-up call error:', err)
      setCallReqError(err.message || 'Unknown error')
      setCallReqStatus('error')
    }
  }

  const statusLabel = {
    idle: 'Ready',
    connecting: 'Connecting…',
    active: 'Live',
    ended: 'Call Ended',
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
              { label: 'Loan Amount', value: userData?.loan ? `$${(+userData.loan).toLocaleString()}` : '—' },
              { label: 'Down Payment', value: userData?.down ? `$${(+userData.down).toLocaleString()}` : '—' },
              { label: 'Monthly Est.', value: userData?.monthly ? `$${(+userData.monthly).toLocaleString()}` : '—' },
              { label: 'Loan Type', value: LOAN_TYPE_LABELS[userData?.loanType] || '—' },
              { label: 'Credit Score', value: CREDIT_LABELS[userData?.creditScore] || '—' },
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

          {showFollowUp && callStatus === 'ended' && (
            <div className="followup-card">
              <p className="followup-card-title">Want a Follow-up Call?</p>
              <p className="followup-card-sub">
                Enter your phone number and our Follow-up Agent will call you directly to answer any remaining questions.
              </p>

              {callReqStatus === 'sent' ? (
                <p className="followup-success">
                  Call on its way! Our agent will ring you shortly.
                </p>
              ) : (
                <>
                  <div className="followup-input-row">
                    <input
                      className="followup-phone-input"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      disabled={callReqStatus === 'sending'}
                    />
                    <button
                      className="btn-followup-call"
                      onClick={requestFollowUpCall}
                      disabled={!phoneNumber.trim() || phoneNumber.trim() === '+1' || callReqStatus === 'sending'}
                    >
                      {callReqStatus === 'sending' ? 'Calling…' : 'Call Me'}
                    </button>
                  </div>
                  {callReqStatus === 'error' && (
                    <p className="followup-error">{callReqError || 'Something went wrong — please try again.'}</p>
                  )}
                </>
              )}

              <button className="followup-dismiss" onClick={() => setShowFollowUp(false)}>
                No thanks
              </button>
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
                {callStatus === 'idle' ? 'AI response will appear here…' : ''}
                {callStatus === 'connecting' ? 'Connecting to AI advisor…' : ''}
                {callStatus === 'active' ? 'Listening…' : ''}
                {callStatus === 'ended' && !showFollowUp ? 'Call ended. Start a new call to continue.' : ''}
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

          {(!VAPI_PUBLIC_KEY || !SQUAD_ID) && (
            <p style={{ color: '#e87878', fontSize: '0.78rem', textAlign: 'center', maxWidth: '340px' }}>
              Add <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>VITE_VAPI_PUBLIC_KEY</code> and <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>VITE_VAPI_SQUAD_ID</code> to your <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>.env</code> file to enable the AI voice call.
            </p>
          )}
        </main>

        {/* ── Right sidebar ── */}
        <aside className="voice-sidebar-right">
          <div>
            <p className="sidebar-section-title">Agent</p>
            <div className="agent-switch">
              {[
                { id: 'rate', icon: '📊', name: 'Rate Advisor', desc: 'Explains rates & options' },
                { id: 'educational', icon: '🎓', name: 'Educational Agent', desc: 'General mortgage concepts' },
              ].map(a => (
                <div
                  key={a.id}
                  className={`agent-btn ${activeAgent === a.id ? 'active' : 'inactive'}`}
                >
                  <div className="agent-btn-icon">{a.icon}</div>
                  <div>
                    <p className="agent-btn-name">{a.name}</p>
                    <p className="agent-btn-desc">
                      {activeAgent === a.id && callStatus === 'active'
                        ? 'Currently speaking'
                        : a.desc}
                    </p>
                  </div>
                </div>
              ))}

              {/* Follow-up Agent — outbound phone, shown as separate indicator */}
              <div className={`agent-btn ${callStatus === 'ended' && showFollowUp ? 'active' : 'inactive'}`}>
                <div className="agent-btn-icon">📞</div>
                <div>
                  <p className="agent-btn-name">Follow-up Agent</p>
                  <p className="agent-btn-desc">
                    {callStatus === 'ended' && showFollowUp
                      ? 'Ready — calls your phone'
                      : 'Calls you after session'}
                  </p>
                </div>
              </div>
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
