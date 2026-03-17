// Safely parse request body for Vercel serverless (body may be string, object, or stream)

function parseBody(req) {
  const raw = req.body
  if (raw == null) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch (e) {
      return {}
    }
  }
  return {}
}

// Read body from request stream (for runtimes that don't set req.body)
function readBodyStream(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const str = Buffer.concat(chunks).toString('utf8')
        resolve(str ? JSON.parse(str) : {})
      } catch (e) {
        resolve({})
      }
    })
    req.on('error', reject)
  })
}

async function getBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return parseBody(req)
  }
  return readBodyStream(req)
}

module.exports = { parseBody, getBody }
