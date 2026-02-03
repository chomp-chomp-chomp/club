import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function MagicLink() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  // Detect if running as installed PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('Invalid link');
      return;
    }

    const verify = async () => {
      try {
        await api('/api/auth/magic-verify', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        await refresh();
        setStatus('success');

        // Only auto-redirect if running in PWA
        if (isStandalone) {
          setTimeout(() => navigate('/'), 1500);
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Invalid or expired link');
      }
    };

    verify();
  }, [searchParams, refresh, navigate, isStandalone]);

  return (
    <main className="onboarding-container">
      <div className="onboarding-step">
        {status === 'verifying' && (
          <>
            <h1 className="onboarding-title">Signing you in...</h1>
            <div className="loading">Please wait</div>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="onboarding-title">Welcome back!</h1>
            {isStandalone ? (
              <p className="onboarding-subtitle">Redirecting you to Club Chomp...</p>
            ) : (
              <>
                <p className="onboarding-subtitle" style={{ marginBottom: '16px' }}>
                  You're now logged in.
                </p>
                <p className="onboarding-subtitle" style={{ marginBottom: '24px' }}>
                  Open Club Chomp from your home screen to continue.
                </p>
                <button
                  className="btn btn-primary btn-large"
                  onClick={() => navigate('/')}
                  style={{ marginBottom: '12px' }}
                >
                  Continue in Browser
                </button>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                  For the best experience, use the app from your home screen.
                </p>
              </>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="onboarding-title">Link expired</h1>
            <p className="onboarding-subtitle">{error}</p>
            <button
              className="btn btn-primary btn-large"
              onClick={() => navigate('/onboarding')}
              style={{ marginTop: '24px' }}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </main>
  );
}
