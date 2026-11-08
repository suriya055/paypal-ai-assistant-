import dotenv from 'dotenv';
dotenv.config();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const rawApiBase = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
const PAYPAL_API_BASE = rawApiBase.trim().replace(/\/+$/, '');

/**
 * Returns the configured base URL for the application (e.g., https://my-app.onrender.com or http://localhost:3000).
 * Checks BASE_URL first, then legacy APP_BASE_URL, defaulting to http://localhost:3000.
 * Strips trailing slashes to prevent malformed URL redirects.
 */
export function getBaseUrl() {
  const raw = process.env.BASE_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
  return raw.trim().replace(/\/+$/, '');
}

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Safely parses response body as JSON. Returns parsed object, or fallback object if empty/non-JSON.
 * Never throws "Unexpected end of JSON input".
 */
async function parseResponseBody(response) {
  try {
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return {};
    }
    return JSON.parse(text);
  } catch (err) {
    return { _rawText: err.message };
  }
}

/**
 * Retrieves an OAuth2 Access Token from PayPal Sandbox using client credentials.
 * Automatically caches the token until shortly before expiration.
 */
export async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('Missing PayPal credentials. Please configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.');
  }

  // Return cached token if valid (with 60-second buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const basicAuth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(`PayPal OAuth failure (${response.status}): ${data.error_description || data.error || JSON.stringify(data)}`);
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  return cachedToken;
}

/**
 * Creates a PayPal Order using the Orders v2 REST API in Sandbox.
 * Generates an approval link where the client or buyer can review and pay.
 */
export async function createOrder({ invoiceId, amount, currency = 'USD', description = 'Invoice payment' }) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const formattedAmount = Number(amount).toFixed(2);
  const cleanDescription = (description || 'Invoice Payment').substring(0, 127);

  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: invoiceId,
        description: cleanDescription,
        amount: {
          currency_code: currency,
          value: formattedAmount,
        },
      },
    ],
    application_context: {
      brand_name: 'AI Invoice Assistant (Sandbox)',
      landing_page: 'BILLING',
      user_action: 'PAY_NOW',
      return_url: `${baseUrl}/api/paypal/capture?invoiceId=${encodeURIComponent(invoiceId)}`,
      cancel_url: `${baseUrl}/api/paypal/cancel?invoiceId=${encodeURIComponent(invoiceId)}`,
    },
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(orderPayload),
  });

  const orderData = await parseResponseBody(response);

  if (!response.ok) {
    const detail = orderData.details?.[0]?.description || orderData.message || JSON.stringify(orderData);
    throw new Error(`PayPal Order Creation failed (${response.status}): ${detail}`);
  }

  const approveLink = orderData.links?.find((link) => link.rel === 'approve');

  if (!approveLink || !approveLink.href) {
    throw new Error('PayPal did not return an approval link for this order.');
  }

  return {
    orderId: orderData.id,
    approvalUrl: approveLink.href,
    status: orderData.status,
  };
}

/**
 * Captures payment for an approved PayPal Order.
 * Called automatically when PayPal redirects the buyer back to return_url.
 */
export async function captureOrder(orderId) {
  const token = await getAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({}), // Explicit empty JSON body ensures valid HTTP POST payload across all proxies
  });

  const captureData = await parseResponseBody(response);

  // If capture responded with 200/201 or 204 No Content, treat as completed
  if (response.ok || response.status === 204) {
    return {
      id: captureData.id || orderId,
      status: captureData.status || 'COMPLETED',
      ...captureData,
    };
  }

  // Check if order was already captured (e.g. repeated callback or page reload)
  const isAlreadyCaptured =
    captureData?.details?.some((d) => d.issue === 'ORDER_ALREADY_CAPTURED') ||
    captureData?.name === 'ORDER_ALREADY_CAPTURED';

  if (isAlreadyCaptured) {
    return { id: orderId, status: 'COMPLETED', alreadyCaptured: true };
  }

  // Fallback verification: Check actual order details from PayPal before giving up
  try {
    const details = await getOrderDetails(orderId);
    if (details.status === 'COMPLETED' || details.status === 'APPROVED') {
      return { id: orderId, status: details.status, ...details };
    }
  } catch (checkErr) {
    console.warn(`[PayPal] Order verification check warning:`, checkErr.message);
  }

  const errorDetail =
    captureData?.details?.[0]?.description ||
    captureData?.message ||
    captureData?.name ||
    `HTTP ${response.status}`;

  throw new Error(`PayPal capture: ${errorDetail}`);
}

/**
 * Fetches order details to verify current status.
 */
export async function getOrderDetails(orderId) {
  const token = await getAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const detail = data?.details?.[0]?.description || data?.message || JSON.stringify(data);
    throw new Error(`Failed to fetch PayPal order (${response.status}): ${detail}`);
  }

  return data;
}
