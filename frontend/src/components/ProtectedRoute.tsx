import { ShieldAlert } from "lucide-react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Role, dashboardPath } from "../lib/types";
import { Spinner } from "./ui";

/** UI guard only - the Flask API enforces the same roles on every request. */
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role))
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center"><ShieldAlert className="mx-auto text-red-500" size={36} />
        <h1 className="mt-3 text-2xl font-bold">You don't have access to this page</h1>
        <p className="mt-2 text-muted">This area is for {roles.join(" / ")} accounts.</p>
        <Link to={dashboardPath(user.role)} className="btn-primary mt-6">Go to my dashboard</Link></div>
    );
  return <Outlet />;
}
