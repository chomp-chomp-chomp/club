import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatRelativeTime } from '../../lib/api';

interface ClubCallItem {
  id: string;
  body: string;
  member_name: string;
  created_at: string;
}

export default function ClubCall() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');
  const [calls, setCalls] = useState<ClubCallItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCalls = async () => {
    try {
      const data = await api<ClubCallItem[]>('/api/admin/club-calls');
      setCalls(data);
    } catch (error) {
      console.error('Failed to load club calls:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    setResult('');
    try {
      const response = await api<{ pulse: object; push: { sent: number; failed: number } }>('/api/admin/club-call', {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      });
      const pushInfo = response.push
        ? ` (${response.push.sent} notifications sent${response.push.failed ? `, ${response.push.failed} failed` : ''})`
        : '';
      setResult(`Club call sent!${pushInfo}`);
      setMessage('');
      await loadCalls();
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this club call?')) return;

    try {
      await api(`/api/admin/club-calls/${id}`, { method: 'DELETE' });
      await loadCalls();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <div className="container">
      <Link to="/admin" className="back-link">← Back</Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Club Call</h1>
        <p className="page-subtitle">Send an announcement to all members</p>
      </header>

      {result && (
        <div className={`message ${result.includes('Failed') ? 'error' : 'success'}`}>
          {result}
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="message">Message</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Weekend citrus bake..."
          rows={4}
          maxLength={280}
        />
        <div className="form-hint">{message.length}/280</div>
      </div>

      {message.trim() && (
        <div className="preview-card">
          <h3>Preview</h3>
          <div className="pulse-preview">
            <span className="pulse-icon club_call" aria-hidden="true" />
            <div>
              <div className="pulse-title">Club call</div>
              <div className="pulse-body">{message}</div>
            </div>
          </div>
        </div>
      )}

      <button
        className="btn btn-primary btn-large"
        onClick={handleSend}
        disabled={sending || !message.trim()}
        style={{ width: '100%', marginTop: '16px' }}
      >
        {sending ? 'Sending...' : 'Send Club Call'}
      </button>

      <section style={{ marginTop: '32px' }}>
        <h2 className="section-title">Recent Club Calls</h2>
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : calls.length === 0 ? (
          <div className="empty-state">No club calls yet</div>
        ) : (
          <div className="call-list">
            {calls.map((call) => (
              <div key={call.id} className="card" style={{ marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '4px' }}>{call.body}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {call.member_name} - {formatRelativeTime(call.created_at)}
                  </div>
                </div>
                <button
                  className="btn-icon danger"
                  onClick={() => handleDelete(call.id)}
                  style={{ marginLeft: '8px' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
