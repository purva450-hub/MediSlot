import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export function NotFound() {
  return (<div className="mx-auto max-w-md px-4 py-24 text-center"><p className="font-display text-7xl font-extrabold text-primary">404</p>
    <h1 className="mt-2 text-2xl font-bold">We couldn't find that page</h1><p className="mt-2 text-muted">The link may be old, or the page hasn't been built yet.</p>
    <Link to="/" className="btn-primary mt-6">Back to home</Link></div>);
}

/** Temporary landing for /patient, /doctor, /admin until the dashboards are built in the next stage. */
export function RoleHome() {
  const { user } = useAuth();
  return (<div className="mx-auto max-w-2xl px-4 py-20"><h1 className="text-3xl font-bold">Welcome back, {user?.full_name}</h1>
    <p className="mt-2 text-muted">You're signed in as {user?.role}. Your dashboard is coming in the next build stage.</p></div>);
}
