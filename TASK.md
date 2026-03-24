# Take-Home: Payments Service

## Background

You're building a backend payments service. The service accepts MoMo (mobile money)
charge requests and processes them through external payment providers. Different
requests are routed to different providers.

**Key constraints your design must satisfy:**

1. **Response time:** The HTTP endpoint that initiates a charge must respond in under
   300ms. Provider API calls can take 10–30 seconds.

2. **Idempotency:** The same charge request submitted twice must never result in two
   charges being executed.

3. **Durability:** In-memory-only state is not acceptable. A process restart must not
   cause data loss or duplicate charges.

4. **Extensibility:** The system must support at least 2 providers today. Adding a
   third provider in future should require no changes to the HTTP layer or job
   processing logic — only a new provider implementation and a registration step.

## What to Build

A Node.js HTTP service for initiating and tracking MoMo charge requests.

### Initiate a charge

Expose an endpoint to initiate a charge. The API shape is your design decision.
Required inputs:

| Field | Description |
|---|---|
| `amount` | Charge amount (numeric) |
| `phoneNumber` | Target phone number |
| `currency` | 3-letter currency code |
| `provider` | Which provider to route to (`"PROVIDER_ALPHA"` or `"PROVIDER_BETA"`) |
| `requestId` | Caller-supplied idempotency key |

### Check charge status

Expose an endpoint to check charge status. Must return one of:
`pending`, `successful`, `failed`.

### Two providers with different behaviors

Pre-built stub servers are in the `/stubs` directory. Run them alongside your service:

- **ProviderAlpha** (`node stubs/provider-alpha.js`, port 4001) — After you initiate
  a charge, ProviderAlpha calls back to your service via webhook with the final result.
  Point it at your service by setting `WEBHOOK_URL=http://localhost:3000/<your-path>`
  when starting the stub. Your service must handle this callback and update the charge
  status.

- **ProviderBeta** (`node stubs/provider-beta.js`, port 4002) — Has no webhook. After
  initiating, you must poll ProviderBeta to get the final status. Polling must use
  exponential backoff and eventually time out — do not poll indefinitely.

See `stubs/README.md` for full API contracts.

## Constraints

- **Language:** Node.js v20+, ESM only (`import`/`export` — no `require`)
- **State:** Must survive a process restart without data loss. Use any persistence
  layer you like — justify your choice in the README.
- **No auth required**

## Deliverables

1. **Working code** in this repo (add your source alongside the existing `/stubs`)
2. **README** covering:
   - How to run locally
   - Your key design decisions and why (async mechanism, persistence choice,
     idempotency approach)
   - What you would change with more time
3. **At least one test** specifically covering idempotency — demonstrate that
   submitting the same `requestId` twice does not result in two charges

## Time Expectation

We expect a strong submission to take around 3–4 hours. There is no hard deadline —
take the time you need — but how long it takes is a data point we consider.
