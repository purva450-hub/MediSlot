import { Building2, CalendarOff, Clock, MapPin, Star, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fmtDay, initials } from "../components/DoctorCard";
import { ErrorState, Spinner } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { WEEKDAYS } from "../lib/format";
import { Doctor } from "../lib/types";

interface Avail { weekly: { id: number; weekday: number; start_time: string; end_time: string; break_start: string | null; break_end: string | null }[]; days_off: { id: number; date: string; reason: string | null }[] }

export default function DoctorProfile() {
  const { id } = useParams();
  const [d, setD] = useState<Doctor | null>(null); const [av, setAv] = useState<Avail | null>(null); const [error, setError] = useState("");
  useEffect(() => {
    setD(null); setError("");
    Promise.all([api.get(`/doctors/${id}`), api.get(`/doctors/${id}/availability`)])
      .then(([a, b]) => { setD(a.data.doctor); setAv(b.data); }).catch((e) => setError(e.response?.status === 404 ? "This doctor could not be found." : errMsg(e)));
  }, [id]);
  if (error) return <div className="mx-auto max-w-2xl px-4 py-16"><ErrorState message={error} /><div className="mt-4 text-center"><Link to="/doctors" className="btn-ghost">Back to doctors</Link></div></div>;
  if (!d) return <Spinner />;
  const na = d.next_available;
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <section className="card flex flex-col gap-5 p-6 sm:flex-row">
          {d.photo_url ? <img src={d.photo_url} alt={`Dr. ${d.full_name}`} className="h-28 w-28 rounded-3xl object-cover" />
            : <div aria-hidden className="grid h-28 w-28 shrink-0 place-items-center rounded-3xl bg-primary-soft font-display text-4xl font-extrabold text-primary">{initials(d.full_name)}</div>}
          <div>
            <h1 className="text-3xl font-bold">Dr. {d.full_name}</h1>
            <p className="font-medium text-secondary-ink">{d.specialty.name}</p>
            <p className="text-muted">{d.qualification} · {d.experience_years} years of experience</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1"><Star size={15} className="fill-amber-400 text-amber-400" />{d.rating.toFixed(1)} rating</span>
              <span className="inline-flex items-center gap-1"><Wallet size={15} />₹{d.consultation_fee.toFixed(0)} per consultation</span>
              <span className="inline-flex items-center gap-1"><Clock size={15} />{d.slot_minutes}-minute visits</span>
            </div>
          </div>
        </section>
        <section className="card p-6"><h2 className="text-xl font-bold">About</h2><p className="mt-2 text-muted">{d.about || "No description provided yet."}</p></section>
        <section className="card p-6"><h2 className="text-xl font-bold">Clinic</h2>
          <p className="mt-2 inline-flex items-center gap-2 font-medium"><Building2 size={16} />{d.clinic_name}</p>
          <p className="mt-1 inline-flex items-center gap-2 text-muted"><MapPin size={16} />{d.address || d.location}</p></section>
        <section className="card p-6"><h2 className="text-xl font-bold">Weekly schedule</h2>
          {av && av.weekly.length ? <dl className="mt-3 divide-y divide-line text-sm">{av.weekly.map((w) => (
            <div key={w.id} className="flex justify-between py-2"><dt className="font-medium">{WEEKDAYS[w.weekday]}</dt>
              <dd className="text-muted">{w.start_time}–{w.end_time}{w.break_start && ` (break ${w.break_start}–${w.break_end})`}</dd></div>))}</dl>
            : <p className="mt-2 text-sm text-muted">This doctor hasn't published working hours yet.</p>}
          {av && av.days_off.length > 0 && <div className="mt-4 rounded-xl bg-canvas p-3 text-sm"><p className="mb-1 inline-flex items-center gap-2 font-medium"><CalendarOff size={15} />Upcoming days off</p>
            <ul className="text-muted">{av.days_off.map((o) => <li key={o.id}>{fmtDay(o.date)}{o.reason && ` – ${o.reason}`}</li>)}</ul></div>}
        </section>
      </div>
      <aside className="card h-fit p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">Book a visit</h2>
        {na ? <><p className="mt-2 text-sm text-muted">Next available · {fmtDay(na.date)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{na.slots.map((s) => <span key={s} className="rounded-lg bg-secondary-soft px-2 py-1 text-xs font-semibold text-secondary-ink">{s}</span>)}</div></>
          : <p className="mt-2 text-sm text-muted">No openings in the next 14 days. You can still check later dates.</p>}
        <Link to={`/book/${d.id}`} className="btn-primary mt-5 w-full">Book appointment</Link>
        <p className="mt-3 text-xs text-muted">Fee: ₹{d.consultation_fee.toFixed(0)}, paid at the clinic.</p>
      </aside>
    </div>
  );
}
