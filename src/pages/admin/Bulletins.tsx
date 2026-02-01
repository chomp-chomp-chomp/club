import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatRelativeTime, formatExpiry } from '../../lib/api';

interface Bulletin {
  id: string;
  content: string;
  author_name: string;
  reply_count: number;
  created_at: string;
  expires_at: string;
}

export default function Bulletins() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBulletins = async () => {
    try {
      const data = await api<Bulletin[]>('/api/bulletins');
      setBulletins(data);
    } catch (error) {
      console.error('Failed to load bulletins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBulletins();
  }, []);

  const removeBulletin = async (id: string) => {
    if (!confirm('Remove this bulletin?')) return;
    try {
      await api(`/api/bulletins/${id}`, { method: 'DELETE' });
      await loadBulletins();
    } catch (error) {
      console.error('Failed to remove:', error);
    }
  };

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
        <h1 className="page-title">Bulletins</h1>
        <p className="page-subtitle">{bulletins.length} active bulletins</p>
      </header>

      {bulletins.length === 0 ? (
        <div className="empty-state">No active bulletins</div>
      ) : (
        <div className="bulletin-list">
          {bulletins.map((bulletin) => (
            <div key={bulletin.id} className="card bulletin-admin-card">
              <div className="bulletin-content">{bulletin.content}</div>
              <div className="bulletin-meta">
                <span>{bulletin.author_name}</span>
                <span>{formatRelativeTime(bulletin.created_at)}</span>
                <span>{formatExpiry(bulletin.expires_at)}</span>
                <span>{bulletin.reply_count} replies</span>
              </div>
              <button
                className="btn btn-secondary danger"
                onClick={() => removeBulletin(bulletin.id)}
                style={{ marginTop: '12px' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
