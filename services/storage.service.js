import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'invoices.json');

// Ensure data file exists
async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export async function getAllInvoices() {
  await ensureDataFile();
  const content = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(content) || [];
  } catch {
    return [];
  }
}

export async function getInvoiceById(id) {
  const invoices = await getAllInvoices();
  return invoices.find((inv) => inv.id === id) || null;
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
    await fs.writeFile(DATA_FILE, JSON.stringify(invoices, null, 2), 'utf-8');
    return invoices[index];
  }
  return null;
}

export async function deleteInvoice(id) {
  const invoices = await getAllInvoices();
  const filtered = invoices.filter((inv) => inv.id !== id && inv.paypal_order_id !== id);
  await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}

export async function clearAllInvoices() {
  await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  return true;
}
