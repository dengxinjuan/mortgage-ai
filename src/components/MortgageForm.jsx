import { useState } from 'react'

const INITIAL = {
  name: 'John Smith',
  email: 'john@example.com',
  loanAmount: '450000',
  downPayment: '90000',
  loanType: '30yr-fixed',
  creditScore: 'excellent',
  propertyType: 'single-family',
}

const LOAN_TYPE_LABELS = {
  '30yr-fixed': '30-Year Fixed',
  '15yr-fixed': '15-Year Fixed',
  variable: 'Variable Rate',
}

export default function MortgageForm({ onSubmit }) {
  const [form, setForm] = useState(INITIAL)
  const [result, setResult] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  function set(name, value) {
    setForm(p => ({ ...p, [name]: value }))
    setErrors(p => ({ ...p, [name]: '' }))
  }

  function handleCurrency(e) {
    set(e.target.name, e.target.value.replace(/[^0-9]/g, ''))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required'
    if (!form.loanAmount || +form.loanAmount < 50000) e.loanAmount = 'Min $50,000'
    if (!form.downPayment) e.downPayment = 'Required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setApiError('')

    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiBase}/api/calculate-rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanAmount: +form.loanAmount,
          downPayment: +form.downPayment,
          creditScore: form.creditScore,
          loanType: form.loanType,
          propertyType: form.propertyType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Server error')
      }

      const data = await res.json()
      setResult({ ...form, ...data, loan: data.loanAmount, down: data.downPayment })
    } catch (err) {
      setApiError(err.message || 'Could not reach the server. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d1b2a' }}>

      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-icon">M</div>
          <span className="header-logo-name">Mortgage AI</span>
        </div>
        <nav className="header-nav">
          <a href="#">Rates</a>
          <a href="#">About</a>
          <a href="#">Contact</a>
          <button className="btn-outline">Sign In</button>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero">
        <p className="hero-eyebrow">AI-Powered Mortgage Advisor</p>
        <h1 className="hero-title">
          Find Your Perfect<br />
          <span>Mortgage Rate</span>
        </h1>
        <p className="hero-sub">
          Fill out the form and our AI advisor will instantly calculate your rate and guide you through your options.
        </p>

        {/* Steps */}
        <div className="steps">
          {[
            { n: 1, label: 'Your Info' },
            { n: 2, label: 'Get Rate' },
            { n: 3, label: 'Talk to AI' },
          ].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div className="step-item">
                <div className={`step-circle ${s.n === 1 ? 'active' : 'inactive'}`}>{s.n}</div>
                <span className={`step-label ${s.n === 1 ? 'active' : 'inactive'}`}>{s.label}</span>
              </div>
              {i < 2 && <div className="step-connector" />}
            </div>
          ))}
        </div>
      </section>

      {/* Grid */}
      <main className="main-grid">

        {/* Form card */}
        <div className="card">
          <h2 className="card-title">Mortgage Inquiry</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            <div className="form-grid-2">
              <InputField label="Full Name" error={errors.name}>
                <input name="name" value={form.name} placeholder="John Smith"
                  onChange={e => set('name', e.target.value)} />
              </InputField>
              <InputField label="Email" error={errors.email}>
                <input name="email" value={form.email} placeholder="john@example.com" type="email"
                  onChange={e => set('email', e.target.value)} />
              </InputField>
            </div>

            <div className="form-grid-2">
              <InputField label="Loan Amount" error={errors.loanAmount} prefix="$">
                <input name="loanAmount" placeholder="450,000"
                  value={form.loanAmount ? (+form.loanAmount).toLocaleString() : ''}
                  onChange={handleCurrency} />
              </InputField>
              <InputField label="Down Payment" error={errors.downPayment} prefix="$">
                <input name="downPayment" placeholder="90,000"
                  value={form.downPayment ? (+form.downPayment).toLocaleString() : ''}
                  onChange={handleCurrency} />
              </InputField>
            </div>

            <InputField label="Loan Type">
              <select value={form.loanType} onChange={e => set('loanType', e.target.value)}>
                <option value="30yr-fixed">30-Year Fixed</option>
                <option value="15yr-fixed">15-Year Fixed</option>
                <option value="variable">Variable Rate</option>
              </select>
            </InputField>

            <div className="field">
              <label className="field-label">Credit Score Range</label>
              <div className="credit-grid">
                {[
                  { v: 'excellent', label: 'Excellent', sub: '750+' },
                  { v: 'good', label: 'Good', sub: '700–749' },
                  { v: 'fair', label: 'Fair', sub: '650–699' },
                  { v: 'poor', label: 'Poor', sub: '<650' },
                ].map(opt => (
                  <button key={opt.v} type="button"
                    className={`credit-btn ${form.creditScore === opt.v ? 'selected' : 'unselected'}`}
                    onClick={() => set('creditScore', opt.v)}>
                    <div className="credit-btn-label">{opt.label}</div>
                    <div className="credit-btn-sub">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <InputField label="Property Type">
              <select value={form.propertyType} onChange={e => set('propertyType', e.target.value)}>
                <option value="single-family">Single Family Home</option>
                <option value="condo">Condo</option>
                <option value="multi-family">Multi-Family</option>
                <option value="townhouse">Townhouse</option>
              </select>
            </InputField>

            {apiError && (
              <p style={{ color: '#e87878', fontSize: '0.82rem', padding: '10px 14px', background: 'rgba(220,80,80,0.08)', borderRadius: '8px', border: '1px solid rgba(220,80,80,0.2)' }}>
                {apiError}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Calculating…' : 'Calculate My Rate →'}
            </button>
          </form>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Rate card */}
          {!result ? (
            <div className="rate-empty">
              <div className="rate-empty-icon">%</div>
              <p className="rate-empty-title">Your Rate Preview</p>
              <p className="rate-empty-sub">
                Fill out the form to see your personalized mortgage rate estimate instantly.
              </p>
            </div>
          ) : (
            <div className="rate-card">
              <p className="rate-eyebrow">Estimated Rate</p>
              <div className="rate-number">
                <span className="rate-big">{result.rate}</span>
                <span className="rate-pct">%</span>
                <span className="rate-type">{LOAN_TYPE_LABELS[result.loanType]}</span>
              </div>
              <div className="rate-rows">
                {[
                  { label: 'Loan Amount', value: `$${(+result.loan).toLocaleString()}` },
                  { label: 'Down Payment', value: `$${(+result.down).toLocaleString()}` },
                  { label: 'Principal', value: `$${(+result.principal).toLocaleString()}` },
                  { label: 'Monthly Payment', value: `$${(+result.monthly).toLocaleString()}` },
                  { label: 'Loan-to-Value (LTV)', value: `${result.ltv}%` },
                  { label: 'Total Interest', value: `$${(+result.totalInterest).toLocaleString()}` },
                ].map(r => (
                  <div className="rate-row" key={r.label}>
                    <span className="rate-row-label">{r.label}</span>
                    <span className="rate-row-value">{r.value}</span>
                  </div>
                ))}
              </div>
              <p className="rate-message">
                Hi <span>{result.name}</span>! Your rate estimate is ready. Speak with our AI advisor to explore your options.
              </p>
              <button className="btn-primary" onClick={() => onSubmit && onSubmit(result)}>
                Talk to AI Advisor →
              </button>
            </div>
          )}

          {/* Trust badges */}
          <div className="trust-grid">
            {[
              { icon: '🔒', title: 'Secure', desc: 'Bank-level encryption' },
              { icon: '⚡', title: 'Instant', desc: 'Results in seconds' },
              { icon: '🤖', title: 'AI-Powered', desc: 'Smart rate matching' },
            ].map(b => (
              <div className="trust-badge" key={b.title}>
                <div className="trust-icon">{b.icon}</div>
                <div className="trust-title">{b.title}</div>
                <div className="trust-desc">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}

function InputField({ label, error, prefix, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className={`input-wrap ${error ? 'error' : ''}`}>
        {prefix && <span className="input-prefix">{prefix}</span>}
        {children}
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
