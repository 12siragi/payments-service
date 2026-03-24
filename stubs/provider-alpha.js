import express from 'express';
import axios from 'axios';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4001;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/webhooks/provider-alpha';

app.post('/charge', (req, res) => {
  const { requestId, amount, phoneNumber, currency } = req.body;
  console.log(`[ProviderAlpha] POST /charge`, { requestId, amount, phoneNumber, currency });

  const providerRef = randomUUID();
  const status = 'pending';

  res.json({ providerRef, status });

  const callbackStatus = phoneNumber === '+00000000000' ? 'failed' : 'successful';
  const delay = 2000 + Math.random() * 1000;

  setTimeout(async () => {
    console.log(`[ProviderAlpha] Sending webhook to ${WEBHOOK_URL}`, { providerRef, status: callbackStatus });
    try {
      await axios.post(WEBHOOK_URL, { providerRef, status: callbackStatus });
      console.log(`[ProviderAlpha] Webhook delivered`, { providerRef });
    } catch (err) {
      console.error(`[ProviderAlpha] Webhook delivery failed`, { providerRef, error: err.message });
    }
  }, delay);
});

app.listen(PORT, () => {
  console.log(`[ProviderAlpha] Listening on port ${PORT}`);
  console.log(`[ProviderAlpha] Webhook URL: ${WEBHOOK_URL}`);
});
