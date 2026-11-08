import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the Google GenAI client (uses process.env.GEMINI_API_KEY by default)
const ai = new GoogleGenAI();

// Primary model requested: gemini-3.8-flash, with automatic resilient fallbacks
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];

/**
 * Resilient helper to call Gemini with the primary model (gemini-3.8-flash)
 * and automatically fallback if Google AI Studio reports high demand (503) or quota limits.
 */
async function generateWithModelFallback({ contents, config }) {
  const modelQueue = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
  let lastError = null;

  for (const model of modelQueue) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini AI] Model ${model} encountered: ${err.message}. Trying next available model...`);
    }
  }

  throw lastError || new Error('All available Gemini models failed to respond.');
}

/**
 * Extracts structured invoice details from a plain-English user prompt.
 * Uses Gemini 3.8 Flash with strict JSON schema to guarantee valid structured output.
 */
export async function parseInvoicePrompt(userPrompt) {
  if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
    throw new Error('Please provide an invoice prompt (e.g., "Invoice Ravi $50 for logo design, due next Friday").');
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const systemInstruction = `
You are an expert AI Invoice Assistant for freelancers and small businesses.
Your job is to extract structured invoice data from informal conversational prompts.
Today's date is: ${todayStr}.
Rules:
1. Calculate relative dates (like "next Friday", "in 5 days", "end of month") starting from today (${todayStr}) in YYYY-MM-DD format.
2. If no due date is mentioned, calculate a default date 7 days from today.
3. If currency is not specified or is '$', use "USD". If symbols like '€' or '£' are used, use "EUR" or "GBP".
4. Ensure amount is a valid positive number (e.g., "$50" -> 50).
5. Extract client_name, amount, currency, description, and due_date accurately.
`.trim();

  try {
    const { text: rawText, modelUsed } = await generateWithModelFallback({
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            client_name: {
              type: 'string',
              description: 'Name of the client or company to invoice.',
            },
            amount: {
              type: 'number',
              description: 'Total numerical invoice amount (e.g. 50.00).',
            },
            currency: {
              type: 'string',
              description: '3-letter ISO currency code such as USD, EUR, GBP, CAD.',
            },
            description: {
              type: 'string',
              description: 'Description of the service or product delivered.',
            },
            due_date: {
              type: 'string',
              description: 'Due date in YYYY-MM-DD format.',
            },
          },
          required: ['client_name', 'amount', 'currency', 'description', 'due_date'],
        },
      },
    });

    console.log(`[Gemini AI] Invoice prompt parsed successfully using model: ${modelUsed}`);
    const parsed = JSON.parse(rawText);

    return {
      client_name: parsed.client_name ? String(parsed.client_name).trim() : '',
      amount: typeof parsed.amount === 'number' && parsed.amount > 0 ? Number(parsed.amount.toFixed(2)) : 0,
      currency: (parsed.currency || 'USD').toUpperCase().trim(),
      description: parsed.description ? String(parsed.description).trim() : 'Services rendered',
      due_date: parsed.due_date || todayStr,
    };
  } catch (error) {
    console.error('Gemini extraction error:', error);
    throw new Error(`Failed to extract invoice data with AI: ${error.message}`);
  }
}

/**
 * Generates a short, polite, professional reminder message that the user can copy
 * and send to their client with the payment link.
 */
export async function generateReminderMessage({ client_name, amount, currency, description, due_date, payment_link, sender_name }) {
  const cleanSender = (sender_name || '').trim();
  const signatureRule = cleanSender
    ? `Sign the message with "Best regards, ${cleanSender}".`
    : `Sign the message with "Best regards".`;

  const prompt = `
Write a friendly, professional, and concise payment reminder message for:
- Client Name: ${client_name}
- Amount: ${currency} ${Number(amount).toFixed(2)}
- Description: ${description}
- Due Date: ${due_date || 'upon receipt'}
- PayPal Payment Link: ${payment_link}
${cleanSender ? `- Sender Name: ${cleanSender}` : ''}

Requirements:
1. Ready to copy and paste directly into an email, WhatsApp, or Slack message. Include the link clearly.
2. Do not output any placeholders (never output "[Your Name]", "[Company]", or similar).
3. ${signatureRule}
`.trim();

  try {
    const { text: responseText, modelUsed } = await generateWithModelFallback({
      contents: prompt,
    });

    console.log(`[Gemini AI] Reminder message generated successfully using model: ${modelUsed}`);
    return responseText.trim();
  } catch (error) {
    console.error('Gemini reminder message error:', error);
    // Fallback template if LLM call fails
    const signOff = cleanSender ? `Best regards,\n${cleanSender}` : 'Best regards';
    return `Hi ${client_name},\n\nI hope you're having a great week! Here is the invoice for ${description} totaling ${currency} ${Number(amount).toFixed(2)}, due on ${due_date}.\n\nYou can easily review and pay securely via PayPal here:\n${payment_link}\n\n${signOff}`;
  }
}
