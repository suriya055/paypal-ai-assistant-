// DOM Elements
const promptForm = document.getElementById('promptForm');
const promptInput = document.getElementById('promptInput');
const senderNameInput = document.getElementById('senderNameInput');
const extractBtn = document.getElementById('extractBtn');
const voiceTypingBtn = document.getElementById('voiceTypingBtn');
const voiceStatus = document.getElementById('voiceStatus');
const voiceStatusText = document.getElementById('voiceStatusText');
const exampleChips = document.querySelectorAll('.example-chip');

const reviewSection = document.getElementById('reviewSection');
const confirmForm = document.getElementById('confirmForm');
const clientNameInput = document.getElementById('clientNameInput');
const amountInput = document.getElementById('amountInput');
const currencySelect = document.getElementById('currencySelect');
const currencySymbol = document.getElementById('currencySymbol');
const dueDateInput = document.getElementById('dueDateInput');
const descriptionInput = document.getElementById('descriptionInput');
const reviewSenderNameInput = document.getElementById('reviewSenderNameInput');
const discardBtn = document.getElementById('discardBtn');
const createOrderBtn = document.getElementById('createOrderBtn');

const resultSection = document.getElementById('resultSection');
const paymentLinkInput = document.getElementById('paymentLinkInput');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const payNowBtn = document.getElementById('payNowBtn');
const metaInvoiceId = document.getElementById('metaInvoiceId');
const metaOrderId = document.getElementById('metaOrderId');
const resultStatusPill = document.getElementById('resultStatusPill');
const reminderTextDisplay = document.getElementById('reminderTextDisplay');
const copyReminderBtn = document.getElementById('copyReminderBtn');

const historySection = document.getElementById('historySection');
const invoicesTableBody = document.getElementById('invoicesTableBody');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

const statusBanner = document.getElementById('statusBanner');
const bannerMessage = document.getElementById('bannerMessage');
const bannerIcon = document.getElementById('bannerIcon');
const closeBannerBtn = document.getElementById('closeBannerBtn');
const toast = document.getElementById('toast');

// Map currency code to symbol
const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: '$',
  AUD: '$',
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  initVoiceTyping();
  await loadInvoices();
  await handleUrlQueryParams();

  // Background auto-refresh: sync history every 10s in case user pays in another tab/window
  setInterval(loadInvoices, 10000);
});

function setupEventListeners() {
  // Initialize sender name from sessionStorage
  const savedSenderName = sessionStorage.getItem('invoice_sender_name') || '';
  if (senderNameInput) senderNameInput.value = savedSenderName;
  if (reviewSenderNameInput) reviewSenderNameInput.value = savedSenderName;

  // Sync sender name inputs and save to sessionStorage
  if (senderNameInput) {
    senderNameInput.addEventListener('input', () => {
      const val = senderNameInput.value;
      if (reviewSenderNameInput) reviewSenderNameInput.value = val;
      sessionStorage.setItem('invoice_sender_name', val.trim());
    });
  }

  if (reviewSenderNameInput) {
    reviewSenderNameInput.addEventListener('input', () => {
      const val = reviewSenderNameInput.value;
      if (senderNameInput) senderNameInput.value = val;
      sessionStorage.setItem('invoice_sender_name', val.trim());
    });
  }

  // Example chips click
  exampleChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      promptInput.value = chip.dataset.prompt;
      promptInput.focus();
    });
  });

  // Currency select change updates symbol prefix
  currencySelect.addEventListener('change', () => {
    const sym = currencySymbols[currencySelect.value] || '$';
    currencySymbol.textContent = sym;
  });

  // Step 1: Prompt Form Submit
  promptForm.addEventListener('submit', handleExtractPrompt);

  // Discard & start over
  discardBtn.addEventListener('click', () => {
    reviewSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    promptInput.value = '';
    promptInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Step 2: Confirm & Create Order Submit
  confirmForm.addEventListener('submit', handleConfirmOrder);

  // Copy Buttons
  copyLinkBtn.addEventListener('click', () => {
    copyToClipboard(paymentLinkInput.value, 'Payment link copied! (Tip: Open in an Incognito window to pay)');
  });

  copyReminderBtn.addEventListener('click', () => {
    copyToClipboard(reminderTextDisplay.textContent, 'Client reminder message copied!');
  });

  // Refresh History
  refreshHistoryBtn.addEventListener('click', loadInvoices);

  // Clear All Test Data
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', handleClearAllInvoices);
  }

  // Close Banner
  closeBannerBtn.addEventListener('click', () => {
    statusBanner.classList.add('hidden');
  });
}

