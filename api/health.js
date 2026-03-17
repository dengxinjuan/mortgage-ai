const { setCorsHeaders, handleOptions } = require('./_lib/cors')

module.exports = async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return handleOptions(res)
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  res.status(200).json({ status: 'ok' })
}
