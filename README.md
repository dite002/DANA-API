# DANA API — Sandbox Example

Contoh minimal integrasi **DANA Payment Gateway Hosted Checkout** menggunakan Node.js + Express.

Contoh ini ditujukan untuk **DANA API resmi**, bukan API internal aplikasi DANA. DANA menyediakan sandbox di `https://api.sandbox.dana.id` untuk pengujian.

## Alur

```text
Client
  |
  | POST /api/orders
  v
Backend Express
  |
  | Create Order + signature
  v
DANA Sandbox
  |
  | webRedirectUrl
  v
Client membuka halaman checkout DANA
  |
  | pembayaran
  v
DANA -> POST /api/dana/notify
```

## Prasyarat

- Node.js 20+
- Akun/credential DANA Sandbox
- Partner ID, Merchant ID, private key dan credential lain sesuai onboarding DANA

## Instalasi

```bash
npm install
cp .env.example .env
npm run dev
```

Jangan commit `.env`. Private key dan credential harus disimpan sebagai environment variable/secret.

## Endpoint

### `GET /health`

Memeriksa apakah server hidup.

### `POST /api/orders`

Membuat contoh order. Body:

```json
{
  "amount": 10000,
  "externalUserId": "demo-user-001",
  "goodsName": "Demo Product"
}
```

Jika berhasil, response DANA akan berisi `webRedirectUrl` untuk checkout hosted.

### `POST /api/dana/notify`

Endpoint contoh untuk menerima notifikasi pembayaran dari DANA. Pada production, implementasikan validasi signature dan idempotency sesuai dokumentasi DANA sebelum mengubah status order.

## Catatan penting

Contoh ini menggunakan endpoint Create Order Payment Gateway. DANA mendokumentasikan request header seperti `X-TIMESTAMP`, `X-SIGNATURE`, `X-PARTNER-ID`, `X-EXTERNAL-ID`, dan `CHANNEL-ID`. Signature harus dibuat menggunakan mekanisme asymmetric signature DANA.

Referensi resmi:

- https://dashboard.dana.id/api-docs-v2/api
- https://dashboard.dana.id/api-docs-v2/api/payment-gateway/create-order-hosted
- https://dashboard.dana.id/api-docs-v2/guide/payment-gateway/hosted-checkout
