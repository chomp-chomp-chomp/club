import { useEffect, useState } from 'react';
import { api, formatRelativeTime } from '../lib/api';
import StartBakingModal from '../components/StartBakingModal';

interface Pulse {
  id: string;
  type: 'bake_started' | 'recipe_dropped' | 'club_call';
  title: string;
  body: string | null;
  member_name: string | null;
  created_at: string;
}

export default function Home() {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadPulses = async () => {
    try {
      const data = await api<Pulse[]>('/api/pulses');
      setPulses(data);
    } catch (error) {
      console.error('Failed to load pulses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPulses();
  }, []);

  const handleStartBaking = async (data: { note?: string; sendPush: boolean }) => {
    await api('/api/pulses', {
      method: 'POST',
      body: JSON.stringify({ note: data.note, send_push: data.sendPush }),
    });
    await loadPulses();
  };

  return (
    <div className="container">
      <header className="page-header">
        <h1 className="page-title">Pulses</h1>
        <p className="page-subtitle">Last 72 hours</p>
      </header>

      <button
        className="btn btn-primary btn-large"
        onClick={() => setShowModal(true)}
        style={{ width: '100%', marginBottom: '24px' }}
      >
        Start Baking
      </button>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : pulses.length === 0 ? (
        <div className="empty-state">
          <p>No recent activity</p>
          <p className="text-muted">Start baking to create the first pulse!</p>
        </div>
      ) : (
        <div className="pulse-list">
          {pulses.map((pulse) => (
            <div key={pulse.id} className="card pulse-card">
              <div className={`pulse-icon ${pulse.type}`} aria-hidden="true" />
              <div className="pulse-content">
                <div className="pulse-title">{pulse.title}</div>
                {pulse.body && <div className="pulse-body">{pulse.body}</div>}
                <div className="pulse-meta">{formatRelativeTime(pulse.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <StartBakingModal
          onClose={() => setShowModal(false)}
          onSubmit={handleStartBaking}
        />
      )}
    </div>
  );
}
