# Demo Video Script: AI Invoice Assistant
**Target Duration:** ~2 minutes 15 seconds (Under 2.5 minutes)  
**Style:** Screen recording with clear, natural voiceover (no background music).  
**Resolution:** 1080p (Full Screen browser at [http://localhost:3000](http://localhost:3000)).

---

## Video Walkthrough Timeline

### 0:00 - 0:20 | Introduction & The Problem
- **On Screen:** Start at the top of the AI Invoice Assistant homepage. Hover briefly over the header showing **AI Invoice Assistant** and the prominent **PayPal Sandbox Mode** and **Gemini Flash** badges.
- **Voiceover:**
  > *"Hi everyone! Invoicing as a freelancer or small business owner is often slow and awkward—calculating dates, setting up payment links, and drafting reminder emails takes time you'd rather spend working. For the PayPal AI Hackathon, I built the AI Invoice Assistant. It turns a single conversational sentence into an official PayPal sandbox checkout link and a polite, ready-to-send payment reminder in seconds."*

---

### 0:20 - 0:45 | Step 1: Plain-English Input & AI Extraction
- **On Screen:** 
  1. In the **Your Name** field, type your name (e.g., `Alex Rivera`).
  2. Click into the textarea and type or click the example chip:
     `Invoice Ravi $50 for logo design, due next Friday.`
  3. Click the blue **Extract with AI** button.
- **Voiceover:**
  > *"Here's how simple it is: I enter my name, and then I just type naturally: 'Invoice Ravi $50 for logo design, due next Friday.' When I click 'Extract with AI', the request goes to Google Gemini 3.8 Flash using a strict schema-constrained JSON output. In less than a second, it extracts Ravi as the client, fifty dollars USD, the description, and automatically converts 'next Friday' into a formatted calendar date."*

---

### 0:45 - 1:05 | Step 2: Human-in-the-Loop Review & PayPal Order Creation
- **On Screen:** 
  1. Scroll slightly to **Step 2: Review and confirm invoice details**.
  2. Point out the fields. Tweak one field to show flexibility (e.g., change amount from `50.00` to `55.00` or adjust description).
  3. Click the yellow **Confirm & Generate PayPal Order** button.
- **Voiceover:**
  > *"We keep a human in the loop: nothing is charged or sent without confirmation. I can easily adjust any field—let's say updating the amount to $55. When satisfied, I click 'Confirm & Generate PayPal Order'. Our Node.js backend calls the PayPal Orders v2 REST API in sandbox mode to create an authentic checkout order, while Gemini simultaneously drafts a personalized reminder message."*

---

### 1:05 - 1:25 | Step 3: Payment Link & AI Reminder Copy
- **On Screen:** 
  1. The green **Step 3: Ready!** card appears.
  2. Point to the PayPal Sandbox payment link input and Order ID.
  3. Point to the **AI-Generated Client Reminder Message** box below it. Highlight the custom signature: `Best regards, Alex Rivera`.
  4. Click **📋 Copy Message** (notice the toast: *"Client reminder message copied!"*).
- **Voiceover:**
  > *"Instantly, Step 3 appears with an official PayPal sandbox payment link. Below it, Gemini has drafted a friendly, professional reminder message ready to copy straight into Slack, WhatsApp, or an email. Notice how it cleanly includes the invoice amount, due date, payment link, and signs off with 'Best regards, Alex Rivera'—with zero generic placeholders."*

---

### 1:25 - 1:55 | Live Sandbox Checkout (Private Window)
- **On Screen:** 
  1. Click **Copy Link** on the payment box.
  2. Open a new **Incognito / Private browser window** and paste the URL (or right-click 'Open Checkout' and open in incognito).
  3. When the PayPal Sandbox login screen loads, log in using your US Personal Sandbox Buyer test account credentials.
  4. Review the order: *Total $55.00 USD*.
  5. Click the blue **Complete Purchase** button.
- **Voiceover:**
  > *"Now let's test paying. I'll open the checkout link in a private window to keep test cookies clean. This brings up the real PayPal Sandbox checkout experience. I log in with a US Personal test buyer account, review the $55 amount, and click 'Complete Purchase'."*

---

### 1:55 - 2:15 | Automated Capture & Real-Time Status Update
- **On Screen:** 
  1. PayPal completes the transaction and redirects back to `http://localhost:3000/?status=paid`.
  2. Point out the celebratory green banner at the top:
     `🎉 Payment Successful! Invoice INV-XXXX was captured and updated to PAID in records.`
  3. Scroll to the **Invoice History** table:
     Show that the invoice row is highlighted and its status is now **PAID** with a green **`✓ Paid`** badge replacing the checkout button.
- **Voiceover:**
  > *"Upon approval, PayPal automatically redirects back to our server, which captures the order in real-time. Notice the green success banner, and look at the Invoice History table: the invoice immediately updates to PAID, and the payment button transforms into a green 'Paid' badge—no manual refresh needed."*

---

### 2:15 - 2:25 | Closing Line
- **On Screen:** Scroll back up to the header showing the clean interface and brand badges.
- **Voiceover:**
  > *"By combining the intelligence of Google Gemini with the security and reach of PayPal Orders v2, the AI Invoice Assistant makes getting paid effortless for creators and freelancers worldwide. Thank you for watching!"*
