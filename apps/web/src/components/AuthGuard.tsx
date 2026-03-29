import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { clearToken, loadToken } from '../lib/auth';
import { setToken, validateToken } from '../lib/api';

function AuthGuard() {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    'loading',
  );

  useEffect(() => {
    const storedToken = loadToken();

    if (!storedToken) {
      setToken(null);
      setStatus('unauthenticated');
      return;
    }

    let cancelled = false;
    setToken(storedToken);

    void (async () => {
      const isValid = await validateToken();

      if (cancelled) {
        return;
      }

      if (isValid) {
        setToken(storedToken);
        setStatus('authenticated');
        return;
      }

      clearToken();
      setToken(null);
      setStatus('unauthenticated');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return <div />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default AuthGuard;
