// providers/providerAlpha.js
import fetch from 'node-fetch';
import { db } from '../db/db.js';

export class ProviderAlpha {
  constructor() {
    this.baseURL = 'http://localhost:4001';
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
    // Final status arrives via webhook — no further action needed here
  }
}