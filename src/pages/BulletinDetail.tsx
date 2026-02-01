import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatRelativeTime, formatExpiry } from '../lib/api';

interface Reply {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
}

interface BulletinItem {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
  expires_at: string;
  replies: Reply[];
}

export default function BulletinDetail() {
  const { id } = useParams<{ id: string }>();
  const [bulletin, setBulletin] = useState<BulletinItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const loadBulletin = async () => {
    try {
      const data = await api<BulletinItem>(`/api/bulletins/${id}`);
      setBulletin(data);
    } catch (error) {
      console.error('Failed to load bulletin:', error);
      setError('Bulletin not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBulletin();
  }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || posting) return;

    setPosting(true);
    try {
      await api(`/api/bulletins/${id}/replies`, {
        method: 'POST',
        body: JSON.stringify({ content: newReply.trim() }),
      });
      setNewReply('');
      await loadBulletin();
    } catch (err) {
      console.error('Failed to post reply:', err);
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  if (!bulletin) {
    return (
      <div className="container">
        <Link to="/bulletin" className="back-link">← Back</Link>
        <div className="empty-state">{error || 'Bulletin not found'}</div>
      </div>
    );
  }

  const isExpired = new Date(bulletin.expires_at) <= new Date();
  const canReply = !isExpired && bulletin.replies.length < 7;

  return (
    <div className="container">
      <Link to="/bulletin" className="back-link">← Back</Link>

      <div className="card bulletin-detail">
        <div className="bulletin-content">{bulletin.content}</div>
        <div className="bulletin-meta">
          <span>{bulletin.author_name}</span>
          <span>{formatRelativeTime(bulletin.created_at)}</span>
          <span className="bulletin-expiry">{formatExpiry(bulletin.expires_at)}</span>
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">Replies ({bulletin.replies.length}/7)</h2>

        {bulletin.replies.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px' }}>
            No replies yet
          </div>
        ) : (
          <div className="reply-list">
            {bulletin.replies.map((reply) => (
              <div key={reply.id} className="card reply-card">
                <div className="reply-content">{reply.content}</div>
                <div className="reply-meta">
                  <span>{reply.author_name}</span>
                  <span>{formatRelativeTime(reply.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {canReply ? (
        <form onSubmit={handleReply} className="reply-form">
          <textarea
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            maxLength={140}
          />
          <div className="form-row">
            <span className="form-hint">{newReply.length}/140</span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!newReply.trim() || posting}
            >
              {posting ? 'Replying...' : 'Reply'}
            </button>
          </div>
        </form>
      ) : isExpired ? (
        <div className="text-muted" style={{ textAlign: 'center', padding: '16px' }}>
          This bulletin has expired
        </div>
      ) : (
        <div className="text-muted" style={{ textAlign: 'center', padding: '16px' }}>
          Maximum replies reached
        </div>
      )}

      {error && <div className="error-text">{error}</div>}
    </div>
  );
}
