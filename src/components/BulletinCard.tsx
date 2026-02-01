'use client';

import Link from 'next/link';
import { formatRelativeTime, formatExpiry } from '@/lib/utils';

interface BulletinCardProps {
  bulletin: {
    id: string;
    content: string;
    member_name: string;
    reply_count: number;
    created_at: string;
    expires_at: string;
  };
}

export default function BulletinCard({ bulletin }: BulletinCardProps) {
  return (
    <Link href={`/bulletin/${bulletin.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      <div className="card-header">
        <div>
          <div className="card-title">{bulletin.member_name}</div>
          <div className="card-meta">
            {formatRelativeTime(bulletin.created_at)} · {formatExpiry(bulletin.expires_at)}
          </div>
        </div>
      </div>
      <div className="card-body" style={{ marginTop: '8px' }}>
        {bulletin.content}
      </div>
      {bulletin.reply_count > 0 && (
        <div className="card-meta" style={{ marginTop: '8px' }}>
          {bulletin.reply_count} {bulletin.reply_count === 1 ? 'reply' : 'replies'}
        </div>
      )}
    </Link>
  );
}
