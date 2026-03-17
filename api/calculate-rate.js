import { setCorsHeaders, handleOptions } from './_lib/cors.js'
import { getBody } from './_lib/parseBody.js'
import {
  BASE_RATES,
  LOAN_TYPE_ADJUSTMENTS,
  PROPERTY_TYPE_ADJUSTMENTS,
  calcMonthly,
  calcLTV,
} from './_lib/rates.js'

export default async function handler(req, res) {
  // #region agent log
  fetch('http://127.0.0.1:7717/ingest/7e0a3f9d-04f2-4683-804a-ba8e1254dae3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'34f372'},body:JSON.stringify({sessionId:'34f372',location:'api/calculate-rate.js:handler',message:'handler entered',data:{method:req&&req.method,hasBody:req&&'body' in req},timestamp:Date.now(),hypothesisId:'H1_H2'})}).catch(()=>{});
  // #endregion
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return handleOptions(res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = await getBody(req)
    // #region agent log
    fetch('http://127.0.0.1:7717/ingest/7e0a3f9d-04f2-4683-804a-ba8e1254dae3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'34f372'},body:JSON.stringify({sessionId:'34f372',location:'api/calculate-rate.js:after getBody',message:'body parsed',data:{keys:body&&Object.keys(body||{}),loanAmount:body&&body.loanAmount},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    const { loanAmount, downPayment, creditScore, loanType, propertyType } = body

    if (!loanAmount || !creditScore || !loanType) {
      return res.status(400).json({ error: 'loanAmount, creditScore, and loanType are required.' })
    }

    const loan = parseFloat(loanAmount)
    const down = parseFloat(downPayment) || 0

    if (isNaN(loan) || loan < 50000) {
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

    return res.status(200).json({
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
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7717/ingest/7e0a3f9d-04f2-4683-804a-ba8e1254dae3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'34f372'},body:JSON.stringify({sessionId:'34f372',location:'api/calculate-rate.js:catch',message:'catch',data:{errMessage:(err&&err.message)||'',errName:(err&&err.name)||''},timestamp:Date.now(),hypothesisId:'H4_H5'})}).catch(()=>{});
    // #endregion
    console.error('[calculate-rate] error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error.' })
  }
}
