import { Link } from 'react-router-dom';

export default function Admin() {
  return (
    <div className="container">
      <Link to="/settings" className="back-link">← Back to Settings</Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Club management</p>
      </header>

      <section className="section">
        <h2 className="section-title">Content</h2>
        <Link to="/admin/drop-recipe" className="card admin-link">
          <div className="card-title">Drop Recipe</div>
          <div className="card-meta">Share a new recipe with the club</div>
        </Link>
        <Link to="/admin/club-call" className="card admin-link">
          <div className="card-title">Send Club Call</div>
          <div className="card-meta">Send an announcement to all members</div>
        </Link>
        <Link to="/admin/shelf" className="card admin-link">
          <div className="card-title">Curate Shelf</div>
          <div className="card-meta">Manage the recipe shelf</div>
        </Link>
      </section>

      <section className="section">
        <h2 className="section-title">Moderation</h2>
        <Link to="/admin/members" className="card admin-link">
          <div className="card-title">Members</div>
          <div className="card-meta">View and manage club members</div>
        </Link>
        <Link to="/admin/activity" className="card admin-link">
          <div className="card-title">Activity</div>
          <div className="card-meta">View and delete all pulses</div>
        </Link>
        <Link to="/admin/bulletins" className="card admin-link">
          <div className="card-title">Bulletins</div>
          <div className="card-meta">Moderate bulletin posts</div>
        </Link>
      </section>

      <section className="section">
        <h2 className="section-title">Access</h2>
        <Link to="/admin/invite-codes" className="card admin-link">
          <div className="card-title">Invite Codes</div>
          <div className="card-meta">Generate and manage invite codes</div>
        </Link>
      </section>
    </div>
  );
}
