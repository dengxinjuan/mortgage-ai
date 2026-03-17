const { setCorsHeaders, handleOptions } = require('./_lib/cors')

module.exports = async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return handleOptions(res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { phoneNumber, name, loanAmount, downPayment, loanType, creditScore, rate, monthlyPayment } =
    req.body || {}

  if (!phoneNumber) {
    return res.status(400).json({ error: 'phoneNumber is required.' })
  }

  const VAPI_API_KEY = process.env.VAPI_API_KEY
  const FOLLOWUP_ID = process.env.VAPI_FOLLOWUP_AGENT_ID
  const PHONE_ID = process.env.VAPI_PHONE_NUMBER_ID

  if (!VAPI_API_KEY || !FOLLOWUP_ID) {
    return res.status(503).json({ error: 'VAPI_API_KEY or VAPI_FOLLOWUP_AGENT_ID not configured on server.' })
  }

  try {
    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: FOLLOWUP_ID,
        phoneNumberId: PHONE_ID,
        customer: { number: phoneNumber },
        assistantOverrides: {
          variableValues: {
            name: name || '',
            loanAmount: loanAmount || 0,
            downPayment: downPayment || 0,
            loanType: loanType || '',
            creditScore: creditScore || '',
            rate: rate || 0,
            monthlyPayment: monthlyPayment || 0,
          },
        },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Vapi error response:', JSON.stringify(data, null, 2))
      const msg = data?.message || data?.error || JSON.stringify(data)
      const code = response.status >= 500 ? 502 : response.status
      return res.status(code).json({ error: msg })
    }
    res.status(200).json({ success: true, callId: data.id })
  } catch (err) {
    console.error('start-call error:', err)
    res.status(500).json({ error: err.message || 'Internal server error.' })
  }
}
