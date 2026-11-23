import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, errMsg } from "../lib/api";
import { addDays, timeLabel, todayStr } from "../lib/format";
import { Appointment, ApptStatus } from "../lib/types";
import { ErrorState } from "./ui";

const monday = (d: string) => { const x = new Date(d + "T00:00:00"); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toLocaleDateString("en-CA"); };
const EDGE: Record<ApptStatus, string> = { pending: "border-amber-400", confirmed: "border-secondary", completed: "border-primary", cancelled: "border-slate-300 opacity-60", rejected: "border-red-300 opacity-60" };

/** Calendar view: one column per day (stacked on mobile). */
export function WeekBoard() {
  const [start, setStart] = useState(monday(todayStr()));
  const [items, setItems] = useState<Appointment[] | null>(null); const [total, setTotal] = useState(0); const [error, setError] = useState("");
  const load = useCallback(() => {
    setItems(null); setError("");
    api.get("/appointments", { params: { from: start, to: addDays(start, 6), per_page: 50 } })
      .then((r) => { setItems([...r.data.items].sort((a: Appointment, b: Appointment) => a.start.localeCompare(b.start))); setTotal(r.data.total); }).catch((e) => setError(errMsg(e)));
  }, [start]);
  useEffect(load, [load]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button className="btn-ghost px-3" aria-label="Previous week" onClick={() => setStart(addDays(start, -7))}><ChevronLeft size={18} /></button>
        <div className="text-center"><p className="font-semibold">{new Date(start + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })} – {new Date(addDays(start, 6) + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
          <button className="text-xs text-primary" onClick={() => setStart(monday(todayStr()))}>Jump to this week</button></div>
        <button className="btn-ghost px-3" aria-label="Next week" onClick={() => setStart(addDays(start, 7))}><ChevronRight size={18} /></button>
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="grid gap-2 md:grid-cols-7">
          {days.map((d) => {
            const list = (items ?? []).filter((a) => a.start.slice(0, 10) === d);
            return (<section key={d} aria-label={d} className={`min-h-24 rounded-xl border p-2 ${d === todayStr() ? "border-primary bg-primary-soft/40" : "border-line bg-white"}`}>
              <p className="mb-2 text-xs font-semibold text-muted">{new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</p>
              {items === null ? <div className="h-8 animate-pulse rounded-lg bg-slate-100" /> : list.length === 0 ? <p className="text-xs text-slate-400">–</p> :
                <ul className="space-y-1.5">{list.map((a) => (<li key={a.id}><Link to={`/appointments/${a.id}`} className={`block rounded-lg border-l-4 bg-white px-2 py-1.5 text-xs shadow-sm hover:bg-primary-soft ${EDGE[a.status]}`}>
                  <span className="font-bold">{timeLabel(a.start)}</span><span className="block truncate text-muted">{a.patient.full_name}</span></Link></li>))}</ul>}
            </section>);
          })}
        </div>)}
      {items && total > items.length && <p className="mt-2 text-xs text-muted">Showing the first {items.length} of {total} appointments this week.</p>}
    </div>
  );
}
