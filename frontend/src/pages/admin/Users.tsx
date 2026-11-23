import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Pager } from "../../components/Pager";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { ago } from "../../lib/format";
import { Role } from "../../lib/types";
import { usePaged } from "../../lib/usePaged";

interface U { id: number; email: string; role: Role; full_name: string; phone: string | null; is_active: boolean; created_at: string }

function UserTable({ title, fixedRole }: { title: string; fixedRole?: Role }) {
  const { user: me } = useAuth();
  const [q, setQ] = useState(""); const [role, setRole] = useState(""); const [active, setActive] = useState(""); const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null); const [ask, setAsk] = useState<U | null>(null); const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = usePaged<U>("/admin/users", { q, role: fixedRole ?? role, active, page, per_page: 10 });
  const toggle = async (u: U) => { setBusy(true); try { await api.put(`/admin/users/${u.id}`, { is_active: !u.is_active }); toast.success(u.is_active ? "Account deactivated" : "Account activated"); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); setAsk(null); } };
  return (
    <div><h1 className="text-3xl font-bold">{title}</h1>
      <form className="mt-5 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setQ(String(new FormData(e.currentTarget).get("q") ?? "").trim()); setPage(1); }}>
        <input name="q" aria-label="Search" placeholder="Name, email or phone" className="input max-w-xs" />
        {!fixedRole && <select aria-label="Role" className="input w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option><option value="patient">Patients</option><option value="doctor">Doctors</option><option value="admin">Admins</option></select>}
        <select aria-label="Account status" className="input w-auto" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}><option value="">Any status</option><option value="true">Active</option><option value="false">Deactivated</option></select>
        <button className="btn-ghost">Search</button></form>
      <div className="mt-4" aria-live="polite">{error ? <ErrorState message={error} onRetry={reload} /> : !data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No users found" hint="Try adjusting your search or filters." /> :
        <ul className={`card divide-y divide-line ${loading ? "opacity-60" : ""}`}>{data.items.map((u) => (
          <li key={u.id} className="p-4"><div className="flex flex-wrap items-center gap-3">
            <button className="min-w-0 flex-1 text-left" aria-expanded={open === u.id} onClick={() => setOpen(open === u.id ? null : u.id)}><p className="truncate font-semibold">{u.full_name} <span className="text-xs font-medium capitalize text-muted">· {u.role}</span></p><p className="truncate text-sm text-muted">{u.email}</p></button>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.is_active ? "bg-secondary-soft text-secondary-ink" : "bg-slate-100 text-slate-600"}`}>{u.is_active ? "Active" : "Deactivated"}</span>
            <button className="btn-ghost px-3 py-1.5" disabled={u.id === me?.id} onClick={() => u.is_active ? setAsk(u) : toggle(u)}>{u.is_active ? "Deactivate" : "Activate"}</button></div>
            {open === u.id && <dl className="mt-3 grid gap-2 rounded-xl bg-canvas p-3 text-sm sm:grid-cols-3"><div><dt className="text-muted">Phone</dt><dd>{u.phone ?? "–"}</dd></div><div><dt className="text-muted">Joined</dt><dd>{ago(u.created_at)}</dd></div>
              <div><dt className="text-muted">Appointments</dt><dd>{u.role === "patient" ? <Link className="text-primary" to={`/admin/appointments?patient_id=${u.id}`}>View appointments</Link> : "–"}</dd></div></dl>}</li>))}</ul>}</div>
      {data && <Pager data={data} onPage={setPage} />}
      <ConfirmDialog open={!!ask} danger busy={busy} title="Deactivate this account?" message={ask ? `${ask.full_name} will no longer be able to log in. Their data is kept.` : ""} confirmLabel="Deactivate" onCancel={() => setAsk(null)} onConfirm={() => ask && toggle(ask)} />
    </div>
  );
}
export const AdminPatients = () => <UserTable title="Patients" fixedRole="patient" />;
export const AdminUsers = () => <UserTable title="All users" />;
