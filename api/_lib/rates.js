// Shared rate tables and helpers for calculate-rate and vapi-tool

const BASE_RATES = {
  excellent: 6.5,
  good: 7.0,
  fair: 7.8,
  poor: 8.5,
}

const LOAN_TYPE_ADJUSTMENTS = {
  '30yr-fixed': 0,
  '15yr-fixed': -0.5,
  variable: -0.75,
}

const PROPERTY_TYPE_ADJUSTMENTS = {
  'single-family': 0,
  townhouse: 0.1,
  condo: 0.2,
  'multi-family': 0.3,
}

function calcMonthly(principal, annualRate, years) {
  const r = annualRate / 100 / 12
  const n = years * 12
  if (r === 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function calcLTV(loanAmount, downPayment) {
  return ((loanAmount - downPayment) / loanAmount) * 100
}

module.exports = {
  BASE_RATES,
  LOAN_TYPE_ADJUSTMENTS,
  PROPERTY_TYPE_ADJUSTMENTS,
  calcMonthly,
  calcLTV,
}
