import { useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'
import type { UseAuthReturn } from '@/contexts/AuthContext'

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export type {
  UseAuthReturn,
  AuthState,
  ProfileWithTenant,
} from '@/contexts/AuthContext'
