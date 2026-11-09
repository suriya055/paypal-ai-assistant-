# AI Invoice Assistant 💳✨
> Turn plain-English sentences into confirmed PayPal Sandbox checkout links and polite, AI-generated payment reminders in seconds.

Built for the **PayPal AI Hackathon** ("Build What's Next with PayPal and AI").

---

## 💡 The Problem
Freelancers, independent consultants, and small shop owners lose hours every month creating invoices, calculating due dates, drafting reminders, and chasing clients for payment across disjointed tools. This administrative friction causes delayed billing, awkward client communications, and cash flow strain.

## 🚀 The Solution
**AI Invoice Assistant** eliminates billing friction completely:
1. **Conversational Extraction**: Type a casual sentence (e.g., *"Invoice Ravi $50 for logo design, due next Friday"*).
2. **Deterministic AI Parsing**: Google Gemini Flash extracts structured invoice fields (client name, amount, currency, description, and converts relative dates to formatted `YYYY-MM-DD` dates) using strict JSON response schemas.
3. **Human-in-the-Loop Review**: An editable form allows the user to inspect, modify, or confirm details before anything is submitted.
4. **Instant PayPal Sandbox Order**: Directly calls the PayPal Orders v2 REST API to create an order and returns an authentic sandbox checkout link.
5. **Personalized AI Reminder Message**: Gemini writes a polite, friendly payment reminder containing the PayPal link, signed with your name and ready to copy into Slack, WhatsApp, or email with one click.
6. **Live Checkout & Status Tracking**: When the buyer pays in PayPal Sandbox, the app automatically captures the transaction on redirect, marks the invoice as **PAID** in the history list, and replaces the payment button with a green `✓ Paid` badge.

---

## 🛠️ Tools Used
- **Google Gemini API (Flash Model)**: Powers natural language extraction with structured JSON response schemas (`responseSchema`), plus crafts polite, customized client reminder messages.
- **PayPal Orders v2 REST API (Sandbox)**: Handles server-to-server OAuth2 authentication, order creation (`intent: CAPTURE`), customer approval redirect links, and server-side payment capture upon completion.
- **Node.js & Express**: Secure backend server that keeps API secrets off the client, handles webhooks/redirects, and serves the web application.
- **Antigravity**: The advanced agentic AI coding assistant from Google DeepMind used to design the architecture, write full-stack code, implement security best practices, and test responsive layouts.

---

## 🌟 Key Features
- **Voice-to-Invoice (Speech-to-Text)**: Speak your invoice out loud using the native microphone button (`🎤 Speak Invoice`). Words transcribe directly into the prompt in real time for a truly hands-free invoicing experience.
- **Natural Language Parsing**: Understands informal instructions and converts relative dates ("next Friday", "in 5 days") into ISO dates based on current server time.
- **Schema-Constrained JSON Extraction**: Uses `@google/genai` with `responseMimeType: "application/json"` and structured schema definitions, plus a user confirmation step before any payment order is created.
- **Safe Human-in-the-Loop Confirmation**: Users can inspect and adjust amounts, currencies, or descriptions prior to generating the PayPal order.
- **Automated Payment Capture**: Seamless return redirect captures the order on the server and updates status to `PAID` without requiring manual page reloads.
- **Custom Sender Signature**: Remembers your name in browser session storage and automatically signs reminders with `Best regards, [Your Name]`.
- **History Management**: View, sync, delete individual invoices, or clear all test data with one click.
- **Fully Responsive**: Mobile-first design adapted for screens from 360px to 1366px with stacked card views and zero horizontal overflow.
- **Clear Sandbox Badge**: Prominently displays the PayPal Sandbox Mode badge across all views.

---

## 🧰 Tech Stack
- **Back End**: Node.js (v18+), Express, dotenv, cors, `@google/genai`
- **Front End**: Vanilla JavaScript (ES6+), HTML5, Modern CSS (no heavy frontend frameworks, instant load times)
- **Payments**: PayPal REST API (Sandbox environment, Orders v2)
- **Storage**: Local JSON file storage (`data/invoices.json`) with auto-initialization

---

## 🚀 Run It Yourself (For Judges)

