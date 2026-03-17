const { setCorsHeaders, handleOptions } = require('./_lib/cors')
const {
  BASE_RATES,
  LOAN_TYPE_ADJUSTMENTS,
  PROPERTY_TYPE_ADJUSTMENTS,
  calcMonthly,
  calcLTV,
} = require('./_lib/rates')

module.exports = async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return handleOptions(res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { loanAmount, downPayment, creditScore, loanType, propertyType } = req.body || {}

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

  const base = BASE_RATES[creditScore] ?? 7.0
  const loanAdj = LOAN_TYPE_ADJUSTMENTS[loanType] ?? 0
  const propAdj = PROPERTY_TYPE_ADJUSTMENTS[propertyType] ?? 0
  const rate = Math.round((base + loanAdj + propAdj) * 100) / 100

  const principal = loan - down
  const years = loanType === '15yr-fixed' ? 15 : 30
  const monthly = Math.round(calcMonthly(principal, rate, years))
  const ltv = Math.round(calcLTV(loan, down))
  const totalPaid = Math.round(monthly * years * 12)
  const totalInterest = totalPaid - principal

  res.status(200).json({
    rate,
    loanAmount: loan,
    downPayment: down,
    principal,
    loanType,
    creditScore,
    monthly,
    ltv,
    totalPaid,
    totalInterest,
    years,
  })
}
