import { Outlet, NavLink } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app-container">
      <main className="main-content">
        <Outlet />
      </main>

      <nav className="tab-bar">
        <NavLink to="/" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`} end>
          <span className="tab-icon">🏠</span>
          <span className="tab-label">Home</span>
        </NavLink>
        <NavLink to="/recipes" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <span className="tab-icon">📜</span>
          <span className="tab-label">Recipes</span>
        </NavLink>
        <NavLink to="/bulletin" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <span className="tab-icon">📋</span>
          <span className="tab-label">Bulletin</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">Settings</span>
        </NavLink>
      </nav>
    </div>
  );
}
