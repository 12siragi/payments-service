// providers/providerRegistry.js
import { ProviderAlpha } from './providerAlpha.js';
import { ProviderBeta } from './providerBeta.js';

export const providerRegistry = {
  PROVIDER_ALPHA: ProviderAlpha,
  PROVIDER_BETA: ProviderBeta,
};