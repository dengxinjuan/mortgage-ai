import { setCorsHeaders, handleOptions } from './_lib/cors.js'
import { getBody } from './_lib/parseBody.js'
import { BASE_RATES, LOAN_TYPE_ADJUSTMENTS, calcMonthly } from './_lib/rates.js'

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return handleOptions(res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = await getBody(req)
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body must be JSON with a message.' })
    }
    const msg = body.message
    if (!msg || !msg.toolCallList || !Array.isArray(msg.toolCallList)) {
      return res.status(400).json({ error: 'Request must include message.toolCallList.' })
    }

    const list = msg.toolCallList
    const toolCall = list[0]
    const toolWithList = msg?.toolWithToolCallList
    const firstWith = toolWithList?.[0]
    const resolvedCall = toolCall || firstWith?.toolCall

    if (!resolvedCall || !resolvedCall.id) {
      return res.status(200).json({
        results: [
          {
            toolCallId: 'unknown',
            result:
              'I could not process that request. Please share your loan amount, credit score, and loan type to get a rate.',
          },
        ],
      })
    }

    const toolCallId = resolvedCall.id
    const rawArgs =
      resolvedCall.arguments ?? resolvedCall.function?.arguments ?? resolvedCall.parameters
    let args
    try {
      args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs || {}
    } catch (e) {
      return res.status(200).json({
        results: [
          {
            toolCallId,
            result:
              'Invalid arguments for rate calculation. Please provide loan amount, credit score, and loan type.',
          },
        ],
      })
    }

    const { loanAmount, creditScore, loanType, downPayment } = args

    if (!loanAmount || !creditScore || !loanType) {
      return res.status(200).json({
        results: [
          {
            toolCallId,
            result: 'I need the loan amount, credit score, and loan type to calculate a rate.',
          },
        ],
      })
    }

    const base = BASE_RATES[creditScore] ?? 7.0
    const loanAdj = LOAN_TYPE_ADJUSTMENTS[loanType] ?? 0
    const rate = Math.round((base + loanAdj) * 100) / 100

    const principal = parseFloat(loanAmount) - (parseFloat(downPayment) || 0)
    const years = loanType === '15yr-fixed' ? 15 : 30
    const monthlyPayment = Math.round(calcMonthly(principal, rate, years))

    const monthlyFormatted = monthlyPayment.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    })
    const result = `Rate ${rate}%, monthly payment ${monthlyFormatted}.`

    return res.status(200).json({
      results: [{ toolCallId, result }],
    })
  } catch (err) {
    console.error('[vapi-tool] unexpected error', err)
    res.status(500).json({ error: 'Internal server error.' })
  }
}