/**
 * Handle URL query parameters when returning from PayPal Sandbox checkout
 */
async function handleUrlQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get('status');
  const invoiceId = urlParams.get('invoiceId');
  const orderId = urlParams.get('orderId');

  if (status === 'paid') {
    statusBanner.className = 'status-banner';
    bannerIcon.textContent = '🎉';
    bannerMessage.innerHTML = `<strong>Payment Successful!</strong> Invoice <code>${escapeHtml(invoiceId || '')}</code> was captured and updated to <strong>PAID</strong> in records. (Order: ${escapeHtml(orderId || '')})`;
    statusBanner.classList.remove('hidden');

    // Clean up URL parameters cleanly
    window.history.replaceState({}, document.title, window.location.pathname);

    // Immediately reload history table so it reflects PAID without clicking refresh
    await loadInvoices();

    // If result section is visible for this invoice, update its status pill too
    if (metaInvoiceId && metaInvoiceId.textContent === invoiceId) {
      resultStatusPill.textContent = 'PAID';
      resultStatusPill.className = 'status-pill status-paid';
    }

    // Highlight the paid row in the history table
    if (invoiceId) {
      const row = document.getElementById(`row-${invoiceId}`);
      if (row) {
        row.classList.add('row-highlight');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } else if (status === 'cancelled') {
    statusBanner.className = 'status-banner banner-cancelled';
    bannerIcon.textContent = 'ℹ️';
    bannerMessage.innerHTML = `<strong>Payment Cancelled:</strong> Checkout was cancelled. Invoice <code>${escapeHtml(invoiceId || '')}</code> remains active as <strong>CREATED</strong> and can be paid anytime.`;
    statusBanner.classList.remove('hidden');
    window.history.replaceState({}, document.title, window.location.pathname);
    await loadInvoices();
  } else if (status === 'error') {
    statusBanner.className = 'status-banner banner-error';
    bannerIcon.textContent = '⚠️';
    const errorMsg = urlParams.get('message') || 'An error occurred during checkout.';
    bannerMessage.innerHTML = `<strong>Payment Error:</strong> ${escapeHtml(errorMsg)} Invoice <code>${escapeHtml(invoiceId || '')}</code> remains in <strong>CREATED</strong> status.`;
    statusBanner.classList.remove('hidden');
    window.history.replaceState({}, document.title, window.location.pathname);
    await loadInvoices();
  }
}

/**
 * Step 1: Send prompt to Gemini API for entity extraction
 */
async function handleExtractPrompt(e) {
  e.preventDefault();
  const text = promptInput.value.trim();
  if (!text) return;

  setLoading(extractBtn, true);

  try {
    const res = await fetch('/api/ai/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to parse invoice prompt.');
    }

    const item = data.data;

    // Populate review form
    clientNameInput.value = item.client_name || '';
    amountInput.value = item.amount || '';
    currencySelect.value = item.currency || 'USD';
    currencySymbol.textContent = currencySymbols[currencySelect.value] || '$';
    descriptionInput.value = item.description || '';
    dueDateInput.value = item.due_date || new Date().toISOString().split('T')[0];

    // Reveal review section
    reviewSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    showToast('✨ Details extracted by Gemini Flash!');
  } catch (error) {
    console.error(error);
    alert(`AI Extraction Error: ${error.message}`);
  } finally {
    setLoading(extractBtn, false);
  }
}

