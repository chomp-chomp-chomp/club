import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="container">
      <Link to="/settings" className="back-link">← Back</Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">About Club Chomp</h1>
      </header>

      <section className="section">
        <h2 className="section-title">What is Club Chomp?</h2>
        <div className="card">
          <p>
            Club Chomp is a quiet baking club for friends. It&apos;s designed to be calm
            and intentional, not addictive or engagement-driven.
          </p>
          <p style={{ marginTop: '12px' }}>
            You&apos;ll feel the ambient presence of your fellow bakers through
            gentle pulses—when someone starts baking, when a new recipe drops,
            or when there&apos;s a club call.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">How It Works</h2>
        <div className="card">
          <p><strong>Pulses</strong> — The home screen shows the last 72 hours of
          club activity. Start baking to add your own pulse.</p>
          <p style={{ marginTop: '12px' }}><strong>Recipes</strong> — A curated
          shelf of recipes, hand-picked by the club. No algorithmic feeds.</p>
          <p style={{ marginTop: '12px' }}><strong>Bulletin</strong> — An ephemeral
          chalkboard where posts expire after 7 days. Maximum 7 replies per post.</p>
          <p style={{ marginTop: '12px' }}><strong>Notifications</strong> — Only 3
          types: recipe drops, club calls, and bake alerts (optional). No spam.</p>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">iPhone Notes</h2>
        <div className="card">
          <p><strong>Add to Home Screen</strong> — For the best experience and
          push notifications on iPhone, add this app to your Home Screen.</p>
          <ol style={{ paddingLeft: '20px', marginTop: '12px', lineHeight: '2' }}>
            <li>Tap the Share button in Safari</li>
            <li>Scroll and tap "Add to Home Screen"</li>
            <li>Tap "Add"</li>
            <li>Open from your Home Screen</li>
          </ol>
          <p style={{ marginTop: '12px' }}>
            Push notifications require iOS 16.4 or later and opening the app
            from your Home Screen.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Troubleshooting</h2>
        <div className="card">
          <p><strong>Not receiving notifications?</strong></p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px', lineHeight: '1.8' }}>
            <li>Make sure you opened the app from your Home Screen, not Safari</li>
            <li>Check Settings → Notifications → Club Chomp</li>
            <li>Try the "Re-enable notifications" button in Settings</li>
            <li>Make sure you have iOS 16.4 or later</li>
          </ul>

          <p style={{ marginTop: '16px' }}><strong>App not loading?</strong></p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px', lineHeight: '1.8' }}>
            <li>Check your internet connection</li>
            <li>Try closing and reopening the app</li>
            <li>Clear Safari cache if using the web version</li>
          </ul>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
        <p>Version 1.0.0</p>
        <p style={{ marginTop: '8px' }}>Made with love for bakers</p>
      </footer>
    </div>
  );
}