### 1. Prerequisites
- **Node.js** (v18 or higher; tested on Node v26)
- **PayPal Developer Account** ([developer.paypal.com](https://developer.paypal.com))
- **Google Gemini API Key** ([aistudio.google.com](https://aistudio.google.com))

### 2. Clone and Install
```bash
git clone https://github.com/suriya055/paypal-ai-assistant-.git
cd paypal-ai-assistant-
npm install
```

### 3. Configure Environment Variables
Copy the sample environment file:
```bash
# On Linux/macOS:
cp .env.example .env

# On Windows PowerShell:
copy .env.example .env
```

Open `.env` and fill in your keys:
```env
PORT=3000
BASE_URL=http://localhost:3000

# PayPal Developer Sandbox Credentials
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash
```

### 4. Setting Up PayPal Sandbox Accounts
1. Log in to [developer.paypal.com](https://developer.paypal.com/) and go to **Dashboard** &rarr; **Testing Tools** &rarr; **Sandbox Accounts**.
2. Make sure you have:
   - A **US Business Account** (this is your merchant account).
   - A **US Personal Account** (this is your test buyer account).
   > **Note on Country/Currency**: Ensure both your sandbox accounts are set to **United States (US)**. Sandbox accounts created in certain other regions (such as India) enforce strict local compliance rules that restrict domestic USD transactions, causing unexpected currency or checkout errors. Using US sandbox accounts guarantees smooth end-to-end checkout.
3. Under **Apps & Credentials**, toggle to **Sandbox**, click **Create App** (e.g. `AI Invoice Assistant`), and copy your **Client ID** and **Secret** into `.env`.
4. Check your Personal Buyer sandbox account password by clicking `...` &rarr; **View/Edit account** (default test balance is usually $5,000 USD).

### 5. Getting a Free Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account and click **Get API key** &rarr; **Create API key**.
3. Copy the key into `GEMINI_API_KEY` in `.env`.

### 6. Start the Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🌐 Deploy on Render

You can deploy the app as a live cloud demo on [Render](https://render.com/) in under 3 minutes:

1. Create a new **Web Service** on Render and connect your GitHub repository (`suriya055/paypal-ai-assistant-`).
2. Select **Node** as the runtime environment.
3. Configure the build and start commands:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. In the **Environment Variables** tab, add the following variables:

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `BASE_URL` | **Yes** | Public URL of your deployed Render app (used for PayPal callbacks) | `https://your-service-name.onrender.com` |
| `PAYPAL_CLIENT_ID` | **Yes** | PayPal Sandbox app Client ID | `your_sandbox_client_id` |
| `PAYPAL_CLIENT_SECRET` | **Yes** | PayPal Sandbox app Client Secret | `your_sandbox_client_secret` |
| `PAYPAL_API_BASE` | No | PayPal REST API endpoint (Sandbox) | `https://api-m.sandbox.paypal.com` |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key from Google AI Studio | `your_gemini_api_key` |
| `GEMINI_MODEL` | No | Gemini model to use (default: `gemini-3.8-flash`) | `gemini-3.8-flash` |
| `PORT` | Auto | Listening port (Render sets this automatically) | `10000` or `3000` |

> [!NOTE]
> **Hosted Demo Disclaimer:**
> - **PayPal Sandbox Only:** The hosted demo operates strictly in PayPal's Sandbox mode. No real money or real credit cards are processed.
> - **Ephemeral Storage & Service Restarts:** The app uses local JSON storage (`data/invoices.json`). Render's free tier spins down after periods of inactivity, so invoice history will automatically reset to `[]` whenever the service restarts. The storage service automatically recreates the `data/` directory and an empty `invoices.json` if missing.

---

## 🧪 Testing the Workflow

1. In the input box, type:
   ```text
   Invoice Ravi $50 for logo design, due next Friday.
   ```
2. (Optional) Type your name in the **Your Name** field (e.g. `Alex Rivera`).
3. Click **Extract with AI**.
4. Review the extracted fields in Step 2:
   - **Client Name:** `Ravi`
   - **Amount:** `50.00`
   - **Currency:** `USD`
   - **Due Date:** Formatted Friday date (e.g., `YYYY-MM-DD`)
   - **Description:** `logo design`
5. Click **Confirm & Generate PayPal Order**.
6. Step 3 appears with:
   - An active **PayPal Sandbox Payment Link**.
   - A tailored, courteous reminder message signed with `Best regards, Alex Rivera`.
7. **Test Payment with Sandbox Buyer**:
   - Copy the payment link or click **Open Checkout &rarr;** in an **Incognito / Private browser window** (to prevent conflicts with any existing PayPal cookies).
   - Log in using your **US Personal Sandbox Buyer** test account.
   - Click **Complete Purchase**.
   - PayPal will redirect back to `${BASE_URL}/?status=paid`, automatically triggering the server-side capture.
   - The UI displays a green **Payment Successful** banner and updates the invoice status in the history table to **PAID** with a `✓ Paid` badge.

---

## 🔧 Troubleshooting

- **Seller Cannot Pay Itself**: PayPal does not allow the merchant business account that created the order to pay itself. Always log into checkout with your separate **Personal Sandbox Buyer account**.
- **Currency / Country Restrictions**: If you receive an error about unsupported currencies or checkout limitations, verify in the PayPal Developer Dashboard that both the merchant business account and the buyer personal account have their country set to **United States (US)** and currency set to **USD**.
- **Harmless Browser Console Warnings**: When the PayPal sandbox checkout page opens, PayPal's frontend loads various diagnostic scripts that may display CDN or CSP warnings in the browser console. These warnings are standard PayPal sandbox behavior and do not impact payments or server capture.

---

## ⚠️ Known Limitations
- **Sandbox Mode Only**: Configured specifically for the PayPal Sandbox environment to enable risk-free testing without real financial transactions.
- **Local JSON Storage**: Invoices are stored in `data/invoices.json` for lightweight, zero-dependency local execution rather than an external SQL/NoSQL database. On ephemeral hosting environments like Render free tier, data resets to `[]` whenever the instance restarts.

---

## 🔮 What's Next
- **Official PayPal Invoicing API**: Transitioning to the full PayPal Invoicing API to generate formal, itemized PDF invoices delivered directly to client inboxes.
- **Voice Dictation via Gemini Live API**: Allowing busy freelancers to dictate invoices hands-free from mobile devices.
- **Automated Follow-ups**: Scheduling recurring, increasingly urgent payment reminder messages as the due date approaches.
- **Multi-Currency Auto-Conversion**: Real-time currency conversions via PayPal FX rates for international clients.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE). Copyright &copy; 2026 Udhaya Suriya.
