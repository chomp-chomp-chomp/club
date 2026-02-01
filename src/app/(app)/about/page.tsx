'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="container">
      <Link href="/settings" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← Back
      </Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">About Chomp Club</h1>
      </header>

      <section className="section">
        <h2 className="section-title">What is Chomp Club?</h2>
        <div className="card">
          <p style={{ marginBottom: '12px' }}>
            Chomp Club is a quiet baking club for friends. It is not a social network.
            There are no likes, no comments on bakes, no engagement metrics.
          </p>
          <p>
            Instead, you feel the ambient presence of your club members. Someone is baking.
            A new recipe dropped. There is a club call this weekend.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">How It Works</h2>
        <div className="card">
          <p style={{ marginBottom: '12px' }}>
            <strong>Pulses:</strong> The home screen shows activity from the last 72 hours.
            When you start baking, you create a pulse. Recipes dropped by the club also
            appear here.
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong>Recipes:</strong> A curated shelf of recipes chosen by the club admin.
            No algorithm, just intentional curation.
          </p>
          <p>
            <strong>Bulletin:</strong> A temporary chalkboard. Posts expire in 7 days.
            Maximum 7 replies per post. Brief, ephemeral, calm.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">iPhone Notes</h2>
        <div className="card">
          <p style={{ marginBottom: '12px' }}>
            For the best experience on iPhone, add Chomp Club to your Home Screen:
          </p>
          <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>Tap the Share button in Safari</li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" to confirm</li>
            <li>Open the app from your Home Screen</li>
          </ol>
          <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>
            Push notifications only work when the app is installed to your Home Screen.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Troubleshooting</h2>
        <div className="card">
          <p style={{ marginBottom: '12px' }}>
            <strong>Not receiving notifications?</strong>
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>Make sure the app is installed to your Home Screen</li>
            <li>Check that notifications are enabled in Settings → Notifications</li>
            <li>Try the "Re-enable notifications" button in Settings</li>
            <li>On iPhone, check Settings → Chomp Club → Notifications</li>
          </ul>
          <p style={{ marginTop: '16px', marginBottom: '12px' }}>
            <strong>App not loading?</strong>
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>Check your internet connection</li>
            <li>Try closing and reopening the app</li>
            <li>Clear browser cache if using Safari</li>
          </ul>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Made with care for the baking community.
      </footer>
    </main>
  );
}
