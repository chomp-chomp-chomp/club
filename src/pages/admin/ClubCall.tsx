import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function ClubCall() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    setResult('');
    try {
      const response = await api<{ push: { sent: number; failed: number } }>('/api/admin/club-call', {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      });
      setResult(`Sent! ${response.push.sent} notifications delivered.`);
      setMessage('');
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Failed to send');
    } finally {
      setSending(false);
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
            <span className="pulse-icon">🧺</span>
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
    </div>
  );
}
