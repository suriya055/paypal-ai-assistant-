# Devpost Project Submission Draft

## 💡 Inspiration
As freelancers and independent contractors, doing the actual work is rewarding, but managing the administrative overhead of billing is painful. Drafting invoices, looking up calendar dates, logging into payment portals to generate payment links, and then writing uncomfortable follow-up reminders often takes more cognitive energy than the service delivered. 

We asked ourselves: *Why can't you just say or type what you did in plain English, and have an AI instantly prepare an authentic PayPal checkout link and a polite, ready-to-send payment reminder?*

This inspired the **AI Invoice Assistant** for the PayPal AI Hackathon—bridging the conversational power of modern generative AI with the global trust and reach of PayPal's payment platform.

---

## 🚀 What It Does
**AI Invoice Assistant** turns plain conversational language into working PayPal Sandbox payment orders in seconds:

1. **Conversational Input (Voice or Text)**: The user speaks via the native microphone button or types an informal instruction (e.g., *"Invoice Ravi $50 for logo design, due next Friday"*).
2. **Schema-Constrained AI Extraction**: Powered by Google Gemini Flash, the backend parses the sentence into structured data: client name, numerical amount, currency code, service description, and resolves relative dates ("next Friday", "in 5 days") into ISO `YYYY-MM-DD` dates relative to current server time.
3. **Human-in-the-Loop Review**: An intuitive confirmation form presents the extracted data so the user can verify or adjust any field before any transaction is initiated.
4. **PayPal Orders v2 Integration**: With one click, the server creates an official PayPal Sandbox order (`intent: CAPTURE`) and returns an active checkout link.
5. **Personalized Reminder Copy**: Gemini writes a polite, concise payment reminder containing the payment link, automatically signed with the user's name (stored in browser session memory) or a clean "Best regards".
6. **Automated Server Capture**: When the buyer completes payment in PayPal Sandbox, PayPal redirects back to the server, which captures the order in real-time, updates the record to **PAID**, and highlights the completed invoice in the history log without requiring a manual page refresh.

---

## 🛠️ How I Built It
- **Google Gemini API (`@google/genai` Node SDK)**: Utilized `gemini-3.8-flash` (with automatic fallback resilience) with strict JSON `responseSchema` to guarantee structured output format. Also powers the tone-aware generation of client reminder copy.
- **PayPal Developer Platform (Orders v2 REST API)**: Integrated OAuth2 client credentials authentication, dynamic order creation with custom line items, approval redirects, and server-side capture execution (`POST /v2/checkout/orders/{id}/capture`).
- **Node.js & Express**: Provides a lightweight, secure REST backend that keeps client credentials and API keys completely hidden from the browser.
- **Antigravity**: Used as the primary agentic AI coding assistant from Google DeepMind to architect the modular backend, write clean vanilla frontend logic, establish security controls, and systematically verify responsive mobile layouts across viewports.
- **Web Speech API**: Integrated native speech recognition for real-time voice typing, allowing users to speak their invoices completely hands-free on both mobile and desktop.
- **Vanilla Frontend & CSS**: Crafted with pure HTML5, CSS3, and ES6 JavaScript with zero frontend dependencies for near-instant load times and clean mobile presentation.

---

## 🧗 Challenges I Ran Into

1. **PayPal Sandbox India Country/Currency Restriction**:
   During initial testing, attempting to process USD orders using a sandbox account set with India country settings failed with currency and compliance errors. PayPal enforces strict cross-border and domestic regulations for accounts based in certain jurisdictions. We resolved this by explicitly creating and configuring **US Business** (merchant) and **US Personal** (buyer) accounts in the developer dashboard, ensuring seamless USD transactions.

2. **The "Seller Cannot Pay Itself" Error**:
   When testing checkout in the same browser session where the developer dashboard was open, PayPal recognized the merchant credentials and blocked payment with an error preventing a seller from buying their own product. We solved this by designing the workflow to test in an **Incognito / Private browser window**, logging in exclusively with the dedicated Personal Sandbox Buyer account.

3. **Handling Checkout Redirects & Preventing Stale State**:
   Ensuring the return redirect captured the payment on the server, marked the invoice as `PAID`, and cleaned up URL parameters (`window.history.replaceState`) so that refreshing the browser would not repeatedly show the success banner.

4. **Accurate Date Arithmetic with LLMs**:
   Conversational phrases like "due next Friday" or "due in 5 days" require temporal context. We resolved this by dynamically injecting today's ISO date into Gemini's system instructions, allowing the model to calculate exact target calendar dates.

---

## 🏆 Accomplishments That I'm Proud Of
- Built a true end-to-end working prototype that meaningfully connects both Google Gemini and PayPal Orders v2.
- Clean human-in-the-loop design: AI performs the tedious extraction, but the user always retains full control before generating the official payment link.
- Fully responsive interface that transforms data tables into touch-friendly stacked cards on mobile devices (360px - 430px) with zero horizontal overflow.
- Zero client-side API key exposure and clean git hygiene.

---

## 📚 What I Learned
- Deepened understanding of PayPal's Orders v2 REST lifecycle (order initialization, application context redirects, and capture verification).
- Best practices for combining structured outputs (`responseSchema`) with open-ended generation in the new Google GenAI SDK.
- How to structure clean, framework-free web applications that remain fast, accessible, and maintainable.

---

## 🔮 What's Next
- **Live In-Person Shopkeeper & Customer Co-Presence Mode**: A real-time dual-screen interface where a local merchant or shopkeeper speaks items naturally, the customer sees a live interactive display updating in real-time, and pays instantly via on-screen dynamic PayPal QR codes.
- **PayPal Invoicing API**: Transitioning from checkout orders to official PDF invoices sent directly to client email inboxes with tax and discount lines.
- **Gemini Live API Bidirectional Voice Assistant**: Enabling continuous, full voice conversations with conversational adjustments and queries.
- **Automated Escalation Reminders**: Generating scheduled reminder sequences (friendly nudge &rarr; due date reminder &rarr; overdue follow-up).
- **Direct Messaging Integrations**: Adding one-click share buttons directly to WhatsApp, Slack, and email clients.
