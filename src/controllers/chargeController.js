import { db } from '../db/db.js';
import { providerRegistry } from '../providers/providerRegistry.js';

const REQUIRED_FIELDS = ['requestId', 'amount', 'phoneNumber', 'currency', 'provider'];

// ----------------------------
// CREATE CHARGE
// ----------------------------
export const createCharge = async (req, res) => {
  try {
    const { amount, phoneNumber, currency, provider, requestId } = req.body;

    // 1️⃣ Input validation
    const missing = REQUIRED_FIELDS.filter(f => req.body[f] == null);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    // 2️⃣ Validate provider before touching the DB
    const ProviderClass = providerRegistry[provider];
    if (!ProviderClass) {
      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    // 3️⃣ Idempotency check
    const existing = await db.get(
      'SELECT * FROM charges WHERE requestId = ?',
      requestId
    );
    if (existing) return res.json(existing);

    // 4️⃣ Insert new charge as pending (durability)
    await db.run(
      `INSERT INTO charges (requestId, amount, phoneNumber, currency, provider, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      requestId, amount, phoneNumber, currency, provider, 'pending'
    );

    const charge = await db.get(
      'SELECT * FROM charges WHERE requestId = ?',
      requestId
    );

    // 5️⃣ Fire-and-forget: respond in <300ms, provider runs in background
    const instance = new ProviderClass();
    instance.initiateCharge(charge)
      .catch(err => console.error(`[${provider}] initiateCharge error:`, err));

    // 6️⃣ Return immediately with pending status
    return res.json(charge);

  } catch (err) {
    console.error('createCharge error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ----------------------------
// GET CHARGE STATUS
// ----------------------------
export const getChargeStatus = async (req, res) => {
  try {
    const { requestId } = req.params;

    const charge = await db.get(
      'SELECT * FROM charges WHERE requestId = ?',
      requestId
    );

    if (!charge) return res.status(404).json({ error: 'Charge not found' });

    return res.json({
      requestId: charge.requestId,
      status: charge.status,
      providerRef: charge.providerRef,
    });

  } catch (err) {
    console.error('getChargeStatus error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};