import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatRelativeTime } from '../../lib/api';

interface Pulse {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  member_name: string | null;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  bake_started: 'Bake Started',
  recipe_dropped: 'Recipe Drop',
  club_call: 'Club Call',
};

export default function Activity() {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadActivity = async () => {
    try {
      const data = await api<Pulse[]>('/api/admin/activity');
      setPulses(data);
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const handleDelete = async (id: string, type: string) => {
    const typeLabel = typeLabels[type] || type;
    if (!confirm(`Delete this ${typeLabel.toLowerCase()}?`)) return;

    try {
      await api(`/api/admin/activity/${id}`, { method: 'DELETE' });
      await loadActivity();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const filteredPulses = filter === 'all'
    ? pulses
    : pulses.filter(p => p.type === filter);

  const pulseTypes = ['all', ...new Set(pulses.map(p => p.type))];

  if (loading) {
    return (
      <div className="container">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <Link to="/admin" className="back-link">← Back</Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Activity</h1>
        <p className="page-subtitle">All pulses and activity</p>
      </header>

      <div className="tabs" style={{ marginBottom: '16px' }}>
        {pulseTypes.map((type) => (
          <button
            key={type}
            className={`tab ${filter === type ? 'active' : ''}`}
            onClick={() => setFilter(type)}
          >
            {type === 'all' ? 'All' : typeLabels[type] || type}
          </button>
        ))}
      </div>

      <div className="text-muted" style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
        {filteredPulses.length} {filter === 'all' ? 'total' : ''} items
      </div>

      {filteredPulses.length === 0 ? (
        <div className="empty-state">No activity yet</div>
      ) : (
        <div className="activity-list">
          {filteredPulses.map((pulse) => (
            <div key={pulse.id} className="card" style={{ marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge" style={{ fontSize: '0.75rem' }}>
                    {typeLabels[pulse.type] || pulse.type}
                  </span>
                  <span style={{ fontWeight: 500 }}>{pulse.title}</span>
                </div>
                {pulse.body && (
                  <div className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                    {pulse.body}
                  </div>
                )}
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {pulse.member_name || 'Unknown'} - {formatRelativeTime(pulse.created_at)}
                </div>
              </div>
              <button
                className="btn-icon danger"
                onClick={() => handleDelete(pulse.id, pulse.type)}
                style={{ marginLeft: '8px' }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
