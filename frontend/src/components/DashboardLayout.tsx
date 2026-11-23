import { Bell, CalendarClock, ClipboardList, ShieldCheck, Tags, UserCog, Users, CalendarDays, LayoutDashboard, LogOut, Menu, Search, Settings, UserRound, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Role } from "../lib/types";
import { Logo } from "./Logo";

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean };
const NAV: Partial<Record<Role, Item[]>> = {
  patient: [
    { to: "/patient", label: "Dashboard", icon: LayoutDashboard, end: true }, { to: "/doctors", label: "Find doctors", icon: Search },
    { to: "/patient/appointments", label: "My appointments", icon: CalendarDays }, { to: "/patient/notifications", label: "Notifications", icon: Bell },
    { to: "/patient/profile", label: "My profile", icon: UserRound }, { to: "/patient/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true }, { to: "/admin/doctors", label: "Doctors", icon: Stethoscope },
    { to: "/admin/patients", label: "Patients", icon: Users }, { to: "/admin/appointments", label: "Appointments", icon: ClipboardList },
    { to: "/admin/specialties", label: "Specialties", icon: Tags }, { to: "/admin/users", label: "Users", icon: UserCog }, { to: "/admin/settings", label: "Settings", icon: ShieldCheck },
  ],
  doctor: [
    { to: "/doctor", label: "Dashboard", icon: LayoutDashboard, end: true }, { to: "/doctor/appointments", label: "My appointments", icon: CalendarDays },
    { to: "/doctor/availability", label: "Manage availability", icon: CalendarClock }, { to: "/doctor/profile", label: "My profile", icon: UserRound },
    { to: "/doctor/notifications", label: "Notifications", icon: Bell }, { to: "/doctor/settings", label: "Settings", icon: Settings },
  ],
  doctor: [
    { to: "/doctor", label: "Dashboard", icon: LayoutDashboard, end: true }, { to: "/doctor/appointments", label: "My appointments", icon: CalendarDays },
    { to: "/doctor/availability", label: "Manage availability", icon: CalendarClock }, { to: "/doctor/profile", label: "My profile", icon: Stethoscope },
    { to: "/doctor/notifications", label: "Notifications", icon: Bell }, { to: "/doctor/settings", label: "Settings", icon: Settings },
  ],
};

function BellLink({ to }: { to: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const f = () => api.get("/notifications", { params: { per_page: 1 } }).then((r) => setN(r.data.unread_count)).catch(() => undefined);
    f(); const t = setInterval(f, 60000); window.addEventListener("notifications:changed", f);
    return () => { clearInterval(t); window.removeEventListener("notifications:changed", f); };
  }, []);
  return (<Link to={to} aria-label={`Notifications, ${n} unread`} className="relative rounded-xl border border-line bg-white p-2.5"><Bell size={18} />
    {n > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{n > 9 ? "9+" : n}</span>}</Link>);
}

export function DashboardLayout() {
  const { user, logout } = useAuth(); const nav = useNavigate(); const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = NAV[user.role] ?? [];
  const cls = ({ isActive }: { isActive: boolean }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-primary text-white" : "text-muted hover:bg-primary-soft hover:text-ink"}`;
  const out = async () => { await logout(); nav("/"); };
  const side = (<>
    <Link to="/" className="mb-6 block px-2"><Logo /></Link>
    <nav className="flex-1 space-y-1">{items.map((i) => <NavLink key={i.to} to={i.to} end={i.end} className={cls} onClick={() => setOpen(false)}><i.icon size={18} />{i.label}</NavLink>)}</nav>
    <button onClick={out} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"><LogOut size={18} />Log out</button></>);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white p-4 lg:flex">{side}</aside>
      {open && <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}><aside className="flex h-full w-64 flex-col bg-white p-4" onClick={(e) => e.stopPropagation()}>{side}</aside></div>}
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4">
          <button className="rounded-lg p-2 lg:hidden" aria-label="Open menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
          <span className="hidden text-sm text-muted lg:block">{user.full_name}</span>
          <div className="flex items-center gap-2">{user.role === "patient" && <Link to="/doctors" className="btn-primary">Book appointment</Link>}{user.role !== "admin" && <BellLink to={`/${user.role}/notifications`} />}</div>
        </header>
        <main className="mx-auto max-w-5xl p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
