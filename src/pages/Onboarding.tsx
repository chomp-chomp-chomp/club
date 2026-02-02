import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, urlBase64ToUint8Array } from '../lib/api';

type Step = 'welcome' | 'install' | 'code' | 'notifications' | 'complete';

export default function Onboarding() {
  const navigate = useNavigate();
  const { member, refresh } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

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
    if (!inviteCode.trim() || !displayName.trim()) {
      setError('Please enter both invite code and display name');
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
          <h1 className="onboarding-title">Welcome to Chomp Club</h1>
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
            For the best experience and push notifications, install Chomp Club to your Home Screen.
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
          <h1 className="onboarding-title" style={{ textAlign: 'center' }}>Join the Club</h1>
          <p className="onboarding-subtitle" style={{ textAlign: 'center' }}>
            Enter your invite code to join.
          </p>

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

          {error && <div className="error-text" style={{ marginBottom: '16px' }}>{error}</div>}

          <button
            className="btn btn-primary btn-large"
            onClick={handleJoin}
            disabled={loading || !inviteCode.trim() || !displayName.trim()}
          >
            {loading ? 'Joining...' : 'Join Club'}
          </button>
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
