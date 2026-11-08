import express from 'express';
import { createOrder, captureOrder, getBaseUrl } from '../services/paypal.service.js';
import { generateReminderMessage } from '../services/gemini.service.js';
import { saveInvoice, getInvoiceById, updateInvoiceStatus } from '../services/storage.service.js';

const router = express.Router();

/**
 * POST /api/paypal/create-order
 * Creates PayPal order, generates AI reminder message, and saves invoice.
 */
router.post('/create-order', async (req, res) => {
  try {
    const { client_name, amount, currency, description, due_date, sender_name } = req.body;

    // Validate required fields
    if (!client_name || !client_name.trim()) {
      return res.status(400).json({ success: false, error: 'Client name is required.' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, error: 'A valid positive amount is required.' });
    }

    const cleanCurrency = (currency || 'USD').toUpperCase().trim();
    const cleanDescription = (description || 'Services rendered').trim();
    const cleanDueDate = due_date || new Date().toISOString().split('T')[0];
    const cleanSenderName = (sender_name || '').trim();

    // Generate unique local invoice ID
    const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}`;

    // 1. Call PayPal Sandbox Orders v2 API
    const { orderId, approvalUrl } = await createOrder({
      invoiceId,
      amount: numericAmount,
      currency: cleanCurrency,
      description: `${cleanDescription} - ${client_name}`,
    });

    // 2. Call Gemini to craft a polite, ready-to-copy reminder message
    let reminderMessage = '';
    try {
      reminderMessage = await generateReminderMessage({
        client_name,
        amount: numericAmount,
        currency: cleanCurrency,
        description: cleanDescription,
        due_date: cleanDueDate,
        payment_link: approvalUrl,
        sender_name: cleanSenderName,
      });
    } catch (err) {
      console.warn('AI reminder generation warning:', err.message);
      const signOff = cleanSenderName ? `Best regards,\n${cleanSenderName}` : 'Best regards';
      reminderMessage = `Hi ${client_name},\n\nPlease find your payment link for ${cleanDescription} (${cleanCurrency} ${numericAmount.toFixed(2)}) here:\n${approvalUrl}\n\n${signOff}`;
    }

    // 3. Save invoice locally
    const invoiceRecord = {
      id: invoiceId,
      client_name: client_name.trim(),
      amount: numericAmount,
      currency: cleanCurrency,
      description: cleanDescription,
      due_date: cleanDueDate,
      sender_name: cleanSenderName,
      status: 'CREATED',
      paypal_order_id: orderId,
      payment_link: approvalUrl,
      reminder_message: reminderMessage,
    };

    await saveInvoice(invoiceRecord);

    return res.json({
      success: true,
      invoice: invoiceRecord,
    });
  } catch (error) {
    console.error('Error in /api/paypal/create-order:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create PayPal order.',
    });
  }
});

/**
 * GET /api/paypal/pay/:invoiceId
 * Redirects directly to the PayPal sandbox checkout page for a given invoice.
 */
router.get('/pay/:invoiceId', async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.invoiceId);
    if (!invoice || !invoice.payment_link) {
      return res.status(404).send('Invoice or payment link not found.');
    }
    return res.redirect(invoice.payment_link);
  } catch (error) {
    return res.status(500).send('Error redirecting to payment checkout.');
  }
});

/**
 * GET /api/paypal/capture
 * PayPal redirects the buyer here after approval.
 * Query params: token (PayPal Order ID), PayerID, invoiceId
 */
router.get('/capture', async (req, res) => {
  const { token, invoiceId } = req.query;
  const baseUrl = getBaseUrl();

  if (!token) {
    return res.redirect(`${baseUrl}/?status=error&message=${encodeURIComponent('Missing PayPal order token.')}`);
  }

  try {
    console.log(`Capturing PayPal order ${token} for invoice ${invoiceId || 'unknown'}...`);
    const captureResult = await captureOrder(token);
    console.log(`Order ${token} captured successfully:`, captureResult.status);

    // Update invoice record to PAID in data/invoices.json
    let updatedInvoice = null;
    if (invoiceId) {
      updatedInvoice = await updateInvoiceStatus(invoiceId, 'PAID', {
        capturedAt: new Date().toISOString(),
        captureDetails: {
          id: captureResult.id,
          status: captureResult.status,
          payer: captureResult.payer,
        },
      });
    }

    if (!updatedInvoice) {
      // Fallback matching by paypal_order_id = token
      updatedInvoice = await updateInvoiceStatus(token, 'PAID', {
        capturedAt: new Date().toISOString(),
        captureDetails: {
          id: captureResult.id,
          status: captureResult.status,
          payer: captureResult.payer,
        },
      });
    }

    const targetInvoiceId = updatedInvoice?.id || invoiceId || '';
    // Redirect buyer back to home page with success status using configured BASE_URL
    return res.redirect(`${baseUrl}/?status=paid&invoiceId=${encodeURIComponent(targetInvoiceId)}&orderId=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('Capture error:', error);
    return res.redirect(`${baseUrl}/?status=error&invoiceId=${encodeURIComponent(invoiceId || '')}&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/paypal/cancel
 * PayPal redirects here if buyer cancels checkout.
 */
router.get('/cancel', async (req, res) => {
  const { invoiceId, token } = req.query;
  const baseUrl = getBaseUrl();
  console.log(`Payment cancelled for invoice ${invoiceId || token}. Status remains CREATED.`);
  return res.redirect(`${baseUrl}/?status=cancelled&invoiceId=${encodeURIComponent(invoiceId || '')}`);
});

export default router;
