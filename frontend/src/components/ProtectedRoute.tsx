import React from 'react'
import { Navigate } from 'react-router-dom'
import { useWalletStore } from '../store/useWalletStore'

interface Props {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const isConnected = useWalletStore(s => s.isConnected)
  if (!isConnected) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
