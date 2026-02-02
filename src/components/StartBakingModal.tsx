import { useState } from 'react';

interface StartBakingModalProps {
  onClose: () => void;
  onSubmit: (data: { note?: string; sendPush: boolean }) => Promise<void>;
}

export default function StartBakingModal({ onClose, onSubmit }: StartBakingModalProps) {
  const [note, setNote] = useState('');
  const [sendPush, setSendPush] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ note: note.trim() || undefined, sendPush });
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Start Baking</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="note">
              Note (optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What are you baking?"
              rows={3}
              maxLength={200}
            />
            <div className="form-hint">{note.length}/200</div>
          </div>

          <div className="toggle">
            <div>
              <div className="toggle-label">Notify club</div>
              <div className="toggle-hint">Send a push to members who opted in</div>
            </div>
            <button
              type="button"
              className={`toggle-switch ${sendPush ? 'active' : ''}`}
              onClick={() => setSendPush(!sendPush)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Starting...' : 'Start Baking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
