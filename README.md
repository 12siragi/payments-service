# Payments Service

A Node.js HTTP service for initiating and tracking mobile money (MoMo) charge requests through external payment providers.

---

## How to Run Locally

### Prerequisites

- Node.js v20+
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Start the provider stubs

Open two separate terminals:

```bash
# Terminal 1 — ProviderAlpha (webhook-based, port 4001)
WEBHOOK_URL=http://localhost:3001/webhooks/provider-alpha node stubs/provider-alpha.js

# Terminal 2 — ProviderBeta (polling-based, port 4002)
node stubs/provider-beta.js
```

### 3. Start the service

```bash
# Terminal 3
node src/server.js
```

Service runs on **http://localhost:3001**

---

## API Reference

### Initiate a charge

```
POST /charge
```

**Request body:**

| Field | Type | Description |
|---|---|---|
| `requestId` | string | Caller-supplied idempotency key |
| `amount` | number | Charge amount (must be positive) |
| `phoneNumber` | string | Target phone number |
| `currency` | string | 3-letter currency code e.g. `KES` |
| `provider` | string | `PROVIDER_ALPHA` or `PROVIDER_BETA` |

**Response:** `200 OK` — charge object with `status: "pending"`

**Example:**

```bash
curl -X POST http://localhost:3001/charge \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req-001",
    "amount": 100,
    "phoneNumber": "+254700000001",
    "currency": "KES",
    "provider": "PROVIDER_ALPHA"
  }'
```

---

### Check charge status

```
GET /charge/:requestId
```

**Response:**

```json
{
  "requestId": "req-001",
  "status": "successful",
  "providerRef": "eb6187b3-65e0-4975-95bc-4e54aa027ea4"
}
```

Status is one of: `pending` · `successful` · `failed`

---

### ProviderAlpha webhook (internal)

```
POST /webhooks/provider-alpha
```

Called automatically by ProviderAlpha stub. Updates charge status when the provider resolves.

---

## Key Design Decisions

### 1. Async fire-and-forget — sub-300ms responses

Provider API calls take 10–30 seconds. The HTTP handler inserts the charge as `pending`, fires the provider call without `await`, and returns immediately. The provider updates the DB in the background — via webhook (Alpha) or polling (Beta).

This guarantees the endpoint always responds in well under 300ms regardless of provider latency.

### 2. Idempotency via `requestId` unique constraint

The `charges` table has a `UNIQUE` constraint on `requestId`. On every incoming request, the handler checks for an existing row first. If found, it returns the existing charge immediately without touching the provider. This means submitting the same `requestId` twice will never result in two charges — even under concurrent requests, SQLite's constraint acts as the final guard.

### 3. SQLite for persistence

SQLite was chosen because it requires zero infrastructure setup (no separate DB process), ships as an npm package, and fully satisfies the durability requirement — all charge state survives process restarts. For a production system handling high concurrency or horizontal scaling, PostgreSQL would be the appropriate replacement, with no changes required to application logic beyond the DB driver.

### 4. Provider registry for extensibility

Providers are registered in a single `providerRegistry.js` map:

```js
export const providerRegistry = {
  PROVIDER_ALPHA: ProviderAlpha,
  PROVIDER_BETA:  ProviderBeta,
};
```

The HTTP layer and job processing logic never contain provider-specific branching. Adding a third provider requires only:
1. A new provider class file implementing `initiateCharge(charge)`
2. One line added to `providerRegistry.js`

No changes to the controller, router, or webhook handler.

### 5. ProviderBeta polling with exponential backoff

Since ProviderBeta has no webhook, the service polls its status endpoint after initiating a charge. Polling starts at 1 second and doubles on each attempt (1s → 2s → 4s → 8s → 16s) up to 5 attempts. If no terminal status is received, the charge is marked `failed`. All polling runs in the background — it never blocks the HTTP response.

---

## Project Structure

```
payments-service/
├── src/
│   ├── server.js                  # Express app, routes, webhook handler
│   ├── controllers/
│   │   └── chargeController.js    # createCharge, getChargeStatus
│   ├── providers/
│   │   ├── providerRegistry.js    # Provider lookup map
│   │   ├── providerAlpha.js       # Webhook-based provider
│   │   └── providerBeta.js        # Polling-based provider
│   └── db/
│       └── db.js                  # SQLite connection + schema init
├── stubs/
│   ├── provider-alpha.js          # Mock ProviderAlpha server (port 4001)
│   └── provider-beta.js           # Mock ProviderBeta server (port 4002)
├── tests/
│   └── chargeController.test.js   # Idempotency + integration tests
└── README.md
```

---

## Running Tests

No extra dependencies needed — uses Node's built-in test runner:

```bash
node --test tests/chargeController.test.js
```

The test suite covers:

- **Idempotency** — same `requestId` twice returns identical response, one DB row, provider called once
- **Input validation** — missing fields, negative/zero/string amount
- **Provider routing** — Alpha and Beta create pending charges; unknown provider returns 400 with no DB write
- **Sub-300ms response** — slow provider injected; asserts HTTP response returns before provider resolves
- **Status endpoint** — happy path and 404
- **Webhook handler** — status update and unknown providerRef
- **Error resilience** — broken DB returns 500; throwing provider doesn't crash the request

---

## What I Would Change With More Time

**Job queue for background work** — the fire-and-forget pattern works but if the process crashes mid-flight the provider call is lost. A durable job queue (e.g. BullMQ + Redis, or a `jobs` table in SQLite) would survive restarts and support retries with backoff.

**Webhook signature verification** — the ProviderAlpha webhook endpoint currently accepts any request. In production it should verify a shared secret or HMAC signature on each callback.

**Structured logging** — replace `console.error` with a structured logger (e.g. `pino`) to get consistent JSON log lines with timestamps, requestId correlation, and log levels.

**PostgreSQL for production** — SQLite is great for a single-process service but doesn't support concurrent writes well. A move to PostgreSQL would support horizontal scaling and is a drop-in swap at the driver level.

**Request timeout on provider calls** — outbound `fetch` calls to providers have no timeout. A hung provider would leave the background task open indefinitely. Adding `AbortController` with a timeout would bound this.

**Rate limiting and auth** — the API currently has no authentication or rate limiting. For a real payments endpoint both are essential.