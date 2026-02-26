type RawEnv = {
  VITE_CONTRACT_ID?: string
  VITE_SOROBAN_RPC_URL?: string
  VITE_STELLAR_NETWORK?: string
  VITE_HORIZON_URL?: string
  VITE_NETWORK?: string
}

export type AppEnv = {
  CONTRACT_ID: string
  SOROBAN_RPC_URL: string
  STELLAR_NETWORK: 'TESTNET' | 'PUBLIC'
  HORIZON_URL: string
  TX_TIMEOUT_SECS: number
}

let cached: AppEnv | null = null

export function getEnv(): AppEnv {
  if (cached) return cached
  const raw = import.meta.env as unknown as RawEnv
  const CONTRACT_ID = (raw.VITE_CONTRACT_ID ?? '').trim()
  const SOROBAN_RPC_URL = (raw.VITE_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org').trim()
  const netInput = (raw.VITE_STELLAR_NETWORK ?? raw.VITE_NETWORK ?? 'TESTNET')
  const net = String(netInput).trim().toUpperCase()
  const STELLAR_NETWORK: 'TESTNET' | 'PUBLIC' = (net === 'PUBLIC' || net === 'PUBNET') ? 'PUBLIC' : 'TESTNET'
  const HORIZON_URL = (raw.VITE_HORIZON_URL ?? (STELLAR_NETWORK === 'PUBLIC'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org')).trim()
  const TX_TIMEOUT_SECS_RAW = (import.meta.env.VITE_TX_TIMEOUT_SECS ?? '120').toString()
  let TX_TIMEOUT_SECS = parseInt(TX_TIMEOUT_SECS_RAW, 10)
  if (!Number.isFinite(TX_TIMEOUT_SECS) || TX_TIMEOUT_SECS < 30 || TX_TIMEOUT_SECS > 300) TX_TIMEOUT_SECS = 120

  cached = { CONTRACT_ID, SOROBAN_RPC_URL, STELLAR_NETWORK, HORIZON_URL, TX_TIMEOUT_SECS }

  const masked = CONTRACT_ID ? `${CONTRACT_ID.slice(0, 6)}...${CONTRACT_ID.slice(-6)}` : '(empty)'
  console.info('[ENV] network=', STELLAR_NETWORK, 'horizon=', HORIZON_URL, 'contract=', masked, 'txTimeout=', TX_TIMEOUT_SECS)
  console.log('Contract ID:', import.meta.env.VITE_CONTRACT_ID)

  return cached
}

export function validateEnv(): string[] {
  const env = getEnv()
  const errors: string[] = []
  if (!env.CONTRACT_ID) errors.push('VITE_CONTRACT_ID is missing')
  if (!env.SOROBAN_RPC_URL) errors.push('VITE_SOROBAN_RPC_URL is missing')
  if (!env.HORIZON_URL) errors.push('VITE_HORIZON_URL is missing')
  return errors
}
