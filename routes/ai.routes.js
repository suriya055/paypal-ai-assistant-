import express from 'express';
import { parseInvoicePrompt, generateReminderMessage } from '../services/gemini.service.js';

const router = express.Router();

/**
 * POST /api/ai/parse
 * Body: { prompt: "Invoice Ravi $50 for logo design, due next Friday" }
 */
router.post('/parse', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a sentence describing the invoice (e.g. "Invoice Ravi $50 for logo design").',
      });
    }

    const extracted = await parseInvoicePrompt(prompt);

    return res.json({
      success: true,
      data: extracted,
    });
  } catch (error) {
    console.error('Error in /api/ai/parse:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract invoice data using AI.',
    });
  }
});

/**
 * POST /api/ai/reminder
 * Generates an updated reminder message if user edits fields
 */
router.post('/reminder', async (req, res) => {
  try {
    const { client_name, amount, currency, description, due_date, payment_link } = req.body;

    if (!payment_link) {
      return res.status(400).json({
        success: false,
        error: 'A payment link is required to generate a reminder message.',
      });
    }

    const message = await generateReminderMessage({
      client_name: client_name || 'Client',
      amount: amount || 0,
      currency: currency || 'USD',
      description: description || 'Services rendered',
      due_date: due_date || '',
      payment_link,
    });

    return res.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Error in /api/ai/reminder:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate reminder message.',
    });
  }
});

export default router;
