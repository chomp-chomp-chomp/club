import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatRelativeTime } from '../../lib/api';

interface InviteCode {
  id: string;
  code: string;
  max_uses: number | null;
  uses_count: number;
  is_active: number;
  created_at: string;
}

export default function InviteCodes() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [maxUses, setMaxUses] = useState('');

  const loadCodes = async () => {
    try {
      const data = await api<InviteCode[]>('/api/admin/invite-codes');
      setCodes(data);
    } catch (error) {
      console.error('Failed to load codes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const generateCode = async () => {
    setGenerating(true);
    try {
      await api('/api/admin/invite-codes', {
        method: 'POST',
        body: JSON.stringify({
          max_uses: maxUses ? parseInt(maxUses, 10) : undefined,
        }),
      });
      setMaxUses('');
      await loadCodes();
    } catch (error) {
      console.error('Failed to generate:', error);
    } finally {
      setGenerating(false);
    }
  };

  const revokeCode = async (id: string) => {
    if (!confirm('Revoke this invite code?')) return;
    try {
      await api(`/api/admin/invite-codes/${id}`, { method: 'DELETE' });
      await loadCodes();
    } catch (error) {
      console.error('Failed to revoke:', error);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  const activeCodes = codes.filter((c) => c.is_active);
  const revokedCodes = codes.filter((c) => !c.is_active);

  return (
    <div className="container">
      <Link to="/admin" className="back-link">← Back</Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Invite Codes</h1>
        <p className="page-subtitle">{activeCodes.length} active codes</p>
      </header>

      <div className="generate-form">
        <div className="form-group">
          <label className="form-label" htmlFor="maxUses">Max Uses (optional)</label>
          <input
            id="maxUses"
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Unlimited"
            min="1"
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={generateCode}
          disabled={generating}
        >
          {generating ? 'Generating...' : 'Generate Code'}
        </button>
      </div>

      {activeCodes.length > 0 && (
        <section className="section">
          <h2 className="section-title">Active Codes</h2>
          {activeCodes.map((code) => (
            <div key={code.id} className="card invite-code-card">
              <div className="code-info">
                <div className="code-value" onClick={() => copyCode(code.code)}>
                  {code.code}
                  <span className="copy-hint">Click to copy</span>
                </div>
                <div className="code-meta">
                  <span>Uses: {code.uses_count}{code.max_uses ? `/${code.max_uses}` : ''}</span>
                  <span>Created: {formatRelativeTime(code.created_at)}</span>
                </div>
              </div>
              <button
                className="btn btn-secondary danger"
                onClick={() => revokeCode(code.id)}
              >
                Revoke
              </button>
            </div>
          ))}
        </section>
      )}

      {revokedCodes.length > 0 && (
        <section className="section">
          <h2 className="section-title">Revoked Codes</h2>
          {revokedCodes.map((code) => (
            <div key={code.id} className="card invite-code-card revoked">
              <div className="code-info">
                <div className="code-value">{code.code}</div>
                <div className="code-meta">
                  <span>Uses: {code.uses_count}</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
