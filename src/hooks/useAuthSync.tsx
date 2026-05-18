'use client'

import { useState } from 'react'
import type { SessionUser } from '@/lib/auth/getSession'

export function useAuthSync(serverUser: SessionUser | null) {
  const [user, setUser] = useState<SessionUser | null>(serverUser)
  const isLoading = false
  return { user, isLoading, setUser }
}
