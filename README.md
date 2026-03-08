# Mortgage AI

An AI-powered mortgage advisor web app. Users fill out a mortgage inquiry form, get an instant rate estimate, then speak with a Vapi AI voice agent pre-loaded with their profile data. Automatic multi-agent handoffs are handled via Vapi Squads.

---

## Features

- **Mortgage Form** — collects loan amount, down payment, loan type, credit score, property type, name and email. Pre-filled with test defaults for quick dev iteration
- **Rate Calculation** — Node.js backend calculates a personalised rate with adjustments for credit score, loan type, and property type
- **Voice AI Page** — glowing gold orb, animated waveform, live transcript bubble, and full Vapi voice call integration
- **Multi-Agent Squads** — Rate Inquiry Agent automatically hands off to Educational Agent when the user asks general mortgage concepts (LTV, APR, PMI, etc.), then transfers back
- **Live Transcript Log** — scrollable transcript of the full conversation with active agent indicator
- **Follow-up Outbound Call** — after the session ends, user enters their phone number and the Follow-up Agent calls them immediately
- **Luxury UI** — dark navy + gold design with Playfair Display and DM Sans fonts, custom favicon

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| AI Voice | Vapi (Squads) |
| Styling | Plain CSS (custom design system) |

---

## Project Structure

```
Mortgage-AI/
├── src/
│   ├── components/
│   │   ├── MortgageForm.jsx   # Page 1 — form + rate result card
│   │   └── VoicePage.jsx      # Page 2 — voice call interface + follow-up card
│   ├── App.jsx                # Root component, manages form/voice state
│   ├── index.css              # Full design system (navy/gold theme)
│   └── main.jsx
├── server/
│   ├── server.js              # Express API — /api/calculate-rate + /api/start-call
│   └── .env                   # Server environment variables (not committed)
├── public/
│   └── favicon.svg            # Navy + gold "M" favicon
├── .env                       # Frontend environment variables (not committed)
└── vite.config.js             # Vite config with /api proxy to localhost:3001
```

---

## Getting Started

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
cd server && npm install && cd ..
```

### 2. Set up environment variables

**Frontend `.env`:**
```
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
VITE_VAPI_RATE_AGENT_ID=your_rate_inquiry_agent_id
VITE_VAPI_EDUCATIONAL_AGENT_ID=your_educational_agent_id
VITE_VAPI_FOLLOWUP_AGENT_ID=your_followup_agent_id
VITE_VAPI_SQUAD_ID=your_squad_id
```

**`server/.env`:**
```
VAPI_API_KEY=your_vapi_private_key
VAPI_FOLLOWUP_AGENT_ID=your_followup_agent_id
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id
```

Get your keys at [vapi.ai](https://vapi.ai).

### 3. Run the app

**Terminal 1 — Backend:**
```bash
cd server && node server.js
# Running on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
npm run dev
# Running on http://localhost:5173
```

---

## Vapi Setup

### Agents
| # | Agent | Role |
|---|---|---|
| 1 | Rate Inquiry Agent | Explains the user's specific rate and numbers |
| 2 | Educational Agent | General mortgage concepts — LTV, APR, PMI, amortization, etc. |
| 3 | Follow-up Agent | Outbound phone call after the session ends |

### Squads (multi-agent handoff)
Create a Squad in the Vapi dashboard with:
- **Member 1:** Rate Inquiry Agent → handoff to Educational Agent when user asks general concepts
- **Member 2:** Educational Agent → handoff back to Rate Inquiry Agent when user wants to discuss their specific rate
- Set `contextEngineeringPlan: full` so conversation history is passed at each transfer

---

## API

### `POST /api/calculate-rate`

**Request:**
```json
{
  "loanAmount": 450000,
  "downPayment": 90000,
  "creditScore": "excellent",
  "loanType": "30yr-fixed",
  "propertyType": "single-family"
}
```

**Response:**
```json
{
  "rate": 6.5,
  "monthly": 2275,
  "principal": 360000,
  "ltv": 80,
  "totalInterest": 459000,
  "years": 30
}
```

**Base rates by credit score:**
| Score | Rate |
|---|---|
| Excellent (750+) | 6.5% |
| Good (700–749) | 7.0% |
| Fair (650–699) | 7.8% |
| Poor (<650) | 8.5% |

### `POST /api/start-call`

Triggers an outbound Vapi phone call via the Follow-up Agent.

**Request:**
```json
{
  "phoneNumber": "+14155551234",
  "name": "John Smith",
  "loanAmount": 450000,
  "rate": 6.5,
  "monthlyPayment": 2275
}
```

---

## Environment Variables

### Frontend (`.env`)
| Variable | Description |
|---|---|
| `VITE_VAPI_PUBLIC_KEY` | Vapi public key |
| `VITE_VAPI_RATE_AGENT_ID` | Rate Inquiry Agent ID |
| `VITE_VAPI_EDUCATIONAL_AGENT_ID` | Educational Agent ID |
| `VITE_VAPI_FOLLOWUP_AGENT_ID` | Follow-up Agent ID |
| `VITE_VAPI_SQUAD_ID` | Vapi Squad ID for automatic agent handoffs |

### Backend (`server/.env`)
| Variable | Description |
|---|---|
| `VAPI_API_KEY` | Vapi private API key (from dashboard → API Keys) |
| `VAPI_FOLLOWUP_AGENT_ID` | Follow-up Agent ID |
| `VAPI_PHONE_NUMBER_ID` | Vapi phone number ID for outbound calls |

> Never commit `.env` or `server/.env`. Both are in `.gitignore`.

---

## Roadmap

- [x] React + Vite project setup
- [x] Mortgage form with instant rate calculation
- [x] Voice AI page — orb, waveform, transcript
- [x] Node.js/Express backend (`/api/calculate-rate`, `/api/start-call`)
- [x] Vapi Squad integration — automatic multi-agent handoffs
- [x] Follow-up Agent — outbound phone call after session
- [x] Custom navy/gold favicon
- [ ] Deploy frontend (Vercel)
- [ ] Deploy backend (Railway or Render)
