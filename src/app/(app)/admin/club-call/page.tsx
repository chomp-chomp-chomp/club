'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-utils';

export default function ClubCallPage() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const result = await api<{ push: { sent: number } }>('/admin/club-call', {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      });
      setSuccess(`Club call sent! ${result.push.sent} notifications delivered.`);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send club call');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="container">
      <Link href="/admin" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← Back
      </Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Send Club Call</h1>
        <p className="page-subtitle">Announce to all members</p>
      </header>

      {error && <div className="error-text" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ color: 'var(--color-success)', marginBottom: '16px' }}>{success}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="message">Message</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Weekend citrus bake this Saturday!"
          rows={4}
          maxLength={280}
        />
        <div className="form-hint">{message.length}/280</div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="pulse-icon club_call">🧺</span>
          <div>
            <div className="card-title">Club call</div>
            <div className="card-meta">Preview</div>
          </div>
        </div>
        <div className="card-body" style={{ marginTop: '8px' }}>
          {message || 'Your message will appear here...'}
        </div>
      </div>

      <button
        className="btn btn-primary btn-large"
        onClick={handleSend}
        disabled={sending || !message.trim()}
      >
        {sending ? 'Sending...' : 'Send Club Call'}
      </button>
    </main>
  );
}
