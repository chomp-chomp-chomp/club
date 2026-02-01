'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client-utils';

interface Member {
  id: string;
  display_name: string;
  is_admin: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const data = await api<Member>('/auth/me');
        if (!data.is_admin) {
          router.push('/');
          return;
        }
        setMember(data);
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  if (loading || !member) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '40vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const adminLinks = [
    { href: '/admin/drop-recipe', label: 'Drop Recipe', icon: '📜', desc: 'Share a new recipe with the club' },
    { href: '/admin/club-call', label: 'Send Club Call', icon: '🧺', desc: 'Announce to all members' },
    { href: '/admin/shelf', label: 'Curate Shelf', icon: '📚', desc: 'Manage the recipe shelf' },
    { href: '/admin/members', label: 'Members', icon: '👥', desc: 'View and manage members' },
    { href: '/admin/bulletins', label: 'Bulletins', icon: '📌', desc: 'Moderate bulletin board' },
    { href: '/admin/invite-codes', label: 'Invite Codes', icon: '🎫', desc: 'Generate and manage codes' },
  ];

  return (
    <main className="container">
      <header className="page-header">
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Club management</p>
      </header>

      <Link
        href="/"
        style={{ display: 'inline-block', marginBottom: '24px', color: 'var(--color-text-muted)' }}
      >
        ← Back to club
      </Link>

      <div>
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: 'inherit' }}
          >
            <span style={{ fontSize: '1.5rem' }}>{link.icon}</span>
            <div>
              <div className="card-title">{link.label}</div>
              <div className="card-meta">{link.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
