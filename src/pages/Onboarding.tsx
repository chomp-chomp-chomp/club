import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, urlBase64ToUint8Array } from '../lib/api';

type Step = 'welcome' | 'install' | 'code' | 'notifications' | 'complete';
type JoinMode = 'invite' | 'login';
type LoginMethod = 'magic' | 'code';

export default function Onboarding() {
  const navigate = useNavigate();
  const { member, refresh } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [joinMode, setJoinMode] = useState<JoinMode>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('magic');
  const [loginCode, setLoginCode] = useState('');

  useEffect(() => {
    // Check if running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // If already logged in, redirect to home
    if (member) {
      navigate('/');
    }
  }, [member, navigate]);

  const handleJoin = async () => {
    if (!inviteCode.trim() || !displayName.trim() || !email.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api('/api/auth/join', {
        method: 'POST',
        body: JSON.stringify({
          invite_code: inviteCode.trim(),
          display_name: displayName.trim(),
          email: email.trim(),
        }),
      });
      await refresh();
      setStep('notifications');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMagicLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api('/api/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send login link');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithCode = async () => {
    if (!loginCode.trim()) {
      setError('Please enter your login code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api('/api/auth/login-with-code', {
        method: 'POST',
        body: JSON.stringify({ code: loginCode.trim() }),
      });
      await refresh();
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStep('complete');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStep('complete');
        return;
      }

      const { vapid_public_key } = await api<{ vapid_public_key: string }>(
        '/api/notifications/subscribe'
      );

      if (!vapid_public_key) {
        setStep('complete');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid_public_key),
      });

      await api('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription.toJSON()),
      });

      setStep('complete');
    } catch {
      setStep('complete');
    }
  };

  const handleSkipNotifications = () => {
    setStep('complete');
  };

  const handleFinish = () => {
    navigate('/');
  };

  return (
    <main className="onboarding-container">
      {step === 'welcome' && (
        <div className="onboarding-step">
          <h1 className="onboarding-title">Welcome to Club Chomp</h1>
          <p className="onboarding-subtitle">
            A quiet baking club for friends.<br />
            Feel the ambient presence of your fellow bakers.
          </p>
          <button
            className="btn btn-primary btn-large"
            onClick={() => setStep(isInstalled ? 'code' : 'install')}
          >
            Get Started
          </button>
        </div>
      )}

      {step === 'install' && (
        <div className="onboarding-step">
          <h1 className="onboarding-title">Add to Home Screen</h1>
          <p className="onboarding-subtitle">
            For the best experience and push notifications, install Club Chomp to your Home Screen.
          </p>

          <div className="card" style={{ textAlign: 'left', marginBottom: '24px' }}>
            <p style={{ marginBottom: '12px', fontWeight: '500' }}>On iPhone:</p>
            <ol style={{ paddingLeft: '20px', lineHeight: '2' }}>
              <li>Tap the Share button below</li>
              <li>Scroll and tap "Add to Home Screen"</li>
              <li>Tap "Add"</li>
              <li>Open from your Home Screen</li>
            </ol>
          </div>

          <button
            className="btn btn-primary btn-large"
            onClick={() => setStep('code')}
          >
            I have installed it
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setStep('code')}
            style={{ marginTop: '12px', width: '100%' }}
          >
            Continue without installing
          </button>
        </div>
      )}

      {step === 'code' && (
        <div className="onboarding-step" style={{ textAlign: 'left' }}>
          <h1 className="onboarding-title" style={{ textAlign: 'center' }}>
            {joinMode === 'invite' ? 'Join the Club' : 'Sign In'}
          </h1>
          <p className="onboarding-subtitle" style={{ textAlign: 'center' }}>
            {joinMode === 'invite'
              ? 'Enter your invite code to join.'
              : 'Get a login link sent to your email.'}
          </p>

          <div className="tabs" style={{ marginBottom: '24px' }}>
            <button
              className={`tab ${joinMode === 'invite' ? 'active' : ''}`}
              onClick={() => { setJoinMode('invite'); setError(''); setMagicLinkSent(false); }}
            >
              Join
            </button>
            <button
              className={`tab ${joinMode === 'login' ? 'active' : ''}`}
              onClick={() => { setJoinMode('login'); setError(''); setMagicLinkSent(false); }}
            >
              Sign In
            </button>
          </div>

          {joinMode === 'invite' ? (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="inviteCode">Invite Code</label>
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  autoCapitalize="characters"
                  autoComplete="off"
                  style={{ textAlign: 'center', letterSpacing: '2px', fontSize: '1.25rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="displayName">Your Name</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <div className="form-hint">Used for signing back in if you get logged out</div>
              </div>

              {error && <div className="error-text" style={{ marginBottom: '16px' }}>{error}</div>}

              <button
                className="btn btn-primary btn-large"
                onClick={handleJoin}
                disabled={loading || !inviteCode.trim() || !displayName.trim() || !email.trim()}
              >
                {loading ? 'Joining...' : 'Join Club'}
              </button>
            </>
          ) : (
            <>
              <div className="tabs" style={{ marginBottom: '16px' }}>
                <button
                  className={`tab ${loginMethod === 'magic' ? 'active' : ''}`}
                  onClick={() => { setLoginMethod('magic'); setError(''); }}
                >
                  Magic Link
                </button>
                <button
                  className={`tab ${loginMethod === 'code' ? 'active' : ''}`}
                  onClick={() => { setLoginMethod('code'); setError(''); }}
                >
                  Login Code
                </button>
              </div>

              {loginMethod === 'magic' ? (
                magicLinkSent ? (
                  <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Check your email</div>
                    <p>If an account exists for <strong>{email}</strong>, we sent a login link.</p>
                    <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>
                      The link expires in 15 minutes.
                    </p>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setMagicLinkSent(false); setEmail(''); }}
                      style={{ marginTop: '16px' }}
                    >
                      Try different email
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="loginEmail">Email</label>
                      <input
                        id="loginEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                      <div className="form-hint">
                        We'll send you a magic link to sign in
                      </div>
                    </div>

                    {error && <div className="error-text" style={{ marginBottom: '16px' }}>{error}</div>}

                    <button
                      className="btn btn-primary btn-large"
                      onClick={handleRequestMagicLink}
                      disabled={loading || !email.trim()}
                    >
                      {loading ? 'Sending...' : 'Send Login Link'}
                    </button>
                  </>
                )
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="loginCode">Login Code</label>
                    <input
                      id="loginCode"
                      type="text"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      autoCapitalize="characters"
                      autoComplete="off"
                      style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.5rem' }}
                      maxLength={6}
                    />
                    <div className="form-hint">
                      Get this code from Settings on your logged-in device
                    </div>
                  </div>

                  {error && <div className="error-text" style={{ marginBottom: '16px' }}>{error}</div>}

                  <button
                    className="btn btn-primary btn-large"
                    onClick={handleLoginWithCode}
                    disabled={loading || loginCode.trim().length !== 6}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {step === 'notifications' && (
        <div className="onboarding-step">
          <h1 className="onboarding-title">Stay Connected</h1>
          <p className="onboarding-subtitle">
            Get notified when new recipes drop or when the club calls.
          </p>

          <div className="card" style={{ textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ marginBottom: '12px' }}>
              <strong>You will receive:</strong>
            </div>
            <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
              <li>New recipe notifications</li>
              <li>Club call announcements</li>
              <li>Bake alerts (optional)</li>
            </ul>
          </div>

          <button
            className="btn btn-primary btn-large"
            onClick={handleEnableNotifications}
          >
            Enable Notifications
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSkipNotifications}
            style={{ marginTop: '12px', width: '100%' }}
          >
            Maybe Later
          </button>
        </div>
      )}

      {step === 'complete' && (
        <div className="onboarding-step">
          <h1 className="onboarding-title">You are in!</h1>
          <p className="onboarding-subtitle">
            Welcome to the club. Happy baking!
          </p>

          <button
            className="btn btn-primary btn-large"
            onClick={handleFinish}
          >
            Enter the Club
          </button>
        </div>
      )}
    </main>
  );
}
