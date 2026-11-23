import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DoctorApptRow } from "../../components/DoctorApptRow";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { api, errMsg, fetchAll } from "../../lib/api";
import { addDays, colLabel, mondayOf, timeLabel, todayStr } from "../../lib/format";
import { Appointment, Page } from "../../lib/types";

const CHIP: Record<string, string> = { pending: "border-amber-300 bg-amber-50", confirmed: "border-secondary bg-secondary-soft", completed: "border-primary/40 bg-primary-soft" };

function Week() {
  const [start, setStart] = useState(mondayOf(todayStr())); const [items, setItems] = useState<Appointment[] | null>(null); const [error, setError] = useState("");
  const load = useCallback(() => { setItems(null); setError("");
    fetchAll<Appointment>("/appointments", { from: start, to: addDays(start, 6) }).then((r) => setItems(r.filter((a) => a.status !== "cancelled" && a.status !== "rejected").sort((a, b) => a.start.localeCompare(b.start)))).catch((e) => setError(errMsg(e))); }, [start]);
  useEffect(load, [load]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (<div>
    <div className="mb-3 flex items-center gap-2"><button className="btn-ghost px-3" aria-label="Previous week" onClick={() => setStart(addDays(start, -7))}><ChevronLeft size={18} /></button>
      <p className="flex-1 text-center font-semibold">{colLabel(start)} – {colLabel(addDays(start, 6))}</p>
      <button className="btn-ghost px-3" aria-label="Next week" onClick={() => setStart(addDays(start, 7))}><ChevronRight size={18} /></button>
      <button className="btn-ghost" onClick={() => setStart(mondayOf(todayStr()))}>This week</button></div>
    {error ? <ErrorState message={error} onRetry={load} /> : !items ? <Spinner /> :
      <div className="grid gap-2 md:grid-cols-7">{days.map((day) => (
        <div key={day} className={`min-h-32 rounded-2xl border p-2 ${day === todayStr() ? "border-primary bg-primary-soft/40" : "border-line bg-white"}`}>
          <p className="mb-2 text-xs font-semibold text-muted">{colLabel(day)}</p>
          <div className="space-y-1.5">{items.filter((a) => a.start.slice(0, 10) === day).map((a) => (
            <Link key={a.id} to={`/appointments/${a.id}`} className={`block rounded-lg border px-2 py-1.5 text-xs ${CHIP[a.status] ?? ""}`}>
              <span className="font-bold">{timeLabel(a.start)}</span><span className="block truncate">{a.patient.full_name}</span></Link>))}</div></div>))}</div>}
  </div>);
}

function List() {
  const [status, setStatus] = useState(""); const [page, setPage] = useState(1); const [data, setData] = useState<Page<Appointment> | null>(null); const [error, setError] = useState("");
  const load = useCallback(() => { setError(""); api.get("/appointments", { params: { ...(status && { status }), page, per_page: 10 } }).then((r) => setData(r.data)).catch((e) => setError(errMsg(e))); }, [status, page]);
  useEffect(load, [load]);
  return (<div>
    <label className="label" htmlFor="st">Status</label>
    <select id="st" className="input max-w-xs" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
      <option value="">All</option>{["pending", "confirmed", "completed", "cancelled", "rejected"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}</select>
    <div className="mt-4">{error ? <ErrorState message={error} onRetry={load} /> : !data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No appointments found" hint="Nothing matches this filter." /> :
      <div className="card p-2">{data.items.map((a) => (<div key={a.id}><p className="px-3 pt-2 text-xs text-muted">{colLabel(a.start.slice(0, 10))}</p><DoctorApptRow a={a} onChanged={load} /></div>))}</div>}</div>
    {data && data.pages > 1 && <nav className="mt-4 flex items-center justify-between"><button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span className="text-sm text-muted">Page {data.page} of {data.pages}</span><button className="btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></nav>}
  </div>);
}

export default function DoctorSchedule() {
  const [view, setView] = useState<"week" | "list">("week");
  return (<div><h1 className="text-3xl font-bold">My appointments</h1>
    <div role="tablist" className="my-5 flex gap-2">{(["week", "list"] as const).map((v) => (
      <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === v ? "bg-primary text-white" : "border border-line bg-white text-muted"}`}>{v === "week" ? "Calendar (week)" : "List"}</button>))}</div>
    {view === "week" ? <Week /> : <List />}</div>);
}
