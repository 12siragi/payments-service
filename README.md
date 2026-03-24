Payments Service – Take-Home
Overview

This is a mini backend payments service for processing mobile money (MoMo) charges via two providers: PROVIDER_ALPHA (webhook-style) and PROVIDER_BETA (polling-style).

Key features:

Fast response: /charge endpoint responds immediately (<300ms) using async processing.
Idempotency: Same requestId will never create duplicate charges.
Durable storage: Charges are persisted in SQLite; survives process restarts.
Extensible: Adding a new provider requires only a new provider class and registration.

Tech Stack

Node.js v20+ (ESM modules)
Express – HTTP server
SQLite – Persistent storage for charges
node-fetch – HTTP requests to providers
npm – package management

Getting Started

1. Clone and install dependencies
git clone git@github.com:12siragi/payments-service.git
cd payments-service
npm install
2. Run stub servers (mock providers)

Open two separate terminals:

ProviderAlpha (webhook)

cd stubs
WEBHOOK_URL=http://localhost:3001/webhooks/provider-alpha node provider-alpha.js

ProviderBeta (polling)

cd stubs
node provider-beta.js
3. Run the backend
cd ../src
node app.js

Server runs on http://localhost:3001

4. API Endpoints

Create charge

POST /charge
Content-Type: application/json

{
  "amount": 100,
  "phoneNumber": "+254700000000",
  "currency": "KES",
  "provider": "PROVIDER_ALPHA",
  "requestId": "unique-id-123"
}

Get charge status

GET /charge/:requestId

Webhook endpoint (for ProviderAlpha)

POST /webhooks/provider-alpha
{
  "providerRef": "...",
  "status": "successful" | "failed"
}
5. Design Decisions
Persistence: SQLite chosen for simplicity, durability, and fast local development.
Async processing: Provider requests are initiated asynchronously; /charge responds immediately.
Idempotency: requestId is unique; existing charge is returned if submitted twice.
Provider extensibility: Each provider has a dedicated class. Adding a new provider requires only a new class and registration.
6. Idempotency Test
# First submission
curl -X POST http://localhost:3001/charge -H "Content-Type: application/json" \
-d '{"amount":100,"phoneNumber":"+254700000000","currency":"KES","provider":"PROVIDER_BETA","requestId":"beta-test"}'

# Resubmission (same requestId)
curl -X POST http://localhost:3001/charge -H "Content-Type: application/json" \
-d '{"amount":100,"phoneNumber":"+254700000000","currency":"KES","provider":"PROVIDER_BETA","requestId":"beta-test"}'

# Result: same charge object returned, no duplicate charge created
7. Future Improvements
Add automatic exponential backoff retry for ProviderBeta in case of network failures.
Add unit and integration tests for all providers.
Replace SQLite with PostgreSQL or another production-grade DB.
Add logging and monitoring for webhook and polling events.