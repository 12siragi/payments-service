import express from 'express';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4002;

// Map of providerRef -> { phoneNumber, callCount }
const charges = new Map();

app.post('/charge', (req, res) => {
  const { requestId, amount, phoneNumber, currency } = req.body;
  console.log(`[ProviderBeta] POST /charge`, { requestId, amount, phoneNumber, currency });

  const providerRef = randomUUID();
  charges.set(providerRef, { phoneNumber, callCount: 0 });

  res.json({ providerRef, status: 'pending' });
});

app.get('/status/:providerRef', (req, res) => {
  const { providerRef } = req.params;
  console.log(`[ProviderBeta] GET /status/${providerRef}`);

  const charge = charges.get(providerRef);
  if (!charge) {
    return res.status(404).json({ error: 'providerRef not found' });
  }

  charge.callCount += 1;

  if (charge.phoneNumber === '+00000000000') {
    return res.json({ providerRef, status: 'failed' });
  }

  const status = charge.callCount <= 2 ? 'pending' : 'successful';
  res.json({ providerRef, status });
});

app.listen(PORT, () => {
  console.log(`[ProviderBeta] Listening on port ${PORT}`);
});
