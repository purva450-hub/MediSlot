import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SlotPicker } from "../components/SlotPicker";
import { ErrorState, Spinner } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { dayLabel, timeLabel, todayStr } from "../lib/format";
import { Appointment } from "../lib/types";

export default function Reschedule() {
  const { id } = useParams(); const nav = useNavigate();
  const [a, setA] = useState<Appointment | null>(null); const [error, setError] = useState("");
  const [date, setDate] = useState(todayStr()); const [slot, setSlot] = useState(""); const [busy, setBusy] = useState(false); const [refresh, setRefresh] = useState(0);
  useEffect(() => { api.get(`/appointments/${id}`).then((r) => { setA(r.data.appointment); setDate(r.data.appointment.start.slice(0, 10) < todayStr() ? todayStr() : r.data.appointment.start.slice(0, 10)); }).catch((e) => setError(errMsg(e))); }, [id]);
  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState message={error} /></div>;
  if (!a) return <Spinner />;
  const submit = async () => {
    setBusy(true);
    try { await api.post(`/appointments/${a.id}/reschedule`, { start: slot }); toast.success("Appointment rescheduled"); nav(`/appointments/${a.id}`, { replace: true }); }
    catch (e) { toast.error(errMsg(e)); setSlot(""); setRefresh((k) => k + 1); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to={`/appointments/${a.id}`} className="text-sm text-primary">← Appointment {a.booking_code}</Link>
      <h1 className="mt-2 text-3xl font-bold">Reschedule appointment</h1>
      <p className="text-muted">Currently {dayLabel(a.start)} at {timeLabel(a.start)} with Dr. {a.doctor.full_name}. Your old slot is released once the new one is saved.</p>
      <div className="card mt-6 p-6"><SlotPicker doctorId={a.doctor.id} date={date} onDate={setDate} slot={slot} onSlot={setSlot} refreshKey={refresh} />
        <button className="btn-primary mt-6" disabled={!slot || busy} onClick={submit}>{busy ? "Saving…" : slot ? `Move to ${timeLabel(slot)}` : "Choose a new time"}</button>
        <p className="mt-3 text-xs text-muted">A rescheduled appointment goes back to "pending" until the doctor confirms.</p></div>
    </div>
  );
}
