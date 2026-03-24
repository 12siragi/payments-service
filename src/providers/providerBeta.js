// providers/providerBeta.js
import fetch from 'node-fetch';
import { db } from '../db/db.js';

export class ProviderBeta {
  constructor() {
    this.baseURL = 'http://localhost:4002';
  }

  async initiateCharge(charge) {
    const res = await fetch(`${this.baseURL}/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: charge.requestId,
        amount: charge.amount,
        phoneNumber: charge.phoneNumber,
        currency: charge.currency,
      }),
    });

    const data = await res.json();

    await db.run(
      'UPDATE charges SET providerRef = ? WHERE requestId = ?',
      data.providerRef,
      charge.requestId
    );

    // Polling runs in background — initiateCharge returns immediately
    this._pollStatus(data.providerRef).catch(err =>
      console.error('[ProviderBeta] pollStatus error:', err)
    );
  }

  async _pollStatus(providerRef) {
    const MAX_ATTEMPTS = 5;
    let delay = 1000;

    for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
      await new Promise(r => setTimeout(r, delay));

      try {
        const res = await fetch(`${this.baseURL}/status/${providerRef}`);
        const data = await res.json();

        if (data.status === 'successful' || data.status === 'failed') {
          await db.run(
            'UPDATE charges SET status = ? WHERE providerRef = ?',
            data.status,
            providerRef
          );
          return;
        }
      } catch (err) {
        console.error(`[ProviderBeta] poll attempt ${attempts + 1} failed:`, err);
      }

      delay *= 2; // exponential backoff
    }

    // Exhausted all attempts — mark as failed
    await db.run(
      'UPDATE charges SET status = ? WHERE providerRef = ?',
      'failed',
      providerRef
    );
  }
}