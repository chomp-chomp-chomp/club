'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatRelativeTime } from '@/lib/client-utils';

interface Member {
  id: string;
  display_name: string;
  is_admin: number;
  is_disabled: number;
  created_at: string;
  last_seen_at: string;
  active_subscriptions: number;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMembers = async () => {
    try {
      const data = await api<Member[]>('/members');
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const toggleDisabled = async (memberId: string, currentState: number) => {
    try {
      await api(`/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_disabled: !currentState }),
      });
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    }
  };

  return (
    <main className="container">
      <Link href="/admin" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← Back
      </Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Members</h1>
        <p className="page-subtitle">{members.length} members</p>
      </header>

      {error && <div className="error-text" style={{ marginBottom: '16px' }}>{error}</div>}

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : members.length === 0 ? (
        <div className="empty-state">No members yet</div>
      ) : (
        <div>
          {members.map((member) => (
            <div key={member.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="card-title">
                    {member.display_name}
                    {member.is_admin === 1 && (
                      <span className="badge badge-accent" style={{ marginLeft: '8px' }}>
                        Admin
                      </span>
                    )}
                    {member.is_disabled === 1 && (
                      <span className="badge badge-default" style={{ marginLeft: '8px' }}>
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="card-meta" style={{ marginTop: '4px' }}>
                    Last seen: {formatRelativeTime(member.last_seen_at)}
                  </div>
                  <div className="card-meta">
                    {member.active_subscriptions > 0
                      ? `${member.active_subscriptions} push subscription${member.active_subscriptions === 1 ? '' : 's'}`
                      : 'No push subscriptions'}
                  </div>
                </div>
                {member.is_admin !== 1 && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => toggleDisabled(member.id, member.is_disabled)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    {member.is_disabled === 1 ? 'Enable' : 'Disable'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
