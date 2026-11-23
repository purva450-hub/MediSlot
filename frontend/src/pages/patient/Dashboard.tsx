import { CalendarPlus, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApptRow } from "../../components/ApptRow";
import { ErrorState, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { ago, dayLabel, timeLabel } from "../../lib/format";
import { Appointment } from "../../lib/types";

interface Notif { id: number; title: string; message: string; is_read: boolean; created_at: string; appointment_id: number | null }
const count = (status: string) => api.get("/appointments", { params: { status, per_page: 1 } }).then((r) => r.data.total as number);

export default function PatientDashboard() {
  const { user } = useAuth(); const nav = useNavigate();
  const [d, setD] = useState<{ upcoming: Appointment | null; recent: Appointment[]; total: number; completed: number; cancelled: number; notifs: Notif[] } | null>(null);
  const [error, setError] = useState(""); const [q, setQ] = useState("");
  const load = () => {
    setError("");
    Promise.all([api.get("/appointments", { params: { scope: "upcoming", per_page: 1 } }), api.get("/appointments", { params: { per_page: 5 } }),
      count("completed"), count("cancelled"), api.get("/notifications", { params: { per_page: 4 } })])
      .then(([u, r, completed, cancelled, n]) => setD({ upcoming: u.data.items[0] ?? null, recent: r.data.items, total: r.data.total, completed, cancelled, notifs: n.data.items }))
      .catch((e) => setError(errMsg(e)));
  };
  useEffect(load, []);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!d) return <Spinner />;
  const search = (e: FormEvent) => { e.preventDefault(); nav(`/doctors${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome back, {user?.full_name}</h1>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h2 className="font-bold">Upcoming appointment</h2>
          {d.upcoming ? (<Link to={`/appointments/${d.upcoming.id}`} className="mt-3 block rounded-2xl bg-primary p-5 text-white">
            <p className="text-sm text-blue-100">{dayLabel(d.upcoming.start)}</p><p className="font-display text-3xl font-extrabold">{timeLabel(d.upcoming.start)}</p>
            <p className="mt-2 font-medium">Dr. {d.upcoming.doctor.full_name} · {d.upcoming.doctor.specialty}</p><p className="text-sm text-blue-100">{d.upcoming.doctor.clinic_name} · {d.upcoming.status}</p></Link>)
            : (<div className="mt-3 rounded-2xl bg-canvas p-6 text-center"><p className="font-medium">Nothing scheduled</p><p className="mb-4 text-sm text-muted">Find a doctor and pick a time that suits you.</p>
              <Link to="/doctors" className="btn-primary"><CalendarPlus size={16} />Book appointment</Link></div>)}
        </section>
        <section className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {([["Total", d.total], ["Completed", d.completed], ["Cancelled", d.cancelled]] as const).map(([k, v]) => (
            <div key={k} className="card flex items-center justify-between p-4 lg:px-6"><span className="text-sm text-muted">{k} appointments</span><span className="font-display text-2xl font-extrabold">{v}</span></div>))}
        </section>
      </div>
      <form onSubmit={search} className="card flex gap-2 p-3" role="search"><input className="input" aria-label="Search doctors" placeholder="Search doctor, specialty or clinic" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary shrink-0"><Search size={16} />Search</button></form>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4"><div className="mb-2 flex items-center justify-between px-3"><h2 className="font-bold">Recent appointments</h2><Link to="/patient/appointments" className="text-sm text-primary">View all</Link></div>
          {d.recent.length ? d.recent.map((a) => <ApptRow key={a.id} a={a} />) : <p className="px-3 py-8 text-center text-sm text-muted">You don't have any appointments yet.</p>}</section>
        <section className="card p-4"><div className="mb-2 flex items-center justify-between px-3"><h2 className="font-bold">Notifications</h2><Link to="/patient/notifications" className="text-sm text-primary">View all</Link></div>
          {d.notifs.length ? d.notifs.map((n) => (<div key={n.id} className="rounded-xl px-3 py-2.5"><p className={`text-sm ${n.is_read ? "" : "font-bold"}`}>{n.title}</p><p className="text-sm text-muted">{n.message}</p><p className="text-xs text-slate-400">{ago(n.created_at)}</p></div>))
            : <p className="px-3 py-8 text-center text-sm text-muted">You're all caught up.</p>}</section>
      </div>
    </div>
  );
}
