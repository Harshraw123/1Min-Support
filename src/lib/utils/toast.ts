'use client'

import { toast } from 'sonner'

export const showToast = {
  // App-wide generic toast helpers Sonner calls ko centralize karte hain.
  success: (message: string) => {
    toast.success(message)
  },
  error: (message: string) => {
    toast.error(message)
  },
  info: (message: string) => {
    toast.info(message)
  },
  warning: (message: string) => {
    toast.warning(message)
  },
  loading: (message: string) => {
    toast.loading(message)
  }
}

export const authToast = {
  // Auth flow ke common success/error messages yahan se reuse hote hain.
  loginSuccess: () => {
    toast.success('Successfully logged in! Welcome back.')
  },
  logoutSuccess: () => {
    toast.success('Logged out successfully')
  },
  loginFailed: () => {
    toast.error('Login failed. Please try again.')
  },
  authError: (message?: string) => {
    toast.error(message || 'Authentication error. Please try again.')
  }
}
