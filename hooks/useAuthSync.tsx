'use client'

import { useEffect, useState } from 'react'
import type { SessionUser } from '@/lib/getSession'

export function useAuthSync(serverUser: SessionUser | null) {
  const [user, setUser] = useState<SessionUser | null>(serverUser)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    // If server says no user, check client-side cookies
    if (!serverUser) {
      setIsLoading(true)
      
      // Simple client-side cookie check
      const hasToken = document.cookie.includes('access_token')
      
      if (hasToken) {
        // Try to get user info from client side
        fetch('/api/auth/me')
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setUser(data.user)
            }
          })
          .catch(() => {
            // Keep server state if client check fails
          })
          .finally(() => {
            setIsLoading(false)
          })
      } else {
        setIsLoading(false)
      }
    }
  }, [serverUser])

  return { user, isLoading, setUser }
}
