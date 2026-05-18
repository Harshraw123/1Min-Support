'use client'

import { toast } from 'sonner'

// General toast functions you can use anywhere
export const showToast = {
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

// Specific auth toasts
export const authToast = {
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
