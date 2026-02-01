'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/recipes', label: 'Recipes', icon: '📖' },
  { href: '/bulletin', label: 'Bulletin', icon: '📌' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
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
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
