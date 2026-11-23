import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SlotPicker } from "../components/SlotPicker";
import { ErrorState, Spinner } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { dayLabel, timeLabel, todayStr } from "../lib/format";
import { Doctor } from "../lib/types";

const STEPS = ["Date and time", "Reason", "Review and confirm"];

export default function Book() {
  const { id } = useParams(); const nav = useNavigate();
  const [d, setD] = useState<Doctor | null>(null); const [error, setError] = useState("");
  const [step, setStep] = useState(0); const [date, setDate] = useState(todayStr()); const [slot, setSlot] = useState("");
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [refresh, setRefresh] = useState(0);
  useEffect(() => { api.get(`/doctors/${id}`).then((r) => setD(r.data.doctor)).catch((e) => setError(errMsg(e))); }, [id]);
  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState message={error} /></div>;
  if (!d) return <Spinner />;
  const reasonOk = reason.trim().length >= 3;

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await api.post("/appointments", { doctor_id: d.id, start: slot, reason: reason.trim() });
      toast.success("Appointment requested");
      nav(`/appointments/${r.data.appointment.id}?confirmed=1`, { replace: true });
    } catch (e) {
      toast.error(errMsg(e));
      setSlot(""); setStep(0); setRefresh((k) => k + 1);  // slot was taken or invalid: reload real availability
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to={`/doctors/${d.id}`} className="text-sm text-primary">← Dr. {d.full_name}</Link>
      <h1 className="mt-2 text-3xl font-bold">Book an appointment</h1>
      <p className="text-muted">Dr. {d.full_name} · {d.specialty.name} · ₹{d.consultation_fee.toFixed(0)}</p>
      <ol className="mt-6 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (<li key={s} aria-current={i === step ? "step" : undefined} className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${i === step ? "border-primary bg-primary-soft font-semibold" : "border-line bg-white text-muted"}`}>
          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${i < step ? "bg-secondary text-white" : "bg-line"}`}>{i < step ? <Check size={12} /> : i + 1}</span><span className="hidden sm:inline">{s}</span></li>))}
      </ol>
      <div className="card mt-4 p-6">
        {step === 0 && <><h2 className="mb-4 text-lg font-bold">Choose a date and time</h2>
          <SlotPicker doctorId={d.id} date={date} onDate={setDate} slot={slot} onSlot={setSlot} refreshKey={refresh} />
          <button className="btn-primary mt-6" disabled={!slot} onClick={() => setStep(1)}>Continue</button></>}
        {step === 1 && <><h2 className="mb-4 text-lg font-bold">What brings you in?</h2>
          <label className="label" htmlFor="reason">Reason or symptoms</label>
          <textarea id="reason" className="input min-h-32" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: chest tightness when climbing stairs, for two weeks" />
          <div className="mt-1 flex justify-between text-xs text-muted"><span className={reason && !reasonOk ? "text-red-600" : ""}>{reason && !reasonOk ? "Please add a few more words" : "Shared only with your doctor"}</span><span>{reason.length}/500</span></div>
          <div className="mt-6 flex gap-2"><button className="btn-ghost" onClick={() => setStep(0)}>Back</button><button className="btn-primary" disabled={!reasonOk} onClick={() => setStep(2)}>Review</button></div></>}
        {step === 2 && <><h2 className="mb-4 text-lg font-bold">Review your appointment</h2>
          <dl className="divide-y divide-line text-sm">{([["Doctor", `Dr. ${d.full_name} (${d.specialty.name})`], ["Date", dayLabel(slot)], ["Time", timeLabel(slot)], ["Clinic", `${d.clinic_name}, ${d.address || d.location}`], ["Fee", `₹${d.consultation_fee.toFixed(0)}`], ["Reason", reason.trim()]] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>))}</dl>
          <p className="mt-4 rounded-xl bg-canvas p-3 text-sm text-muted">The doctor will confirm your request. You can reschedule or cancel from My Appointments.</p>
          <div className="mt-6 flex gap-2"><button className="btn-ghost" onClick={() => setStep(1)} disabled={busy}>Back</button><button className="btn-primary" onClick={confirm} disabled={busy}>{busy ? "Booking…" : "Confirm booking"}</button></div></>}
      </div>
    </div>
  );
}
