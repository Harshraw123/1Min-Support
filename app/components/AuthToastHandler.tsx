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

    const clearAuthParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("login");
      url.searchParams.delete("logout");
      url.searchParams.delete("error");
      url.searchParams.delete("description");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    };

    // Show success toast for login
    if (loginStatus === 'success') {
      authToast.loginSuccess();
      clearAuthParams();
    }

    // Show success toast for logout
    if (logoutStatus === 'success') {
      authToast.logoutSuccess();
      clearAuthParams();
    }

    // Show error toast for auth errors
    if (errorStatus) {
      if (errorStatus === 'auth_failed') {
        authToast.loginFailed();
      } else {
        authToast.authError();
      }
      clearAuthParams();
    }
  }, [searchParams]);

  return null;
}
