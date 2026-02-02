import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatRelativeTime } from '../../lib/api';

interface Member {
  id: string;
  display_name: string;
  is_admin: number;
  is_active: number;
  created_at: string;
  last_seen_at: string;
  subscription_count: number;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = async () => {
    try {
      const data = await api<Member[]>('/api/members');
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const toggleActive = async (member: Member) => {
    try {
      await api(`/api/members/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      await loadMembers();
    } catch (error) {
      console.error('Failed to update:', error);
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
        <h1 className="page-title">Members</h1>
        <p className="page-subtitle">{members.length} members</p>
      </header>

      <div className="member-list">
        {members.map((member) => (
          <div key={member.id} className={`card member-card ${!member.is_active ? 'disabled' : ''}`}>
            <div className="member-info">
              <div className="member-name">
                {member.display_name}
                {member.is_admin === 1 && <span className="badge">Admin</span>}
                {!member.is_active && <span className="badge badge-muted">Disabled</span>}
              </div>
              <div className="member-meta">
                <span>Last seen: {formatRelativeTime(member.last_seen_at)}</span>
                <span>{member.subscription_count} push subscription{member.subscription_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <button
              className={`btn btn-secondary ${!member.is_active ? 'btn-success' : 'btn-warning'}`}
              onClick={() => toggleActive(member)}
            >
              {member.is_active ? 'Disable' : 'Enable'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
