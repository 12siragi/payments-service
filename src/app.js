import express from 'express';
import './db/db.js'; // initialize DB
import { db } from './db/db.js'; // ✅ needed for webhook
import { createCharge, getChargeStatus } from './controllers/chargeController.js';

const app = express();
app.use(express.json());

// test route
app.get('/', (req, res) => {
  res.send('Server running 🚀');
});

app.post('/webhooks/provider-alpha', async (req, res) => {
  const { providerRef, status } = req.body;

  const charge = await db.get(
    'SELECT * FROM charges WHERE providerRef = ?',
    providerRef
  );

  if (!charge) return res.status(404).send('Not found');

  await db.run(
    'UPDATE charges SET status = ? WHERE providerRef = ?',
    status,
    providerRef
  );

  res.send('OK');
});

// ✅ THIS IS WHAT YOU ARE MISSING
app.post('/charge', createCharge);
app.get('/charge/:requestId', getChargeStatus);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});