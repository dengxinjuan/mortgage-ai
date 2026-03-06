# Mortgage AI

An AI-powered mortgage advisor web app. Users fill out a mortgage inquiry form, get an instant rate estimate, and are connected to a live Vapi AI voice agent pre-loaded with their profile data.

---

## Features

- **Mortgage Form** — collects loan amount, down payment, loan type, credit score, property type, name and email
- **Rate Calculation** — Node.js backend calculates a personalized rate with adjustments for credit score, loan type, and property type
- **Voice AI Page** — glowing gold orb, animated waveform, live transcript bubble, and full Vapi voice call integration
- **Live Transcript Log** — scrollable transcript of the full conversation
- **Agent Switcher** — toggle between Rate Advisor and Support Agent mid-session
- **Luxury UI** — dark navy + gold design with Playfair Display and DM Sans fonts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| AI Voice | Vapi |
| Styling | Plain CSS (custom design system) |

---

## Project Structure

```
Mortgage-AI/
├── src/
│   ├── components/
│   │   ├── MortgageForm.jsx   # Page 1 — form + rate result card
│   │   └── VoicePage.jsx      # Page 2 — voice call interface
│   ├── App.jsx                # Root component, manages form/chat state
│   ├── index.css              # Full design system (navy/gold theme)
│   └── main.jsx
├── server/
│   └── server.js              # Express API — POST /api/calculate-rate
├── .env.example               # Environment variable template
└── vite.config.js             # Vite config with /api proxy
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/mortgage-ai.git
cd mortgage-ai
```

### 2. Install dependencies

```bash
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Vapi keys:

```
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
VITE_VAPI_RATE_AGENT_ID=your_rate_inquiry_agent_id
VITE_VAPI_SUPPORT_AGENT_ID=your_support_agent_id
```

Get your keys at [dashboard.vapi.ai](https://dashboard.vapi.ai).

### 4. Run the app

You need two terminals:

**Terminal 1 — Backend:**
```bash
cd server
node server.js
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## API

### `POST /api/calculate-rate`

**Request body:**
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
  "totalPaid": 819000,
  "years": 30
}
```

**Credit score rates:**
| Score | Base Rate |
|---|---|
| Excellent (750+) | 6.5% |
| Good (700–749) | 7.0% |
| Fair (650–699) | 7.8% |
| Poor (<650) | 8.5% |

---

## Roadmap

- [x] React + Vite project setup
- [x] Mortgage form UI (Page 1)
- [x] Voice AI page with orb + waveform (Page 2)
- [x] Node.js/Express backend API
- [x] Vapi voice integration
- [ ] Deploy frontend (Vercel)
- [ ] Deploy backend (Railway / Render)

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_VAPI_PUBLIC_KEY` | Your Vapi public key |
| `VITE_VAPI_RATE_AGENT_ID` | Vapi assistant ID for the Rate Advisor agent |
| `VITE_VAPI_SUPPORT_AGENT_ID` | Vapi assistant ID for the Support agent |

> Never commit your `.env` file. It is already in `.gitignore`.
