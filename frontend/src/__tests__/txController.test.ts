import { describe, it, expect, vi } from 'vitest';
import { TxController } from '../utils/txController';
import { rpc } from '@stellar/stellar-sdk';

describe('TxController', () => {
  it('commits when server returns success', async () => {
    const server = {
      getTransaction: vi.fn().mockResolvedValue({ status: rpc.Api.GetTransactionStatus.SUCCESS })
    } as unknown as rpc.Server;
    const ctl = new TxController(server, { timeoutSecs: 30, pollIntervalMs: 10 });
    const res = await ctl.poll('hash-1');
    expect(res.state).toBe('committed');
  });

  it('fails when server returns failed', async () => {
    const server = {
      getTransaction: vi.fn().mockResolvedValue({ status: rpc.Api.GetTransactionStatus.FAILED, resultXdr: 'xdr' })
    } as unknown as rpc.Server;
    const ctl = new TxController(server, { timeoutSecs: 30, pollIntervalMs: 10 });
    const res = await ctl.poll('hash-2');
    expect(res.state).toBe('failed');
  });

  it('times out when server stays pending', async () => {
    const server = {
      getTransaction: vi.fn().mockResolvedValue({ status: 'PENDING' })
    } as unknown as rpc.Server;
    const ctl = new TxController(server, { timeoutSecs: 0.03, pollIntervalMs: 1 });
    const res = await ctl.poll('hash-3');
    expect(res.state).toBe('timeout');
  }, 2000);

  it('records rollback', () => {
    const server = {
      getTransaction: vi.fn()
    } as unknown as rpc.Server;
    const ctl = new TxController(server, { timeoutSecs: 30, pollIntervalMs: 10 });
    const res = ctl.rollback('hash-4', 'user-cancelled');
    expect(res.state).toBe('rolled_back');
    const logs = ctl.getLogs();
    expect(logs.find(l => l.txId === 'hash-4')?.state).toBe('rolled_back');
  });
});
