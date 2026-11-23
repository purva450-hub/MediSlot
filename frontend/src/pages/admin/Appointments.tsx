import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Pager } from "../../components/Pager";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { StatusBadge } from "../AppointmentDetail";
import { api, errMsg } from "../../lib/api";
import { shortDay, timeLabel } from "../../lib/format";
import { Appointment } from "../../lib/types";
import { usePaged } from "../../lib/usePaged";
import { AdminDoctor } from "./Doctors";

export default function AdminAppointments() {
  const [sp, setSp] = useSearchParams(); const [page, setPage] = useState(1);
  const f = { status: sp.get("status") ?? "", doctor_id: sp.get("doctor_id") ?? "", date: sp.get("date") ?? "", q: sp.get("q") ?? "", patient_id: sp.get("patient_id") ?? "" };
  const { data, error, loading, reload } = usePaged<Appointment>("/admin/appointments", { ...f, page, per_page: 10 });
  const docs = usePaged<AdminDoctor>("/admin/doctors", { per_page: 50 }).data?.items ?? [];
  const [ask, setAsk] = useState<Appointment | null>(null); const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); setPage(1); };
  const cancel = async () => { if (!ask) return; setBusy(true); try { await api.post(`/appointments/${ask.id}/cancel`, { reason: "Cancelled by administrator" }); toast.success("Appointment cancelled"); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); setAsk(null); } };
  return (
    <div><h1 className="text-3xl font-bold">Appointments</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        <form onSubmit={(e) => { e.preventDefault(); set("q", String(new FormData(e.currentTarget).get("q") ?? "").trim()); }} className="flex gap-2"><input name="q" key={f.q} defaultValue={f.q} aria-label="Booking ID" placeholder="Booking ID" className="input w-40" /><button className="btn-ghost">Find</button></form>
        <select aria-label="Status" className="input w-auto" value={f.status} onChange={(e) => set("status", e.target.value)}><option value="">All statuses</option>{["pending", "confirmed", "completed", "cancelled", "rejected"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}</select>
        <select aria-label="Doctor" className="input w-auto" value={f.doctor_id} onChange={(e) => set("doctor_id", e.target.value)}><option value="">All doctors</option>{docs.map((d) => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}</select>
        <input type="date" aria-label="Date" className="input w-auto" value={f.date} onChange={(e) => set("date", e.target.value)} />
        {f.patient_id && <button className="btn-ghost" onClick={() => set("patient_id", "")}>Patient #{f.patient_id} ✕</button>}
        {(f.status || f.doctor_id || f.date || f.q) && <button className="btn-ghost" onClick={() => setSp(new URLSearchParams(f.patient_id ? { patient_id: f.patient_id } : {}))}>Clear filters</button>}</div>
      <div className="mt-4" aria-live="polite">{error ? <ErrorState message={error} onRetry={reload} /> : !data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No appointments found" hint="Try adjusting the filters." /> :
        <ul className={`card divide-y divide-line ${loading ? "opacity-60" : ""}`}>{data.items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 p-4">
            <Link to={`/appointments/${a.id}`} className="min-w-0 flex-1 hover:text-primary"><p className="truncate font-semibold">{a.patient.full_name} → Dr. {a.doctor.full_name}</p>
              <p className="truncate text-sm text-muted">{shortDay(a.start)} · {timeLabel(a.start)} · {a.booking_code}</p></Link>
            <StatusBadge s={a.status} />{(a.status === "pending" || a.status === "confirmed") && <button className="btn-ghost px-3 py-1.5 text-red-600" onClick={() => setAsk(a)}>Cancel</button>}</li>))}</ul>}</div>
      {data && <Pager data={data} onPage={setPage} />}
      <ConfirmDialog open={!!ask} danger busy={busy} title="Cancel this appointment?" message={ask ? `${ask.booking_code} for ${ask.patient.full_name} will be cancelled and both people notified.` : ""} confirmLabel="Cancel appointment" onCancel={() => setAsk(null)} onConfirm={cancel} />
    </div>
  );
}
