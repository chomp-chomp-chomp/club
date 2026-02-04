import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Recipes from './pages/Recipes';
import Bulletin from './pages/Bulletin';
import BulletinDetail from './pages/BulletinDetail';
import Settings from './pages/Settings';
import About from './pages/About';
import Admin from './pages/admin/Admin';
import AdminDropRecipe from './pages/admin/DropRecipe';
import AdminClubCall from './pages/admin/ClubCall';
import AdminShelf from './pages/admin/Shelf';
import AdminMembers from './pages/admin/Members';
import AdminBulletins from './pages/admin/Bulletins';
import AdminInviteCodes from './pages/admin/InviteCodes';
import AdminActivity from './pages/admin/Activity';
import MagicLink from './pages/MagicLink';
import { initSoundHandler, addPendingSound, playSound } from './lib/sounds';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { member, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!member) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { member, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!member?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/magic" element={<MagicLink />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="bulletin" element={<Bulletin />} />
        <Route path="bulletin/:id" element={<BulletinDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="about" element={<About />} />
      </Route>

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/drop-recipe"
        element={
          <AdminRoute>
            <AdminDropRecipe />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/club-call"
        element={
          <AdminRoute>
            <AdminClubCall />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/shelf"
        element={
          <AdminRoute>
            <AdminShelf />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/members"
        element={
          <AdminRoute>
            <AdminMembers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/bulletins"
        element={
          <AdminRoute>
            <AdminBulletins />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/invite-codes"
        element={
          <AdminRoute>
            <AdminInviteCodes />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/activity"
        element={
          <AdminRoute>
            <AdminActivity />
          </AdminRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    // Initialize sound handler
    initSoundHandler();

    // Check for sound parameter in URL (from notification click)
    const params = new URLSearchParams(window.location.search);
    const soundParam = params.get('sound');
    if (soundParam && ['club_call', 'recipe_dropped', 'bake_started'].includes(soundParam)) {
      // Small delay to ensure audio context is ready
      setTimeout(() => {
        playSound(soundParam as 'club_call' | 'recipe_dropped' | 'bake_started');
      }, 300);
      // Clean up URL
      params.delete('sound');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PENDING_SOUND' && event.data.sound) {
          addPendingSound(event.data.sound);
        }
        if (event.data?.type === 'PLAY_SOUND' && event.data.sound) {
          playSound(event.data.sound);
        }
      });
    }
  }, []);

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
