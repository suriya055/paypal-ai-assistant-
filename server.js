import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import aiRoutes from './routes/ai.routes.js';
import paypalRoutes from './routes/paypal.routes.js';
import invoiceRoutes from './routes/invoices.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security check for environment variables
const missingKeys = [];
if (!process.env.PAYPAL_CLIENT_ID) missingKeys.push('PAYPAL_CLIENT_ID');
if (!process.env.PAYPAL_CLIENT_SECRET) missingKeys.push('PAYPAL_CLIENT_SECRET');
if (!process.env.GEMINI_API_KEY) missingKeys.push('GEMINI_API_KEY');

if (missingKeys.length > 0) {
  console.warn(`\n⚠️  WARNING: Missing environment variables: ${missingKeys.join(', ')}`);
  console.warn('   Please check your .env file before running requests.\n');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SANDBOX',
    timestamp: new Date().toISOString(),
    aiReady: !!process.env.GEMINI_API_KEY,
    paypalReady: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
  });
});

// Fallback to index.html for SPA behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  console.log(`\n=================================================`);
  console.log(`🚀 AI Invoice Assistant running in SANDBOX mode`);
  console.log(`📍 Web UI: http://localhost:${PORT}`);
  console.log(`🤖 AI: Google Gemini Flash (${modelName})`);
  console.log(`💳 Payments: PayPal Orders v2 (Sandbox)`);
  console.log(`=================================================\n`);
});
