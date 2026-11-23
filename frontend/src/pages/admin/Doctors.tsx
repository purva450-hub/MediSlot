import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Pager } from "../../components/Pager";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { usePaged } from "../../lib/usePaged";
import { Doctor } from "../../lib/types";

export type AdminDoctor = Omit<Doctor, "next_available"> & { email: string; phone: string | null; is_active: boolean; user_id: number; approval_status: string };
const TONE: Record<string, string> = { approved: "bg-secondary-soft text-secondary-ink", pending: "bg-amber-100 text-amber-800", rejected: "bg-red-100 text-red-700" };

export default function AdminDoctors() {
  const [sp, setSp] = useSearchParams(); const [page, setPage] = useState(1);
  const status = sp.get("status") ?? "", q = sp.get("q") ?? "", specialty_id = sp.get("specialty_id") ?? "";
  const { data, error, loading, reload } = usePaged<AdminDoctor>("/admin/doctors", { status, q, specialty_id, page, per_page: 10 });
  const [ask, setAsk] = useState<{ title: string; message: string; label: string; fn: () => Promise<unknown>; ok: string } | null>(null); const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast.success(ok); setAsk(null); reload(); } catch (e) { toast.error(errMsg(e)); setAsk(null); } finally { setBusy(false); } };
  const approval = (d: AdminDoctor, s: string) => run(() => api.put(`/admin/doctors/${d.id}/approval`, { status: s }), `Doctor ${s}`);
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); setPage(1); };
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Doctors</h1><Link to="/admin/doctors/new" className="btn-primary">Add doctor</Link></div>
      <form className="mt-5 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setParam("q", String(new FormData(e.currentTarget).get("q") ?? "").trim()); }}>
        <input name="q" key={q} defaultValue={q} aria-label="Search doctors" placeholder="Search by name" className="input max-w-xs" />
        <select aria-label="Approval status" className="input w-auto" value={status} onChange={(e) => setParam("status", e.target.value)}><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
        <button className="btn-ghost">Search</button>{specialty_id && <button type="button" className="btn-ghost" onClick={() => setParam("specialty_id", "")}>Clear specialty filter ✕</button>}</form>
      <div className="mt-4" aria-live="polite">{error ? <ErrorState message={error} onRetry={reload} /> : !data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No doctors found" hint="Try different filters, or add a doctor." /> :
        <ul className={`space-y-3 ${loading ? "opacity-60" : ""}`}>{data.items.map((d) => (
          <li key={d.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="min-w-0 flex-1"><p className="truncate font-bold">Dr. {d.full_name}</p><p className="truncate text-sm text-muted">{d.specialty.name} · {d.location} · {d.email}</p>
              <div className="mt-1 flex gap-2 text-xs font-semibold"><span className={`rounded-full px-2 py-0.5 capitalize ${TONE[d.approval_status]}`}>{d.approval_status}</span>
                <span className={`rounded-full px-2 py-0.5 ${d.is_active ? "bg-primary-soft text-primary" : "bg-slate-100 text-slate-600"}`}>{d.is_active ? "Active" : "Deactivated"}</span></div></div>
            <div className="flex flex-wrap gap-2">
              {d.approval_status !== "approved" && <button className="btn-primary px-3 py-1.5" onClick={() => approval(d, "approved")}>Approve</button>}
              {d.approval_status !== "rejected" && <button className="btn-ghost px-3 py-1.5" onClick={() => setAsk({ title: "Reject this doctor?", message: "They will be hidden from patients. Existing appointments are not changed.", label: "Reject", fn: () => api.put(`/admin/doctors/${d.id}/approval`, { status: "rejected" }), ok: "Doctor rejected" })}>Reject</button>}
              <button className="btn-ghost px-3 py-1.5" onClick={() => d.is_active ? setAsk({ title: "Deactivate this account?", message: "The doctor can no longer log in or receive bookings.", label: "Deactivate", fn: () => api.put(`/admin/users/${d.user_id}`, { is_active: false }), ok: "Account deactivated" })
                : run(() => api.put(`/admin/users/${d.user_id}`, { is_active: true }), "Account activated")}>{d.is_active ? "Deactivate" : "Activate"}</button>
              <Link to={`/admin/doctors/${d.id}/edit`} className="btn-ghost px-3 py-1.5">Edit</Link>
              {d.approval_status === "approved" && <Link to={`/doctors/${d.id}`} className="btn-ghost px-3 py-1.5">View</Link>}</div></li>))}</ul>}</div>
      {data && <Pager data={data} onPage={setPage} />}
      <ConfirmDialog open={!!ask} danger busy={busy} title={ask?.title ?? ""} message={ask?.message ?? ""} confirmLabel={ask?.label ?? ""} onCancel={() => setAsk(null)} onConfirm={() => ask && run(ask.fn, ask.ok)} />
    </div>
  );
}
