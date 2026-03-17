import { setCorsHeaders, handleOptions } from './_lib/cors.js'

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return handleOptions(res)
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  res.status(200).json({ status: 'ok' })
}
