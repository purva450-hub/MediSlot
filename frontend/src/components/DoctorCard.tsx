import { Clock, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Doctor } from "../lib/types";

export const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");
export const fmtDay = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export function DoctorCard({ d }: { d: Doctor }) {
  const na = d.next_available;
  return (
    <article className="card flex flex-col p-5">
      <div className="flex gap-4">
        {d.photo_url
          ? <img src={d.photo_url} alt={`Dr. ${d.full_name}`} className="h-16 w-16 rounded-2xl object-cover" />
          : <div aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-soft font-display text-xl font-extrabold text-primary">{initials(d.full_name)}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">Dr. {d.full_name}</h3>
          <p className="text-sm font-medium text-secondary-ink">{d.specialty.name}</p>
          <p className="truncate text-sm text-muted">{d.qualification} · {d.experience_years} yrs</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" />{d.rating.toFixed(1)}</span>
        <span className="inline-flex items-center gap-1"><MapPin size={14} />{d.location}</span>
        <span className="font-semibold text-ink">₹{d.consultation_fee.toFixed(0)}</span>
      </div>
      <div className="mt-4 min-h-[3.25rem] border-t border-line pt-3">
        {na ? (<>
          <p className="mb-2 inline-flex items-center gap-1 text-xs text-muted"><Clock size={12} />Next available · {fmtDay(na.date)}</p>
          <div className="flex flex-wrap gap-1.5">{na.slots.map((s) => <span key={s} className="rounded-lg bg-secondary-soft px-2 py-1 text-xs font-semibold text-secondary-ink">{s}</span>)}</div>
        </>) : <p className="text-sm text-muted">No openings in the next 7 days</p>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to={`/doctors/${d.id}`} className="btn-ghost">View profile</Link>
        <Link to={`/book/${d.id}`} className="btn-primary">Book appointment</Link>
      </div>
    </article>
  );
}
