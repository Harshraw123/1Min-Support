'use client'

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { authToast } from '@/lib/toast';

export default function AuthToastHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const loginStatus = searchParams.get('login');
    const logoutStatus = searchParams.get('logout');
    const errorStatus = searchParams.get('error');

    // Show success toast for login
    if (loginStatus === 'success') {
      authToast.loginSuccess();
      // Clean URL params
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Show success toast for logout
    if (logoutStatus === 'success') {
      authToast.logoutSuccess();
      // Clean URL params
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Show error toast for auth errors
    if (errorStatus) {
      if (errorStatus === 'auth_failed') {
        authToast.loginFailed();
      } else {
        authToast.authError();
      }
      // Clean URL params
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [searchParams]);

  return null;
}
