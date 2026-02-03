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
  email: string | null;
}

export default function InviteCodes() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [maxUses, setMaxUses] = useState('1');
  const [count, setCount] = useState('1');
  const [email, setEmail] = useState('');
  const [showBulkResult, setShowBulkResult] = useState<string[] | null>(null);

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
    setShowBulkResult(null);
    try {
      const countNum = parseInt(count, 10) || 1;
      const result = await api<InviteCode | InviteCode[]>('/api/admin/invite-codes', {
        method: 'POST',
        body: JSON.stringify({
          max_uses: maxUses ? parseInt(maxUses, 10) : 1,
          count: countNum,
          email: email.trim() || undefined,
        }),
      });

      // Show bulk result if multiple codes generated
      if (Array.isArray(result)) {
        setShowBulkResult(result.map(c => c.code));
      }

      setEmail('');
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

  const copyAllCodes = () => {
    if (showBulkResult) {
      navigator.clipboard.writeText(showBulkResult.join('\n'));
    }
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

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="count">Number of codes</label>
          <input
            id="count"
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="1"
            min="1"
            max="50"
          />
          <div className="form-hint">Generate up to 50 codes at once</div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="maxUses">Max uses per code</label>
          <input
            id="maxUses"
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="1"
            min="1"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">Email (optional)</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
          />
          <div className="form-hint">Associate codes with an email for tracking</div>
        </div>

        <button
          className="btn btn-primary"
          onClick={generateCode}
          disabled={generating}
          style={{ width: '100%' }}
        >
          {generating ? 'Generating...' : `Generate ${parseInt(count, 10) > 1 ? count + ' Codes' : 'Code'}`}
        </button>
      </div>

      {showBulkResult && (
        <div className="card" style={{ marginBottom: '24px', background: 'var(--color-accent-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <strong>Generated {showBulkResult.length} codes:</strong>
            <button className="btn btn-secondary" onClick={copyAllCodes}>
              Copy All
            </button>
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            whiteSpace: 'pre-wrap',
            background: 'var(--color-surface)',
            padding: '12px',
            borderRadius: '8px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {showBulkResult.join('\n')}
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setShowBulkResult(null)}
            style={{ marginTop: '12px' }}
          >
            Dismiss
          </button>
        </div>
      )}

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
                  {code.email && <span>Email: {code.email}</span>}
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
                  {code.email && <span>Email: {code.email}</span>}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
