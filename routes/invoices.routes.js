import express from 'express';
import { getAllInvoices, getInvoiceById, deleteInvoice, clearAllInvoices, updateInvoiceStatus } from '../services/storage.service.js';
import { getOrderDetails } from '../services/paypal.service.js';

const router = express.Router();

/**
 * GET /api/invoices
 * Returns all invoices, sorted newest first.
 */
router.get('/', async (req, res) => {
  try {
    const invoices = await getAllInvoices();
    return res.json({ success: true, invoices });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/invoices/:id
 * Returns single invoice details.
 */
router.get('/:id', async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }
    return res.json({ success: true, invoice });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/invoices/:id/sync
 * Syncs invoice status directly with PayPal Sandbox to see if it was captured.
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    if (!invoice.paypal_order_id) {
      return res.status(400).json({ success: false, error: 'Invoice has no PayPal order ID.' });
    }

    const orderDetails = await getOrderDetails(invoice.paypal_order_id);
    let newStatus = invoice.status;

    if (orderDetails.status === 'COMPLETED') {
      newStatus = 'PAID';
    } else if (orderDetails.status === 'VOIDED') {
      newStatus = 'CANCELLED';
    }

    const updated = await updateInvoiceStatus(invoice.id, newStatus, {
      paypal_status: orderDetails.status,
    });

    return res.json({ success: true, invoice: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/invoices
 * Clears all test invoices.
 */
router.delete('/', async (req, res) => {
  try {
    await clearAllInvoices();
    return res.json({ success: true, message: 'All test invoices cleared.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/invoices/:id
 * Deletes a single invoice by ID.
 */
router.delete('/:id', async (req, res) => {
  try {
    await deleteInvoice(req.params.id);
    return res.json({ success: true, message: `Invoice ${req.params.id} deleted.` });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
