'use client';

import { useEffect, useState, useCallback } from 'react';
import BulletinCard from '@/components/BulletinCard';
import { api } from '@/lib/client-utils';

interface Bulletin {
  id: string;
  content: string;
  member_name: string;
  reply_count: number;
  created_at: string;
  expires_at: string;
}

export default function BulletinPage() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const loadBulletins = useCallback(async () => {
    try {
      const data = await api<Bulletin[]>('/bulletins');
      setBulletins(data);
    } catch (err) {
      console.error('Failed to load bulletins:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBulletins();
  }, [loadBulletins]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setPosting(true);
    setError('');

    try {
      await api('/bulletins', {
        method: 'POST',
        body: JSON.stringify({ content: newPost.trim() }),
      });
      setNewPost('');
      await loadBulletins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <main className="container">
      <header className="page-header">
        <h1 className="page-title">Bulletin Board</h1>
        <p className="page-subtitle">Posts expire in 7 days</p>
      </header>

      <form onSubmit={handlePost} style={{ marginBottom: '24px' }}>
        <div className="form-group">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share something with the club..."
            rows={3}
            maxLength={280}
          />
          <div className="form-hint">{newPost.length}/280</div>
        </div>
        {error && <div className="error-text">{error}</div>}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!newPost.trim() || posting}
          style={{ marginTop: '8px' }}
        >
          {posting ? 'Posting...' : 'Post'}
        </button>
      </form>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : bulletins.length === 0 ? (
        <div className="empty-state">
          <p>No bulletins yet</p>
          <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
            Be the first to post something!
          </p>
        </div>
      ) : (
        <div>
          {bulletins.map((bulletin) => (
            <BulletinCard key={bulletin.id} bulletin={bulletin} />
          ))}
        </div>
      )}
    </main>
  );
}
