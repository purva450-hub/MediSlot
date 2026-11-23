import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorState, Spinner } from "../../components/ui";
import { StatusBadge } from "../AppointmentDetail";
import { api, errMsg } from "../../lib/api";
import { ago, addDays, shortDay, timeLabel } from "../../lib/format";
import { Appointment } from "../../lib/types";
import toast from "react-hot-toast";

interface Dash {
  totals: Record<"patients" | "doctors" | "appointments" | "upcoming" | "completed" | "cancelled", number>;
  appointments_per_day: { date: string; count: number }[]; recent_bookings: Appointment[];
  recent_registrations: { id: number; full_name: string; role: string; created_at: string }[];
  doctor_approval_requests: { id: number; full_name: string; specialty: { name: string }; location: string }[];
  recent_activity: { action: string; details: string; at: string }[];
}
const LABELS: [keyof Dash["totals"], string][] = [["patients", "Total patients"], ["doctors", "Total doctors"], ["appointments", "Total appointments"], ["upcoming", "Upcoming"], ["completed", "Completed"], ["cancelled", "Cancelled"]];

export default function AdminDashboard() {
  const [d, setD] = useState<Dash | null>(null); const [error, setError] = useState("");
  const load = () => { setError(""); api.get("/admin/dashboard").then((r) => setD(r.data)).catch((e) => setError(errMsg(e))); };
  useEffect(load, []);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!d) return <Spinner />;
  const days = d.appointments_per_day; const map = Object.fromEntries(days.map((x) => [x.date, x.count])); const series: { date: string; count: number }[] = [];
  if (days.length) for (let day = days[0].date; day <= days[days.length - 1].date; day = addDays(day, 1)) series.push({ date: day.slice(5), count: map[day] ?? 0 });
  const decide = async (id: number, status: "approved" | "rejected") => {
    try { await api.put(`/admin/doctors/${id}/approval`, { status }); toast.success(`Doctor ${status}`); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin dashboard</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{LABELS.map(([k, l]) => <div key={k} className="card p-4"><p className="text-sm text-muted">{l}</p><p className="font-display text-3xl font-extrabold">{d.totals[k]}</p></div>)}</div>
      <section className="card p-5"><h2 className="font-bold">Appointments by day</h2><p className="text-sm text-muted">Last 14 days and upcoming</p>
        {series.length === 0 ? <p className="py-10 text-center text-sm text-muted">No appointment data yet.</p> :
          <div className="mt-4 h-64" role="img" aria-label="Bar chart of appointments per day"><ResponsiveContainer width="100%" height="100%"><BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={28} />
            <Tooltip /><Bar dataKey="count" name="Appointments" fill="#2563EB" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>}</section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5"><h2 className="font-bold">Doctor approval requests</h2>
          {d.doctor_approval_requests.length === 0 ? <p className="py-6 text-center text-sm text-muted">No pending requests.</p> : <ul className="mt-2 divide-y divide-line">{d.doctor_approval_requests.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2 py-3"><div className="min-w-0"><p className="truncate font-semibold">Dr. {x.full_name}</p><p className="text-sm text-muted">{x.specialty.name} · {x.location}</p></div>
              <div className="flex gap-1"><button className="btn-primary px-3 py-1.5" onClick={() => decide(x.id, "approved")}>Approve</button><button className="btn-ghost px-3 py-1.5" onClick={() => decide(x.id, "rejected")}>Reject</button></div></li>))}</ul>}</section>
        <section className="card p-5"><h2 className="font-bold">Recent registrations</h2><ul className="mt-2 divide-y divide-line">{d.recent_registrations.map((u) => (
          <li key={u.id} className="flex justify-between py-2.5 text-sm"><span className="font-medium">{u.full_name} <span className="text-muted">· {u.role}</span></span><span className="text-muted">{ago(u.created_at)}</span></li>))}</ul></section>
        <section className="card p-5"><div className="flex justify-between"><h2 className="font-bold">Recent bookings</h2><Link to="/admin/appointments" className="text-sm text-primary">View all</Link></div>
          {d.recent_bookings.length === 0 ? <p className="py-6 text-center text-sm text-muted">No bookings yet.</p> : <ul className="mt-2 divide-y divide-line">{d.recent_bookings.map((a) => (
            <li key={a.id}><Link to={`/appointments/${a.id}`} className="flex items-center justify-between gap-2 py-2.5 text-sm hover:text-primary"><span className="min-w-0 truncate"><b>{a.patient.full_name}</b> → Dr. {a.doctor.full_name}<span className="block text-xs text-muted">{shortDay(a.start)} · {timeLabel(a.start)}</span></span><StatusBadge s={a.status} /></Link></li>))}</ul>}</section>
        <section className="card p-5"><h2 className="font-bold">System activity</h2>{d.recent_activity.length === 0 ? <p className="py-6 text-center text-sm text-muted">No activity recorded yet.</p> :
          <ul className="mt-2 divide-y divide-line">{d.recent_activity.map((l, i) => <li key={i} className="flex justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate"><code className="text-xs">{l.action}</code> <span className="text-muted">{l.details}</span></span><span className="shrink-0 text-xs text-slate-400">{ago(l.at)}</span></li>)}</ul>}</section>
      </div>
    </div>
  );
}
