import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'invoices.json');

/**
 * Ensures the data directory exists and invoices.json exists with valid JSON array ([]).
 * Creates directory and file automatically if missing or corrupt.
 */
export async function ensureDataFile() {
  try {
    // 1. Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    // 2. Check if invoices.json exists and contains a valid JSON array
    try {
      await fs.access(DATA_FILE);
      const content = await fs.readFile(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch {
      // File does not exist, is 0 bytes, or corrupt: write empty array
      await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to initialize data folder or invoices.json:', err);
  }
}

export async function getAllInvoices() {
  await ensureDataFile();
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getInvoiceById(id) {
  const invoices = await getAllInvoices();
  return invoices.find((inv) => inv.id === id || inv.paypal_order_id === id) || null;
}

export async function saveInvoice(invoice) {
  const invoices = await getAllInvoices();
  const existingIndex = invoices.findIndex((inv) => inv.id === invoice.id);

  if (existingIndex >= 0) {
    invoices[existingIndex] = { ...invoices[existingIndex], ...invoice, updatedAt: new Date().toISOString() };
  } else {
    invoices.unshift({
      ...invoice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(invoices, null, 2), 'utf-8');
  return invoice;
}

export async function updateInvoiceStatus(id, status, extra = {}) {
  const invoices = await getAllInvoices();
  const index = invoices.findIndex((inv) => inv.id === id || inv.paypal_order_id === id);

  if (index >= 0) {
    invoices[index] = {
      ...invoices[index],
      status,
      ...extra,
      updatedAt: new Date().toISOString(),
    };
    await ensureDataFile();
    await fs.writeFile(DATA_FILE, JSON.stringify(invoices, null, 2), 'utf-8');
    return invoices[index];
  }
  return null;
}

export async function deleteInvoice(id) {
  const invoices = await getAllInvoices();
  const filtered = invoices.filter((inv) => inv.id !== id && inv.paypal_order_id !== id);
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}

export async function clearAllInvoices() {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  return true;
}
