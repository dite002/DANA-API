import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import { Dana } from 'dana-node';

const app = express();
const port = Number(process.env.PORT || 3000);

// Keep the raw body available for webhook verification/processing.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function danaClient() {
  return new Dana({
    partnerId: required('X_PARTNER_ID'),
    privateKeyPath: process.env.PRIVATE_KEY_PATH,
    privateKey: process.env.PRIVATE_KEY,
    origin: required('ORIGIN'),
    env: process.env.DANA_ENV || 'sandbox',
    debugMode: process.env.X_DEBUG || 'false',
  });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, environment: process.env.DANA_ENV || 'sandbox' });
});

app.post('/api/orders', async (req, res) => {
  try {
    const amount = Number(req.body.amount || 10000);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const partnerReferenceNo = `DEMO${Date.now()}${crypto.randomInt(100, 999)}`;
    const now = new Date();
    const validUpTo = new Date(now.getTime() + 10 * 60 * 1000).toISOString().replace('Z', '+07:00');

    const request = {
      partnerReferenceNo,
      merchantId: required('DANA_MERCHANT_ID'),
      amount: {
        value: amount.toFixed(2),
        currency: 'IDR',
      },
      validUpTo,
      urlParams: [
        {
          url: required('NOTIFY_URL'),
          type: 'NOTIFICATION',
          isDeeplink: 'N',
        },
        {
          url: required('PAY_RETURN_URL'),
          type: 'PAY_RETURN',
          isDeeplink: 'N',
        },
      ],
      additionalInfo: {
        order: {
          orderTitle: req.body.goodsName || 'DANA API Demo Order',
          scenario: 'REDIRECT',
          buyer: {
            externalUserId: String(req.body.externalUserId || 'demo-user'),
          },
        },
        envInfo: {
          sourcePlatform: 'IPG',
          terminalType: 'SYSTEM',
        },
      },
    };

    const { paymentGatewayApi } = danaClient();
    const response = await paymentGatewayApi.createOrder(request);

    res.json({ partnerReferenceNo, dana: response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.message || String(error) });
  }
});

app.post('/api/dana/notify', async (req, res) => {
  // IMPORTANT: In production, verify the DANA webhook signature before
  // changing an order's payment status. The official dana-node SDK provides
  // WebhookParser for this purpose.
  console.log('DANA notification:', req.body);
  res.status(200).json({ received: true });
});

app.get('/payment/return', (req, res) => {
  res.type('html').send(`<!doctype html><html><body><h1>Payment return</h1><pre>${escapeHtml(JSON.stringify(req.query, null, 2))}</pre></body></html>`);
});

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

app.listen(port, () => {
  console.log(`DANA API example listening on http://localhost:${port}`);
});
