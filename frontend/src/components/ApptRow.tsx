import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { shortDay, timeLabel } from "../lib/format";
import { Appointment } from "../lib/types";
import { StatusBadge } from "../pages/AppointmentDetail";

/** Shows the doctor to patients and the patient to doctors/admins. */
export function ApptRow({ a }: { a: Appointment }) {
  const { user } = useAuth(); const asPatient = user?.role === "patient";
  return (
    <Link to={`/appointments/${a.id}`} className="flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-primary-soft/50">
      <div className="w-16 shrink-0 rounded-xl bg-canvas py-1.5 text-center"><p className="text-xs text-muted">{shortDay(a.start).split(" ")[0]}</p><p className="font-display text-lg font-bold leading-none">{a.start.slice(8, 10)}</p></div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{asPatient ? `Dr. ${a.doctor.full_name}` : a.patient.full_name}</p>
        <p className="truncate text-sm text-muted">{timeLabel(a.start)} · {asPatient ? `${a.doctor.specialty} · ${shortDay(a.start)}` : a.reason}</p>
      </div>
      <StatusBadge s={a.status} />
    </Link>
  );
}