/**
 * Step 2: Confirm fields and create PayPal Sandbox order
 */
async function handleConfirmOrder(e) {
  e.preventDefault();

  const payload = {
    client_name: clientNameInput.value.trim(),
    amount: parseFloat(amountInput.value),
    currency: currencySelect.value,
    description: descriptionInput.value.trim(),
    due_date: dueDateInput.value,
    sender_name: (reviewSenderNameInput?.value || senderNameInput?.value || '').trim(),
  };

  if (!payload.client_name || isNaN(payload.amount) || payload.amount <= 0) {
    alert('Please verify that the client name and a positive amount are filled in.');
    return;
  }

  setLoading(createOrderBtn, true);

  try {
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create PayPal order.');
    }

    const inv = data.invoice;

    // Populate results section
    paymentLinkInput.value = inv.payment_link;
    payNowBtn.href = inv.payment_link;
    metaInvoiceId.textContent = inv.id;
    metaOrderId.textContent = inv.paypal_order_id;
    resultStatusPill.textContent = inv.status;
    resultStatusPill.className = `status-pill status-${inv.status.toLowerCase()}`;
    reminderTextDisplay.textContent = inv.reminder_message || 'Reminder message generated.';

    // Reveal results
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Refresh history
    loadInvoices();

    showToast('💳 PayPal Order created successfully!');
  } catch (error) {
    console.error(error);
    alert(`PayPal Order Error: ${error.message}`);
  } finally {
    setLoading(createOrderBtn, false);
  }
}

/**
 * Fetch and render the invoice history
 */
async function loadInvoices() {
  try {
    const res = await fetch('/api/invoices?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch invoices.');
    }

    renderInvoicesTable(data.invoices || []);
  } catch (error) {
    console.error('Error loading invoices:', error);
  }
}

