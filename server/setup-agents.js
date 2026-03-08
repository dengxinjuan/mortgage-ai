require('dotenv').config()
const fs = require('fs')

const VAPI_API_KEY          = process.env.VAPI_API_KEY
const RATE_AGENT_ID         = process.env.VAPI_RATE_AGENT_ID
const EDUCATIONAL_AGENT_ID  = process.env.VAPI_EDUCATIONAL_AGENT_ID
const LOG_PATH              = '../.cursor/debug-29703f.log'

function debugLog(message, data, hypothesisId = '') {
  const entry = JSON.stringify({
    sessionId: '29703f', location: 'setup-agents.js', message, data,
    timestamp: Date.now(), hypothesisId,
  })
  try { fs.appendFileSync(LOG_PATH, entry + '\n') } catch {}
  console.log(`[setup] ${message}`, JSON.stringify(data, null, 2))
}

async function vapiGet(path) {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`GET ${path} failed ${res.status}: ${JSON.stringify(data)}`)
  return data
}

async function vapiPatch(path, body) {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`PATCH ${path} failed ${res.status}: ${JSON.stringify(data)}`)
  return data
}

// Handoff tool: Rate Agent → Educational Agent
// variableExtractionPlan extracts key values from the conversation so the
// Educational Agent receives them as {{variables}} in its firstMessage/system prompt
const HANDOFF_TOOL = {
  type: 'handoff',
  destinations: [
    {
      type: 'assistant',
      assistantId: EDUCATIONAL_AGENT_ID,
      description:
        'Transfer to the Educational Agent when the user asks about general mortgage concepts, terminology, how mortgages work, types of mortgages, amortization, or any educational topics beyond their specific rate.',
      contextEngineeringPlan: { type: 'all' },
      variableExtractionPlan: {
        schema: {
          type: 'object',
          properties: {
            name:           { type: 'string', description: "The user's first or full name from the conversation" },
            loanAmount:     { type: 'number', description: 'The loan amount in dollars' },
            downPayment:    { type: 'number', description: 'The down payment amount in dollars' },
            rate:           { type: 'number', description: 'The interest rate percentage' },
            monthlyPayment: { type: 'number', description: 'The estimated monthly mortgage payment' },
            loanType:       { type: 'string', description: 'The loan type e.g. 30-Year Fixed' },
            creditScore:    { type: 'string', description: 'The credit score tier e.g. Excellent (750+)' },
          },
          required: ['name'],
        },
      },
    },
  ],
}

// Fixed firstMessage for Educational Agent using Liquid {{variable}} syntax
const EDU_FIXED_FIRST_MESSAGE =
  "Hi {{name}}! I'm your mortgage education advisor. I'm here to help explain mortgage concepts clearly. What would you like to understand better?"

// Correct firstMessage using Liquid {{variable}} syntax — VAPI does NOT support [variable]
const FIXED_FIRST_MESSAGE =
  'Hi {{name}}! I\'ve reviewed your mortgage details. Based on a ${{loanAmount}} loan with ${{downPayment}} down and your {{creditScore}} credit score, your estimated rate is {{rate}}% on a {{loanType}} mortgage. That puts your monthly payment at around ${{monthlyPayment}}. I\'m here to walk you through what that means and answer any questions you have. What would you like to know?'

// System prompt prefix per VAPI docs for multi-agent coordination
const HANDOFF_SYSTEM_PREFIX = `# System context

You are part of a multi-agent mortgage advisory system. You can hand off the conversation to the Educational Agent when the user asks educational or conceptual questions about mortgages. Handoffs are achieved by calling the handoff function. Do not mention the handoff to the user — transition naturally.

`

