import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ErrorState, Spinner } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { dayLabel, timeLabel } from "../lib/format";
import { Appointment, ApptStatus, dashboardPath } from "../lib/types";

const TONE: Record<ApptStatus, string> = { pending: "bg-amber-100 text-amber-800", confirmed: "bg-secondary-soft text-secondary-ink", completed: "bg-primary-soft text-primary",
  cancelled: "bg-slate-100 text-slate-600", rejected: "bg-red-100 text-red-700" };
export const StatusBadge = ({ s }: { s: ApptStatus }) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${TONE[s]}`}>{s}</span>;

export default function AppointmentDetail() {
  const { id } = useParams(); const { user } = useAuth(); const [q] = useSearchParams();
  const [a, setA] = useState<Appointment | null>(null); const [error, setError] = useState(""); const [ask, setAsk] = useState(false); const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api.get(`/appointments/${id}`).then((r) => setA(r.data.appointment)).catch((e) => setError(errMsg(e))); }, [id]);
  useEffect(load, [load]);
  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState message={error} onRetry={load} /></div>;
  if (!a || !user) return <Spinner />;
  const active = a.status === "pending" || a.status === "confirmed";
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); setAsk(false); load(); } catch (e) { toast.error(errMsg(e)); setAsk(false); } finally { setBusy(false); }
  };
  const setStatus = (status: string, ok: string) => act(() => api.put(`/appointments/${a.id}`, { status }), ok);
  const rows: [string, string][] = [["Appointment ID", a.booking_code], ["Patient", a.patient.full_name], ...(a.patient.phone ? [["Patient phone", a.patient.phone] as [string, string]] : []),
    ["Doctor", `Dr. ${a.doctor.full_name}`], ["Specialty", a.doctor.specialty], ["Date", dayLabel(a.start)], ["Time", `${timeLabel(a.start)} – ${timeLabel(a.end)}`],
    ["Consultation fee", `₹${a.consultation_fee.toFixed(0)}`], ["Clinic", `${a.doctor.clinic_name}, ${a.doctor.address || a.doctor.location}`], ["Reason", a.reason]];
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {q.get("confirmed") && <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl bg-secondary-soft p-4 text-secondary-ink"><CheckCircle2 className="mt-0.5 shrink-0" />
        <div><p className="font-bold">Your appointment request is in</p><p className="text-sm">Booking ID {a.booking_code}. You'll be notified when the doctor confirms.</p></div></div>}
      <div className="card p-6">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Appointment details</h1><StatusBadge s={a.status} /></div>
        <dl className="mt-4 divide-y divide-line text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-6 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl>
        {a.status === "cancelled" && <p className="mt-4 rounded-xl bg-canvas p-3 text-sm text-muted">Cancelled by the {a.cancelled_by}{a.cancel_reason && `: ${a.cancel_reason}`}.</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          {user.role === "patient" && active && <Link to={`/appointments/${a.id}/reschedule`} className="btn-ghost">Reschedule</Link>}
          {active && <button className="btn-ghost text-red-600" onClick={() => setAsk(true)}>Cancel appointment</button>}
          {user.role !== "patient" && a.status === "pending" && <><button className="btn-primary" disabled={busy} onClick={() => setStatus("confirmed", "Appointment confirmed")}>Confirm</button>
            <button className="btn-ghost" disabled={busy} onClick={() => setStatus("rejected", "Appointment rejected")}>Reject</button></>}
          {user.role !== "patient" && a.status === "confirmed" && <button className="btn-primary" disabled={busy} onClick={() => setStatus("completed", "Marked completed")}>Mark completed</button>}
        </div>
        {q.get("confirmed") && <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4"><Link to={dashboardPath(user.role)} className="btn-primary">Go to dashboard</Link><Link to="/doctors" className="btn-ghost">Book another appointment</Link></div>}
      </div>
      <ConfirmDialog open={ask} danger busy={busy} title="Cancel this appointment?" message="The time slot will be released for other patients. This can't be undone." confirmLabel="Cancel appointment"
        onCancel={() => setAsk(false)} onConfirm={() => act(() => api.post(`/appointments/${a.id}/cancel`, {}), "Appointment cancelled")} />
    </div>
  );
}
