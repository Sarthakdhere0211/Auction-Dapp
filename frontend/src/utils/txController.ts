import { rpc } from '@stellar/stellar-sdk';
import { getEnv } from '../env';
import { getTxUrl } from '../config/stellar';

export type TxState = 'pending' | 'committed' | 'failed' | 'rolled_back' | 'timeout';

export interface TxAuditLogEntry {
  txId: string;
  state: TxState;
  timestamp: number;
  message?: string;
}

export interface TxControllerOptions {
  timeoutSecs?: number; // 30–300
  pollIntervalMs?: number; // default 2000
  onPoll?: (attempt: number, state: TxState) => void;
}

export class TxController {
  private server: rpc.Server;
  private logs: TxAuditLogEntry[] = [];
  private options: Required<TxControllerOptions>;

  constructor(server: rpc.Server, options?: TxControllerOptions) {
    const env = getEnv();
    const timeout = options?.timeoutSecs ?? env.TX_TIMEOUT_SECS;
    const bounded =
      options?.timeoutSecs != null
        ? Math.max(0.001, timeout) // allow tiny timeouts for tests
        : Math.max(30, Math.min(300, timeout)); // env-bound production range
    this.server = server;
    this.options = {
      timeoutSecs: bounded,
      pollIntervalMs: Math.max(1, options?.pollIntervalMs ?? 2000),
      onPoll: options?.onPoll ?? (() => {}),
    };
  }

  async poll(txHash: string): Promise<TxAuditLogEntry> {
    const maxAttempts = Math.ceil((this.options.timeoutSecs * 1000) / this.options.pollIntervalMs);
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, this.options.pollIntervalMs));
      const res = await this.server.getTransaction(txHash);
      const status = res.status;
      if (status === rpc.Api.GetTransactionStatus.SUCCESS) {
        const entry = { txId: txHash, state: 'committed' as TxState, timestamp: Date.now(), message: getTxUrl(txHash) };
        this.logs.push(entry);
        this.options.onPoll(i + 1, 'committed');
        return entry;
      }
      if (status === rpc.Api.GetTransactionStatus.FAILED) {
        const failedMsg: string = (() => {
          const r = res as unknown as { resultXdr?: unknown };
          return typeof r.resultXdr === 'string' ? r.resultXdr : 'FAILED';
        })();
        const entry = { txId: txHash, state: 'failed' as TxState, timestamp: Date.now(), message: failedMsg };
        this.logs.push(entry);
        this.options.onPoll(i + 1, 'failed');
        return entry;
      }
      this.options.onPoll(i + 1, 'pending');
    }
    const entry = { txId: txHash, state: 'timeout' as TxState, timestamp: Date.now(), message: getTxUrl(txHash) };
    this.logs.push(entry);
    return entry;
  }

  // Rollback is client-side only: clears UI state and marks audit
  rollback(txHash: string, reason?: string): TxAuditLogEntry {
    const entry = { txId: txHash, state: 'rolled_back' as TxState, timestamp: Date.now(), message: reason };
    this.logs.push(entry);
    return entry;
  }

  getLogs(): TxAuditLogEntry[] {
    return [...this.logs];
  }
}
