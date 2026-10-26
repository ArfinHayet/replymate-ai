import { Link } from 'react-router';

export function NotFoundPage() {
  return <section className="dashboard-content">
    <h1>Page not found</h1>
    <p className="muted">The admin page you requested does not exist.</p>
    <Link className="button primary" to="/users">Back to users</Link>
  </section>;
}
