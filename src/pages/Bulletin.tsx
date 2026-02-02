import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatRelativeTime, formatExpiry } from '../lib/api';

interface BulletinItem {
  id: string;
  content: string;
  author_name: string;
  reply_count: number;
  created_at: string;
  expires_at: string;
}

export default function Bulletin() {
  const [bulletins, setBulletins] = useState<BulletinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  const loadBulletins = async () => {
    try {
      const data = await api<BulletinItem[]>('/api/bulletins');
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

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || posting) return;

    setPosting(true);
    try {
      await api('/api/bulletins', {
        method: 'POST',
        body: JSON.stringify({ content: newPost.trim() }),
      });
      setNewPost('');
      await loadBulletins();
    } catch (error) {
      console.error('Failed to post:', error);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="container">
      <header className="page-header">
        <h1 className="page-title">Bulletin</h1>
        <p className="page-subtitle">Posts expire in 7 days</p>
      </header>

      <form onSubmit={handlePost} className="bulletin-form">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Write something..."
          rows={3}
          maxLength={280}
        />
        <div className="form-row">
          <span className="form-hint">{newPost.length}/280</span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!newPost.trim() || posting}
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : bulletins.length === 0 ? (
        <div className="empty-state">
          <p>No posts yet</p>
          <p className="text-muted">Be the first to post!</p>
        </div>
      ) : (
        <div className="bulletin-list">
          {bulletins.map((bulletin) => (
            <Link
              key={bulletin.id}
              to={`/bulletin/${bulletin.id}`}
              className="card bulletin-card"
            >
              <div className="bulletin-content">{bulletin.content}</div>
              <div className="bulletin-meta">
                <span>{bulletin.author_name}</span>
                <span>{formatRelativeTime(bulletin.created_at)}</span>
                <span className="bulletin-expiry">{formatExpiry(bulletin.expires_at)}</span>
              </div>
              <div className="bulletin-footer">
                <span className="reply-count">
                  {bulletin.reply_count} {bulletin.reply_count === 1 ? 'reply' : 'replies'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
