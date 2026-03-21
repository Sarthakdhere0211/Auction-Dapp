import { describe, it, expect } from 'vitest';
import { orchestrateBid } from '../utils/bidOrchestrator';

describe('orchestrateBid', () => {
  it('calls bid and returns result', async () => {
    const deps = {
      bid: async () => ({ success: true, txHash: 'bid-hash' }),
    };
    const res = await orchestrateBid('GABC', 10, 120, deps);
    expect(res.success).toBe(true);
    expect(res.txHash).toBe('bid-hash');
  });

  it('returns error when bid fails', async () => {
    const deps = {
      bid: async () => ({ success: false, txHash: '', error: 'Bid too low' }),
    };
    const res = await orchestrateBid('GABC', 10, 120, deps);
    expect(res.success).toBe(false);
    expect(res.error).toBe('Bid too low');
  });
});