async function main() {
  if (!VAPI_API_KEY || !RATE_AGENT_ID || !EDUCATIONAL_AGENT_ID) {
    console.error('Missing env vars. Check server/.env for VAPI_API_KEY, VAPI_RATE_AGENT_ID, VAPI_EDUCATIONAL_AGENT_ID')
    process.exit(1)
  }

  console.log('=== Mortgage AI — Agent Handoff Setup ===\n')

  // ── 1. Fetch current Rate Agent config ───────────────────────
  console.log('Fetching Rate Agent config...')
  const rateAgent = await vapiGet(`/assistant/${RATE_AGENT_ID}`)
  debugLog('Rate Agent current config', {
    id: rateAgent.id, name: rateAgent.name,
    modelToolCount: (rateAgent.model?.tools || []).length,
    modelTools: (rateAgent.model?.tools || []).map(t => ({ type: t.type, destinations: t.destinations })),
    firstMessage: rateAgent.firstMessage,
    hasSystemPrompt: !!rateAgent.model?.messages?.find(m => m.role === 'system'),
  }, 'H-A')

  // ── 2. Check if handoff tool already points to Educational Agent ─
  // Tools live inside model.tools, not at the top-level tools field
  const existingTools = rateAgent.model?.tools || []
  const existingHandoff = existingTools.find(
    t => t.type === 'handoff' &&
    t.destinations?.some(d => d.assistantId === EDUCATIONAL_AGENT_ID)
  )

  const firstMessageNeedsFix      = !rateAgent.firstMessage?.includes('{{')
  const handoffMissingExtractionPlan = existingHandoff &&
    !existingHandoff.destinations?.[0]?.variableExtractionPlan
  debugLog('firstMessage + handoff check', {
    current: rateAgent.firstMessage,
    firstMessageNeedsFix,
    handoffMissingExtractionPlan,
  }, 'H-D')

  if (existingHandoff && !firstMessageNeedsFix && !handoffMissingExtractionPlan) {
    console.log('✓ Handoff tool (with variableExtractionPlan) and firstMessage already correctly configured.')
    debugLog('No changes needed', { existingHandoff }, 'H-A')
  } else {
    // Remove any stale handoff tools, add the correct one (tools live in model.tools)
    const filteredTools = existingTools.filter(t => t.type !== 'handoff')
    const updatedTools  = [...filteredTools, HANDOFF_TOOL]

    // ── 3. Update system prompt to include handoff instructions ──
    const messages      = rateAgent.model?.messages || []
    const sysIdx        = messages.findIndex(m => m.role === 'system')
    const updatedMsgs   = [...messages]

    if (sysIdx >= 0) {
      const existing = updatedMsgs[sysIdx].content || ''
      if (!existing.includes('multi-agent')) {
        updatedMsgs[sysIdx] = {
          ...updatedMsgs[sysIdx],
          content: HANDOFF_SYSTEM_PREFIX + existing,
        }
        console.log('✓ Prepended handoff coordination context to Rate Agent system prompt.')
      } else {
        console.log('✓ System prompt already contains multi-agent context — skipping.')
      }
    } else {
      updatedMsgs.push({ role: 'system', content: HANDOFF_SYSTEM_PREFIX })
      console.log('✓ Added new system prompt with handoff context to Rate Agent.')
    }

    // ── 4. PATCH Rate Agent ───────────────────────────────────────
    console.log(`\nPatching Rate Agent (${RATE_AGENT_ID})...`)
    const patchBody = {
      firstMessage: FIXED_FIRST_MESSAGE,
      model:        { ...rateAgent.model, messages: updatedMsgs, tools: updatedTools },
    }
    debugLog('Patching Rate Agent', {
      toolCount: updatedTools.length,
      firstMessage: FIXED_FIRST_MESSAGE,
      handoffTool: HANDOFF_TOOL,
    }, 'H-A')

    const updated = await vapiPatch(`/assistant/${RATE_AGENT_ID}`, patchBody)
    debugLog('Rate Agent PATCH response', {
      id: updated.id, name: updated.name,
      firstMessage: updated.firstMessage,
      modelToolCount: (updated.model?.tools || []).length,
      modelTools: (updated.model?.tools || []).map(t => ({ type: t.type, destinations: t.destinations })),
    }, 'H-A')
    console.log(`✓ Rate Agent updated — now has ${(updated.model?.tools || []).length} model tool(s).`)
  }

  // ── 5. Patch Educational Agent firstMessage ──────────────────
  console.log('\nFetching Educational Agent config...')
  const eduAgent = await vapiGet(`/assistant/${EDUCATIONAL_AGENT_ID}`)
  debugLog('Educational Agent current config', {
    id: eduAgent.id, name: eduAgent.name,
    firstMessage: eduAgent.firstMessage,
  }, 'H-A,H-B')

  const eduFirstMessageNeedsFix = !eduAgent.firstMessage?.includes('{{')
  if (eduFirstMessageNeedsFix) {
    console.log(`Patching Educational Agent firstMessage (current uses wrong syntax: "${eduAgent.firstMessage?.slice(0, 60)}...")`)
    const updatedEdu = await vapiPatch(`/assistant/${EDUCATIONAL_AGENT_ID}`, {
      firstMessage: EDU_FIXED_FIRST_MESSAGE,
    })
    debugLog('Educational Agent PATCH response', {
      firstMessage: updatedEdu.firstMessage,
    }, 'H-A,H-B')
    console.log(`✓ Educational Agent firstMessage fixed: "${updatedEdu.firstMessage}"`)
  } else {
    console.log(`✓ Educational Agent firstMessage already uses correct syntax — skipping.`)
  }

  console.log('\n=== Setup complete! ===')
  console.log('Rate Agent will auto-handoff to Educational Agent with variable extraction.')
  console.log('Restart your backend server for changes to take effect in live calls.\n')
}

main().catch(err => {
  console.error('Setup failed:', err.message)
  debugLog('Setup failed', { error: err.message }, 'H-A')
  process.exit(1)
})
