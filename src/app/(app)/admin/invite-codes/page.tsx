'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatRelativeTime } from '@/lib/client-utils';

interface InviteCode {
  id: string;
  code: string;
  created_by_name: string | null;
  created_at: string;
  max_uses: number;
  use_count: number;
  is_revoked: number;
  expires_at: string | null;
}

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresDays, setExpiresDays] = useState(0);

  const loadCodes = async () => {
    try {
      const data = await api<InviteCode[]>('/admin/invite-codes');
      setCodes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const createCode = async () => {
    setCreating(true);
    setError('');

    try {
      await api('/admin/invite-codes', {
        method: 'POST',
        body: JSON.stringify({
          max_uses: maxUses,
          expires_days: expiresDays > 0 ? expiresDays : undefined,
        }),
      });
      await loadCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create code');
    } finally {
      setCreating(false);
    }
  };

  const revokeCode = async (id: string) => {
    if (!confirm('Revoke this invite code?')) return;

    try {
      await api(`/admin/invite-codes/${id}`, { method: 'DELETE' });
      await loadCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke code');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <main className="container">
      <Link href="/admin" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← Back
      </Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Invite Codes</h1>
        <p className="page-subtitle">Generate and manage codes</p>
      </header>

      {error && <div className="error-text" style={{ marginBottom: '16px' }}>{error}</div>}

      <section className="section">
        <h2 className="section-title">Generate New Code</h2>
        <div className="card">
          <div className="form-group">
            <label className="form-label" htmlFor="maxUses">Max Uses</label>
            <input
              id="maxUses"
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
              min={1}
              max={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="expiresDays">Expires in (days, 0 = never)</label>
            <input
              id="expiresDays"
              type="number"
              value={expiresDays}
              onChange={(e) => setExpiresDays(parseInt(e.target.value) || 0)}
              min={0}
              max={365}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={createCode}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Generate Code'}
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Active Codes</h2>

        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : codes.length === 0 ? (
          <div className="empty-state">No invite codes yet</div>
        ) : (
          <div>
            {codes.map((code) => (
              <div key={code.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ fontSize: '1.1rem', fontWeight: '600', letterSpacing: '1px' }}>
                        {code.code}
                      </code>
                      <button
                        className="btn btn-secondary"
                        onClick={() => copyCode(code.code)}
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        Copy
                      </button>
                      {code.is_revoked === 1 && (
                        <span className="badge badge-default">Revoked</span>
                      )}
                    </div>
                    <div className="card-meta" style={{ marginTop: '8px' }}>
                      {code.use_count}/{code.max_uses} uses · Created {formatRelativeTime(code.created_at)}
                      {code.expires_at && ` · Expires ${new Date(code.expires_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  {code.is_revoked !== 1 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => revokeCode(code.id)}
                      style={{ fontSize: '0.85rem', color: 'var(--color-error)' }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
