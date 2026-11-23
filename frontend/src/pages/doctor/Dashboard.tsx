import { CalendarCheck, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApptRow } from "../../components/ApptRow";
import { ErrorState, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { todayStr } from "../../lib/format";
import { Appointment } from "../../lib/types";

const total = (params: Record<string, string | number>) => api.get("/appointments", { params: { ...params, per_page: 1 } }).then((r) => r.data.total as number);

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [d, setD] = useState<{ today: Appointment[]; pending: Appointment[]; counts: number[] } | null>(null); const [error, setError] = useState("");
  const load = () => {
    setError("");
    Promise.all([api.get("/appointments", { params: { from: todayStr(), to: todayStr(), per_page: 50 } }), api.get("/appointments", { params: { status: "pending", per_page: 5 } }),
      total({ from: todayStr(), to: todayStr() }), total({ scope: "upcoming" }), total({ status: "completed" }), total({ status: "cancelled" })])
      .then(([t, p, ...counts]) => setD({ today: [...t.data.items].sort((a: Appointment, b: Appointment) => a.start.localeCompare(b.start)), pending: p.data.items, counts: counts as number[] }))
      .catch((e) => setError(errMsg(e)));
  };
  useEffect(load, []);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!d) return <Spinner />;
  const stats = [[CalendarCheck, "Today", d.counts[0]], [CalendarClock, "Upcoming", d.counts[1]], [CheckCircle2, "Completed", d.counts[2]], [XCircle, "Cancelled", d.counts[3]]] as const;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Good to see you, Dr. {user?.full_name}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(([I, k, v]) => (
        <div key={k} className="card p-4"><I size={18} className="text-secondary" /><p className="mt-2 font-display text-3xl font-extrabold">{v}</p><p className="text-sm text-muted">{k}</p></div>))}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4"><div className="mb-2 flex items-center justify-between px-3"><h2 className="font-bold">Today's schedule</h2><Link to="/doctor/appointments" className="text-sm text-primary">Calendar</Link></div>
          {d.today.length ? d.today.map((a) => <ApptRow key={a.id} a={a} />) : <p className="px-3 py-8 text-center text-sm text-muted">No appointments today.</p>}</section>
        <section className="card p-4"><div className="mb-2 px-3"><h2 className="font-bold">Requests awaiting you</h2></div>
          {d.pending.length ? d.pending.map((a) => <ApptRow key={a.id} a={a} />) : <p className="px-3 py-8 text-center text-sm text-muted">No pending requests.</p>}</section>
      </div>
    </div>
  );
}