function renderInvoicesTable(invoices) {
  if (invoices.length === 0) {
    invoicesTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty">No invoices created yet. Generate your first one above!</td>
      </tr>
    `;
    return;
  }

  invoicesTableBody.innerHTML = invoices
    .map((inv) => {
      const sym = currencySymbols[inv.currency] || '$';
      const statusClass = `status-${(inv.status || 'created').toLowerCase()}`;
      const isPaid = (inv.status || '').toUpperCase() === 'PAID';

      return `
        <tr id="row-${inv.id}">
          <td data-label="Invoice ID"><strong>${escapeHtml(inv.id)}</strong></td>
          <td data-label="Client">${escapeHtml(inv.client_name)}</td>
          <td data-label="Description">${escapeHtml(inv.description)}</td>
          <td data-label="Amount"><strong>${sym}${Number(inv.amount).toFixed(2)}</strong> <small>${escapeHtml(inv.currency)}</small></td>
          <td data-label="Due Date">${escapeHtml(inv.due_date || '-')}</td>
          <td data-label="Status"><span class="status-pill ${statusClass}">${escapeHtml(inv.status)}</span></td>
          <td data-label="Actions">
            <div class="actions-cell">
              ${
                isPaid
                  ? `<span class="paid-label">✓ Paid</span>`
                  : `
                      ${inv.payment_link ? `<a href="${inv.payment_link}" target="_blank" class="btn btn-paypal btn-small" title="Pay with Sandbox in Incognito window">Pay with Sandbox</a>` : ''}
                      <button type="button" class="btn btn-sync btn-small" onclick="syncInvoice('${inv.id}')" title="Check and sync payment status with PayPal">🔄 Sync</button>
                    `
              }
              <button type="button" class="btn btn-delete btn-small" onclick="deleteInvoice('${inv.id}')" title="Delete invoice">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

// Global delete single invoice function
window.deleteInvoice = async function (id) {
  if (!confirm(`Are you sure you want to delete invoice ${id}?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Invoice ${id} deleted.`);
      await loadInvoices();
    } else {
      alert(`Delete error: ${data.error || 'Failed to delete invoice'}`);
    }
  } catch (err) {
    alert(`Network error: ${err.message}`);
  }
};

// Clear All Invoices function
async function handleClearAllInvoices() {
  if (!confirm('Are you sure you want to delete ALL test invoices? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch('/api/invoices', { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('All test invoices cleared.');
      await loadInvoices();
    } else {
      alert(`Clear error: ${data.error || 'Failed to clear invoices'}`);
    }
  } catch (err) {
    alert(`Network error: ${err.message}`);
  }
}

// Global sync function for inline button
window.syncInvoice = async function (id) {
  try {
    showToast('Checking PayPal status...');
    const res = await fetch(`/api/invoices/${id}/sync`, { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Status updated: ${data.invoice.status}`);
      loadInvoices();
    } else {
      alert(`Sync error: ${data.error || 'Failed to sync'}`);
    }
  } catch (err) {
    alert(`Network error: ${err.message}`);
  }
};

/**
 * Helper: Copy text to clipboard with feedback
 */
function copyToClipboard(text, successMsg) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg);
  }).catch(() => {
    showToast('Failed to copy. Please copy manually.');
  });
}

/**
 * Helper: Show a toast alert
 */
let toastTimeout;
function showToast(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

/**
 * Helper: Toggle button loading spinner
 */
function setLoading(button, isLoading) {
  const textSpan = button.querySelector('.btn-text');
  const spinnerSpan = button.querySelector('.btn-spinner');

  if (isLoading) {
    button.disabled = true;
    if (textSpan) textSpan.classList.add('hidden');
    if (spinnerSpan) spinnerSpan.classList.remove('hidden');
  } else {
    button.disabled = false;
    if (textSpan) textSpan.classList.remove('hidden');
    if (spinnerSpan) spinnerSpan.classList.add('hidden');
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Voice Typing (Speech-to-Text) using Web Speech API
 */
function initVoiceTyping() {
  if (!voiceTypingBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceTypingBtn.addEventListener('click', () => {
      alert('Voice typing is supported in Google Chrome, Microsoft Edge, and Safari on desktop and mobile. Please use a supported browser to speak your invoice.');
    });
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let isListening = false;
  let basePromptText = '';

  recognition.onstart = () => {
    isListening = true;
    basePromptText = promptInput.value.trim();
    voiceTypingBtn.classList.add('listening');
    voiceTypingBtn.innerHTML = '<span class="voice-icon">🛑</span> <span class="voice-label">Stop Listening</span>';
    if (voiceStatus) {
      voiceStatus.classList.remove('hidden');
      if (voiceStatusText) {
        voiceStatusText.textContent = 'Listening... Speak your invoice naturally (e.g. "Invoice Ravi $50 for logo design due next Friday")';
      }
    }
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    promptInput.value = basePromptText ? `${basePromptText} ${transcript}` : transcript;
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      showToast('Microphone access was blocked. Please allow mic permissions in your browser.');
    } else if (event.error !== 'no-speech') {
      showToast(`Voice error: ${event.error}`);
    }
    stopListening();
  };

  recognition.onend = () => {
    stopListening();
    if (promptInput.value.trim()) {
      showToast('Voice captured! Click "Extract with AI" to review.');
    }
  };

  function stopListening() {
    isListening = false;
    voiceTypingBtn.classList.remove('listening');
    voiceTypingBtn.innerHTML = '<span class="voice-icon">🎤</span> <span class="voice-label">Speak Invoice (Voice Typing)</span>';
    if (voiceStatus) {
      voiceStatus.classList.add('hidden');
    }
  }

  voiceTypingBtn.addEventListener('click', () => {
    if (isListening) {
      try {
        recognition.stop();
      } catch (e) {
        console.warn(e);
      }
      stopListening();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  });
}
