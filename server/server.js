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

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`Mortgage API running on http://localhost:${PORT}`)
})
