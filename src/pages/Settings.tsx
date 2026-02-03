import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, urlBase64ToUint8Array } from '../lib/api';

export default function Settings() {
  const navigate = useNavigate();
  const { member, refresh, logout } = useAuth();
  const [displayName, setDisplayName] = useState(member?.display_name || '');
  const [saving, setSaving] = useState(false);

  const prefs = member?.notification_prefs || {
    bake_started: false,
    recipe_dropped: true,
    club_call: true,
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await api('/api/members', {
        method: 'PATCH',
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      await refresh();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePref = async (key: 'bake_started' | 'recipe_dropped' | 'club_call') => {
    const newValue = !prefs[key];
    try {
      await api('/api/notifications/prefs', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: newValue }),
      });
      await refresh();
    } catch (err) {
      console.error('Failed to update pref:', err);
    }
  };

  const handleReenableNotifications = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push notifications are not supported on this device.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Please enable notifications in your device settings.');
        return;
      }

      const { vapid_public_key } = await api<{ vapid_public_key: string }>(
        '/api/notifications/subscribe'
      );

      if (!vapid_public_key) {
        alert('Push notifications are not configured on this server.');
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

      alert('Notifications enabled!');
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      alert('Failed to enable notifications. Please try again.');
    }
  };

  const handleLeaveClub = async () => {
    if (!confirm('Are you sure you want to leave the club?')) return;
    await logout();
    navigate('/onboarding');
  };

  return (
    <div className="container">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
      </header>

      <section className="section">
        <h2 className="section-title">Profile</h2>
        <div className="card">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="displayName">
              Display Name
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
              />
              <button
                className="btn btn-secondary"
                onClick={handleSaveName}
                disabled={saving || !displayName.trim()}
                style={{ flexShrink: 0 }}
              >
                {saving ? '...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Notifications</h2>
        <div className="card">
          <div className="toggle">
            <div>
              <div className="toggle-label">Recipe drops</div>
              <div className="toggle-hint">When new recipes are shared</div>
            </div>
            <button
              className={`toggle-switch ${prefs.recipe_dropped ? 'active' : ''}`}
              onClick={() => handleTogglePref('recipe_dropped')}
            />
          </div>

          <div className="toggle">
            <div>
              <div className="toggle-label">Bake alerts</div>
              <div className="toggle-hint">When members start baking</div>
            </div>
            <button
              className={`toggle-switch ${prefs.bake_started ? 'active' : ''}`}
              onClick={() => handleTogglePref('bake_started')}
            />
          </div>

          <div className="toggle">
            <div>
              <div className="toggle-label">Club calls</div>
              <div className="toggle-hint">Announcements from the club</div>
            </div>
            <button
              className={`toggle-switch ${prefs.club_call ? 'active' : ''}`}
              onClick={() => handleTogglePref('club_call')}
            />
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleReenableNotifications}
          style={{ marginTop: '12px', width: '100%' }}
        >
          Re-enable notifications
        </button>
      </section>

      <section className="section">
        <h2 className="section-title">Help</h2>
        <Link to="/about" className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div className="card-title">About Chomp Club</div>
          <div className="card-meta">How it works, troubleshooting</div>
        </Link>
      </section>

      {member?.is_admin && (
        <section className="section">
          <h2 className="section-title">Admin</h2>
          <Link to="/admin" className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div className="card-title">Admin Panel</div>
            <div className="card-meta">Manage club, recipes, members</div>
          </Link>
        </section>
      )}

      <section className="section">
        <button
          className="btn btn-secondary"
          onClick={handleLeaveClub}
          style={{ width: '100%', color: 'var(--color-error)' }}
        >
          Leave club
        </button>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <div>Version 1.0.0</div>
        {member?.is_admin && <div style={{ marginTop: '4px' }}>Admin</div>}
      </footer>
    </div>
  );
}
