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
        currency: charge.currency
      })
    });

    const data = await res.json();

    // Save providerRef
    await db.run(
      'UPDATE charges SET providerRef = ? WHERE requestId = ?',
      data.providerRef,
      charge.requestId
    );

    // Start polling
    this.pollStatus(data.providerRef);
  }

  async pollStatus(providerRef) {
    let attempts = 0;
    let delay = 1000; // start with 1 second
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, delay));

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

      // exponential backoff
      delay *= 2;
      attempts++;
    }

    // timeout fallback
    await db.run(
      'UPDATE charges SET status = ? WHERE providerRef = ?',
      'failed',
      providerRef
    );
  }
}