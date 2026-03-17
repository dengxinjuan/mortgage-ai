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

export async function getBody(req) {
  // #region agent log
  const hasReqBody = req && req.body !== undefined && req.body !== null
  try { fetch('http://127.0.0.1:7717/ingest/7e0a3f9d-04f2-4683-804a-ba8e1254dae3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'34f372'},body:JSON.stringify({sessionId:'34f372',location:'api/_lib/parseBody.js:getBody',message:'getBody path',data:{hasReqBody,reqBodyType:req&&req.body!=null?typeof req.body:null},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{}); } catch(e){}
  // #endregion
  if (req.body !== undefined && req.body !== null) {
    return parseBody(req)
  }
  return readBodyStream(req)
}

export { parseBody }
