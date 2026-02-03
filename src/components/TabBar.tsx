import { NavLink } from 'react-router-dom';

const tabs = [
  { href: '/', label: 'Home' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/bulletin', label: 'Bulletin' },
  { href: '/settings', label: 'Settings' },
];

export default function TabBar() {
  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <NavLink
          key={tab.href}
          to={tab.href}
          className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
          end={tab.href === '/'}
        >
          <span className="tab-icon" aria-hidden="true" />
          <span className="tab-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
