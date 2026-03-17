// CORS headers and OPTIONS preflight for Vercel serverless

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', corsOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
}

function handleOptions(res) {
  setCorsHeaders(res)
  res.status(200).end()
}

module.exports = { setCorsHeaders, handleOptions }
