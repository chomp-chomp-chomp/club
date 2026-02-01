'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api, formatRelativeTime, formatExpiry } from '@/lib/client-utils';

interface Reply {
  id: string;
  content: string;
  member_name: string;
  created_at: string;
}

interface Bulletin {
  id: string;
  content: string;
  member_name: string;
  reply_count: number;
  created_at: string;
  expires_at: string;
  replies: Reply[];
}

const MAX_REPLIES = 7;

export default function BulletinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState('');

  const loadBulletin = async () => {
    try {
      const data = await api<Bulletin>(`/bulletins/${id}`);
      setBulletin(data);
    } catch (err) {
      console.error('Failed to load bulletin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBulletin();
  }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setReplying(true);
    setError('');

    try {
      await api(`/bulletins/${id}/replies`, {
        method: 'POST',
        body: JSON.stringify({ content: replyText.trim() }),
      });
      setReplyText('');
      await loadBulletin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reply');
    } finally {
      setReplying(false);
    }
  };

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">Loading...</div>
      </main>
    );
  }

  if (!bulletin) {
    return (
      <main className="container">
        <div className="empty-state">
          <p>Bulletin not found</p>
          <Link href="/bulletin" style={{ marginTop: '16px', display: 'inline-block' }}>
            Back to bulletin board
          </Link>
        </div>
      </main>
    );
  }

  const isExpired = new Date(bulletin.expires_at) <= new Date();
  const canReply = !isExpired && bulletin.replies.length < MAX_REPLIES;

  return (
    <main className="container">
      <Link href="/bulletin" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← Back
      </Link>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{bulletin.member_name}</div>
            <div className="card-meta">
              {formatRelativeTime(bulletin.created_at)} · {formatExpiry(bulletin.expires_at)}
            </div>
          </div>
        </div>
        <div className="card-body" style={{ marginTop: '12px', fontSize: '1.1rem' }}>
          {bulletin.content}
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">
          Replies ({bulletin.replies.length}/{MAX_REPLIES})
        </h2>

        {bulletin.replies.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px' }}>
            No replies yet
          </div>
        ) : (
          bulletin.replies.map((reply) => (
            <div key={reply.id} className="card">
              <div className="card-meta">{reply.member_name}</div>
              <div style={{ marginTop: '4px' }}>{reply.content}</div>
              <div className="card-meta" style={{ marginTop: '8px' }}>
                {formatRelativeTime(reply.created_at)}
              </div>
            </div>
          ))
        )}

        {canReply && (
          <form onSubmit={handleReply} style={{ marginTop: '16px' }}>
            <div className="form-group">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                maxLength={140}
              />
              <div className="form-hint">{replyText.length}/140</div>
            </div>
            {error && <div className="error-text">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!replyText.trim() || replying}
              style={{ marginTop: '8px' }}
            >
              {replying ? 'Replying...' : 'Reply'}
            </button>
          </form>
        )}

        {isExpired && (
          <div className="empty-state" style={{ padding: '16px' }}>
            This bulletin has expired. Replies are closed.
          </div>
        )}

        {!isExpired && bulletin.replies.length >= MAX_REPLIES && (
          <div className="empty-state" style={{ padding: '16px' }}>
            Maximum replies reached.
          </div>
        )}
      </section>
    </main>
  );
}
