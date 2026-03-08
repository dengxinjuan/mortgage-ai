require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── Rate tables ────────────────────────────────────────────
const BASE_RATES = {
  excellent: 6.5,
  good:      7.0,
  fair:      7.8,
  poor:      8.5,
}

const LOAN_TYPE_ADJUSTMENTS = {
  '30yr-fixed': 0,
  '15yr-fixed': -0.5,  // 15yr is typically lower
  variable:     -0.75, // variable starts lower
}

const PROPERTY_TYPE_ADJUSTMENTS = {
  'single-family': 0,
  townhouse:        0.1,
  condo:            0.2,
  'multi-family':   0.3,
}

// ── Helpers ────────────────────────────────────────────────
function calcMonthly(principal, annualRate, years) {
  const r = annualRate / 100 / 12
  const n = years * 12
  if (r === 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function calcLTV(loanAmount, downPayment) {
  return ((loanAmount - downPayment) / loanAmount) * 100
}

// ── POST /api/calculate-rate ───────────────────────────────
app.post('/api/calculate-rate', (req, res) => {
  const { loanAmount, downPayment, creditScore, loanType, propertyType } = req.body

  // Validation
  if (!loanAmount || !creditScore || !loanType) {
    return res.status(400).json({ error: 'loanAmount, creditScore, and loanType are required.' })
  }

  const loan = parseFloat(loanAmount)
  const down = parseFloat(downPayment) || 0

  if (loan < 50000) {
    return res.status(400).json({ error: 'Minimum loan amount is $50,000.' })
  }
  if (down >= loan) {
    return res.status(400).json({ error: 'Down payment cannot exceed loan amount.' })
  }

  // Rate calculation
  const base       = BASE_RATES[creditScore]      ?? 7.0
  const loanAdj    = LOAN_TYPE_ADJUSTMENTS[loanType]      ?? 0
  const propAdj    = PROPERTY_TYPE_ADJUSTMENTS[propertyType] ?? 0
  const rate       = Math.round((base + loanAdj + propAdj) * 100) / 100

  const principal  = loan - down
  const years      = loanType === '15yr-fixed' ? 15 : 30
  const monthly    = Math.round(calcMonthly(principal, rate, years))
  const ltv        = Math.round(calcLTV(loan, down))
  const totalPaid  = Math.round(monthly * years * 12)
  const totalInterest = totalPaid - principal

  res.json({
    rate,
    loanAmount:     loan,
    downPayment:    down,
    principal,
    loanType,
    creditScore,
    monthly,
    ltv,
    totalPaid,
    totalInterest,
    years,
  })
})

// ── POST /api/start-call ───────────────────────────────────
// Triggers a Vapi outbound phone call to the user via Follow-up Agent
app.post('/api/start-call', async (req, res) => {
  console.log('▶ /api/start-call hit, body:', req.body)
  const { phoneNumber, name, loanAmount, downPayment, loanType, creditScore, rate, monthlyPayment } = req.body

  if (!phoneNumber) {
    return res.status(400).json({ error: 'phoneNumber is required.' })
  }

  const VAPI_API_KEY   = process.env.VAPI_API_KEY
  const FOLLOWUP_ID    = process.env.VAPI_FOLLOWUP_AGENT_ID
  const PHONE_ID       = process.env.VAPI_PHONE_NUMBER_ID

  if (!VAPI_API_KEY || !FOLLOWUP_ID) {
    return res.status(500).json({ error: 'VAPI_API_KEY or VAPI_FOLLOWUP_AGENT_ID not configured on server.' })
  }

  try {
    const response = await fetch('https://api.vapi.ai/call/phone', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        assistantId:   FOLLOWUP_ID,
        phoneNumberId: PHONE_ID,
        customer: { number: phoneNumber },
        assistantOverrides: {
          variableValues: {
            name:           name          || '',
            loanAmount:     loanAmount    || 0,
            downPayment:    downPayment   || 0,
            loanType:       loanType      || '',
            creditScore:    creditScore   || '',
            rate:           rate          || 0,
            monthlyPayment: monthlyPayment || 0,
          },
        },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Vapi error response:', JSON.stringify(data, null, 2))
      const msg = data?.message || data?.error || JSON.stringify(data)
      return res.status(response.status).json({ error: msg })
    }
    res.json({ success: true, callId: data.id })
  } catch (err) {
    console.error('start-call error:', err)
    res.status(500).json({ error: err.message || 'Internal server error.' })
  }
})

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`Mortgage API running on http://localhost:${PORT}`)
})
