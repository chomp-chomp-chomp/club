'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import TabBar from '@/components/TabBar';
import { api } from '@/lib/client-utils';

interface Member {
  id: string;
  display_name: string;
  is_admin: boolean;
  notification_prefs: {
    bake_started: boolean;
    recipe_dropped: boolean;
    club_call: boolean;
  };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api<Member>('/auth/me');
        setMember(data);
      } catch {
        router.push('/onboarding');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '40vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
