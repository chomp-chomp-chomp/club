'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Home' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/bulletin', label: 'Bulletin' },
  { href: '/settings', label: 'Settings' },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tab-bar">
      {tabs.map((tab) => {
        const isActive =
          tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab-item ${isActive ? 'active' : ''}`}
          >
            <span className="tab-icon" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
