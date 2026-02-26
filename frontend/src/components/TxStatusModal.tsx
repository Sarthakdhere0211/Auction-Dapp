import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { getTxUrl } from '../config/stellar'

interface Props {
  open: boolean
  status: 'pending' | 'success' | 'failed'
  txHash?: string | null
  onOpenChange: (v: boolean) => void
}

export default function TxStatusModal({ open, status, txHash, onOpenChange }: Props) {
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
        <div className="flex items-center gap-3 py-3">
          <Icon className={`${color} ${status === 'pending' ? 'animate-spin' : ''}`} />
          <p className="text-sm text-gray-300">
            {status === 'pending' && 'Submitting to Soroban RPC…'}
            {status === 'success' && 'Included in ledger.'}
            {status === 'failed' && 'The transaction failed.'}
          </p>
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
