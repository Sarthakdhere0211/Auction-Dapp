import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { getTxUrl } from '../config/stellar'

interface Props {
  open: boolean
  status: 'pending' | 'success' | 'failed'
  txHash?: string | null
  error?: string | null
  onOpenChange: (v: boolean) => void
}

export default function TxStatusModal({ open, status, txHash, error, onOpenChange }: Props) {
  const color =
    status === 'success' ? 'text-emerald-500' : status === 'failed' ? 'text-red-500' : 'text-blue-500'
  const Icon = status === 'success' ? CheckCircle : status === 'failed' ? XCircle : Loader2
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transaction {status === 'pending' ? 'Pending' : status === 'success' ? 'Confirmed' : 'Failed'}</DialogTitle>
          <DialogDescription>Execution status from Stellar Testnet</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-3">
          <div className="flex items-center gap-3">
            <Icon className={`${color} ${status === 'pending' ? 'animate-spin' : ''}`} />
            <p className="text-sm text-gray-300 flex-1">
              {status === 'pending' && 'Please confirm in your wallet, then submitting to Soroban RPC…'}
              {status === 'success' && 'Included in ledger.'}
              {status === 'failed' && (error || 'The transaction failed.')}
            </p>
          </div>
          {status === 'failed' && error && error.length > 80 && (
            <p className="text-xs text-red-400/90 bg-red-500/5 border border-red-500/20 rounded-lg p-3 font-mono break-words">
              {error}
            </p>
          )}
        </div>
        {txHash && (
          <a
            href={getTxUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 border border-white/10 text-[12px] hover:bg-gray-800"
          >
            View on Stellar Expert
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </DialogContent>
    </Dialog>
  )
}
