import { describe, it, expect } from 'vitest';
import { orchestrateBid } from '../utils/bidOrchestrator';

describe('orchestrateBid', () => {
  it('initializes then bids successfully', async () => {
    const deps = {
      isInitialized: async () => false,
      getStatus: async () => 1,
      initialize: async () => ({ success: true, txHash: 'init-hash' }),
      bid: async () => ({ success: true, txHash: 'bid-hash' }),
    };
    const res = await orchestrateBid('GABC', 10, 120, deps);
    expect(res.success).toBe(true);
    expect(res.txHash).toBe('bid-hash');
  });

  it('returns error if init fails', async () => {
    const deps = {
      isInitialized: async () => false,
      getStatus: async () => 1,
      initialize: async () => ({ success: false, txHash: '', error: 'init error' }),
      bid: async () => ({ success: true, txHash: 'bid-hash' }),
    };
    const res = await orchestrateBid('GABC', 10, 120, deps);
    expect(res.success).toBe(false);
    expect(res.error).toContain('init error');
  });

  it('returns error if not live', async () => {
    const deps = {
      isInitialized: async () => true,
      getStatus: async () => 2,
      initialize: async () => ({ success: true, txHash: 'init-hash' }),
      bid: async () => ({ success: true, txHash: 'bid-hash' }),
    };
    const res = await orchestrateBid('GABC', 10, 120, deps);
    expect(res.success).toBe(false);
    expect(res.error).toContain('not live');
  });
});
