'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatRelativeTime, formatExpiry } from '@/lib/client-utils';

interface Bulletin {
  id: string;
  content: string;
  member_name: string;
  reply_count: number;
  created_at: string;
  expires_at: string;
}

export default function AdminBulletinsPage() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBulletins = async () => {
    try {
      const data = await api<Bulletin[]>('/bulletins');
      setBulletins(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bulletins');
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
      await api(`/bulletins/${id}`, { method: 'DELETE' });
      await loadBulletins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove bulletin');
    }
  };

  return (
    <main className="container">
      <Link href="/admin" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← Back
      </Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Bulletins</h1>
        <p className="page-subtitle">Moderate bulletin board</p>
      </header>

      {error && <div className="error-text" style={{ marginBottom: '16px' }}>{error}</div>}

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : bulletins.length === 0 ? (
        <div className="empty-state">No active bulletins</div>
      ) : (
        <div>
          {bulletins.map((bulletin) => (
            <div key={bulletin.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div className="card-meta">
                    {bulletin.member_name} · {formatRelativeTime(bulletin.created_at)} · {formatExpiry(bulletin.expires_at)}
                  </div>
                  <div style={{ marginTop: '8px' }}>{bulletin.content}</div>
                  <div className="card-meta" style={{ marginTop: '8px' }}>
                    {bulletin.reply_count} {bulletin.reply_count === 1 ? 'reply' : 'replies'}
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => removeBulletin(bulletin.id)}
                  style={{ fontSize: '0.85rem', color: 'var(--color-error)' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
