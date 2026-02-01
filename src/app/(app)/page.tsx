'use client';

import { useEffect, useState, useCallback } from 'react';
import PulseCard from '@/components/PulseCard';
import StartBakingModal from '@/components/StartBakingModal';
import { api } from '@/lib/client-utils';

interface Pulse {
  id: string;
  type: 'bake_started' | 'recipe_dropped' | 'club_call';
  title: string;
  body: string | null;
  member_name: string | null;
  recipe_url: string | null;
  created_at: string;
}

export default function HomePage() {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadPulses = useCallback(async () => {
    try {
      const data = await api<Pulse[]>('/pulses');
      setPulses(data);
    } catch (err) {
      console.error('Failed to load pulses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPulses();
  }, [loadPulses]);

  const handleStartBaking = async (data: { note?: string; sendPush: boolean }) => {
    await api('/pulses', {
      method: 'POST',
      body: JSON.stringify({
        note: data.note,
        send_push: data.sendPush,
      }),
    });
    await loadPulses();
  };

  return (
    <main className="container">
      <header className="page-header">
        <h1 className="page-title">Chomp Club</h1>
        <p className="page-subtitle">Last 72 hours</p>
      </header>

      <button
        className="btn btn-primary btn-large"
        onClick={() => setShowModal(true)}
        style={{ marginBottom: '24px' }}
      >
        Start Baking
      </button>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : pulses.length === 0 ? (
        <div className="empty-state">
          <p>No recent activity</p>
          <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
            Start baking to create the first pulse!
          </p>
        </div>
      ) : (
        <div>
          {pulses.map((pulse) => (
            <PulseCard key={pulse.id} pulse={pulse} />
          ))}
        </div>
      )}

      {showModal && (
        <StartBakingModal
          onClose={() => setShowModal(false)}
          onSubmit={handleStartBaking}
        />
      )}
    </main>
  );
}
