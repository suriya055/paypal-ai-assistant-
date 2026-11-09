import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the Google GenAI client (uses process.env.GEMINI_API_KEY by default)
const ai = new GoogleGenAI();

// Primary model: gemini-3.8-flash, with automatic resilient fallbacks
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];

// Cache models that hit 429 RESOURCE_EXHAUSTED so subsequent requests don't waste 10s waiting
const modelCooldowns = new Map();

/**
 * Resilient helper to call Gemini with the primary model
 * and automatically fallback if Google AI Studio reports high demand (503) or quota limits (429).
 */
async function generateWithModelFallback({ contents, config }) {
  const modelQueue = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
  let lastError = null;
  const now = Date.now();

  // Prioritize models that are NOT in active 429 quota exhaustion cooldown
  const readyModels = modelQueue.filter((m) => {
    const cooldown = modelCooldowns.get(m);
    return !cooldown || now > cooldown;
  });

  const queueToTry = readyModels.length > 0 ? readyModels : modelQueue;

  for (const model of queueToTry) {
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
      const isQuota =
        err.message?.includes('429') ||
        err.message?.includes('RESOURCE_EXHAUSTED') ||
        err.message?.includes('quota');

      if (isQuota) {
        console.warn(`[Gemini AI] Model ${model} is quota-exhausted (429). Cooling down for 30m and trying next model...`);
        modelCooldowns.set(model, Date.now() + 30 * 60 * 1000);
      } else {
        console.warn(`[Gemini AI] Model ${model} encountered: ${err.message}. Trying next available model...`);
      }
    }
  }

  throw lastError || new Error('All available Gemini models failed to respond.');
}

/**
 * Extracts structured invoice details from a plain-English user prompt.
 * Uses Gemini Flash with strict JSON schema to guarantee valid structured output.
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
4. Ensure amount is a valid positive number (e.g., "$50" -> 50, "fifty dollars" -> 50).
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
 * and send directly to their client via email, WhatsApp, or Slack.
 */
export async function generateReminderMessage({ client_name, amount, currency, description, due_date, payment_link, sender_name }) {
  const signOff = sender_name ? `Best regards,\n${sender_name}` : 'Best regards';

  const prompt = `
Write a friendly, polite, and professional payment reminder message from a freelancer to a client.
Details:
- Client Name: ${client_name}
- Service / Description: ${description}
- Total Amount: ${currency} ${Number(amount).toFixed(2)}
- Due Date: ${due_date}
- PayPal Payment Link: ${payment_link}
- Sender Name: ${sender_name || 'The Freelancer'}

Requirements:
- Keep it under 4 sentences.
- Clear, warm, non-confrontational tone.
- Clearly present the payment link on its own line.
- End with "${signOff}".
- Output the raw message text only (no quotes, no markdown fences).
`.trim();

  try {
    const { text } = await generateWithModelFallback({
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return text.trim();
  } catch (error) {
    console.warn('Gemini reminder fallback used due to error:', error.message);
    return `Hi ${client_name},\n\nI hope you're having a great week! Here is the invoice for ${description} totaling ${currency} ${Number(amount).toFixed(2)}, due on ${due_date}.\n\nYou can easily review and pay securely via PayPal here:\n${payment_link}\n\n${signOff}`;
  }
}
