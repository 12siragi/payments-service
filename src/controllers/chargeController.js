import { db } from '../db/db.js';
import { ProviderAlpha } from '../providers/providerAlpha.js';
import { ProviderBeta } from '../providers/providerBeta.js';

export const createCharge = async (req, res) => {
  const { amount, phoneNumber, currency, provider, requestId } = req.body;

  // 1️⃣ Idempotency: check if request exists
  const existing = await db.get(
    'SELECT * FROM charges WHERE requestId = ?',
    requestId
  );

  if (existing) return res.json(existing);

  // 2️⃣ Insert new charge as pending
  await db.run(
    `INSERT INTO charges (requestId, amount, phoneNumber, currency, provider, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    requestId,
    amount,
    phoneNumber,
    currency,
    provider,
    'pending'
  );

  const charge = await db.get(
    'SELECT * FROM charges WHERE requestId = ?',
    requestId
  );

  // 3️⃣ Initiate with ProviderAlpha if chosen
  if (provider === 'PROVIDER_ALPHA') {
    const providerInstance = new ProviderAlpha();
    providerInstance.initiateCharge(charge)
      .catch(err => console.error('ProviderAlpha error:', err));
  }

  if (provider === 'PROVIDER_ALPHA') {
  const providerInstance = new ProviderAlpha();
  providerInstance.initiateCharge(charge)
    .catch(err => console.error('Alpha error:', err));
}

  if (provider === 'PROVIDER_BETA') {
  const providerInstance = new ProviderBeta();
  providerInstance.initiateCharge(charge)
    .catch(err => console.error('Beta error:', err));
}

  return res.json(charge);
};

export const getChargeStatus = async (req, res) => {
  const { requestId } = req.params;

  const charge = await db.get(
    'SELECT * FROM charges WHERE requestId = ?',
    requestId
  );

  if (!charge) return res.status(404).json({ error: 'Charge not found' });

  return res.json({
    requestId: charge.requestId,
    status: charge.status,
    providerRef: charge.providerRef
  });
};