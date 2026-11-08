import dotenv from 'dotenv';
dotenv.config();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

let cachedToken = null;
let tokenExpiresAt = 0;

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

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PayPal OAuth failure (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
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
      return_url: `${APP_BASE_URL}/api/paypal/capture?invoiceId=${encodeURIComponent(invoiceId)}`,
      cancel_url: `${APP_BASE_URL}/api/paypal/cancel?invoiceId=${encodeURIComponent(invoiceId)}`,
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

  const orderData = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal Order Creation failed (${response.status}): ${JSON.stringify(orderData)}`);
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
  });

  const captureData = await response.json();

  if (!response.ok) {
    // If order was already captured (e.g. repeated callback or page reload), treat as completed
    const isAlreadyCaptured =
      captureData?.details?.some((d) => d.issue === 'ORDER_ALREADY_CAPTURED') ||
      captureData?.name === 'ORDER_ALREADY_CAPTURED';

    if (isAlreadyCaptured) {
      return { id: orderId, status: 'COMPLETED', alreadyCaptured: true };
    }

    throw new Error(`PayPal Capture failed (${response.status}): ${JSON.stringify(captureData)}`);
  }

  return captureData;
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to fetch PayPal order (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}
