import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import { Dana } from 'dana-node';

const app = express();
const port = Number(process.env.PORT || 3000);

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

// DANA requires Jakarta time with an explicit +07:00 offset.
function jakartaTime(minutesFromNow = 0) {
  const date = new Date(Date.now() + minutesFromNow * 60_000);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((o, p) => ({ ...o, [p.type]: p.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
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

    const request = {
      partnerReferenceNo,
      merchantId: required('DANA_MERCHANT_ID'),
      amount: {
        value: amount.toFixed(2),
        currency: 'IDR',
      },
      validUpTo: jakartaTime(10),
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
        mcc: process.env.DANA_MCC || '5814',
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
  // TODO for production: verify X-SIGNATURE using DANA's WebhookParser and
  // only then update the order status. Never trust an unverified webhook.
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
