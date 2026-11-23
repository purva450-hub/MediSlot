import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { api, errMsg } from "../lib/api";
import { timeLabel } from "../lib/format";
import { Appointment } from "../lib/types";
import { StatusBadge } from "../pages/AppointmentDetail";

/** One appointment in a doctor's list, with one-tap confirm / reject for pending requests. */
export function DoctorApptRow({ a, onChanged }: { a: Appointment; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (status: "confirmed" | "rejected") => {
    setBusy(true);
    try { await api.put(`/appointments/${a.id}`, { status }); toast.success(status === "confirmed" ? "Appointment confirmed" : "Appointment rejected"); onChanged(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-3 hover:bg-primary-soft/40">
      <div className="w-20 shrink-0 font-display font-bold">{timeLabel(a.start)}</div>
      <Link to={`/appointments/${a.id}`} className="min-w-0 flex-1"><p className="truncate font-semibold">{a.patient.full_name}</p><p className="truncate text-sm text-muted">{a.reason}</p></Link>
      <StatusBadge s={a.status} />
      {a.status === "pending" && <div className="flex gap-2"><button className="btn-primary px-3 py-1.5" disabled={busy} onClick={() => act("confirmed")}>Confirm</button>
        <button className="btn-ghost px-3 py-1.5" disabled={busy} onClick={() => act("rejected")}>Reject</button></div>}
    </div>
  );
}
