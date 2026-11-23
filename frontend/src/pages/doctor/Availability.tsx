import axios from "axios";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorState, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { WEEKDAYS, shortDay, timeLabel, todayStr } from "../../lib/format";

interface Rule { id: number; weekday: number; start_time: string; end_time: string; break_start: string | null; break_end: string | null }
interface Av { slot_minutes: number; weekly: Rule[]; days_off: { id: number; date: string; reason: string | null }[] }
interface Conflict { id: number; booking_code: string; start: string; status: string }
type Vals = { days: number[]; start: string; end: string; bStart: string; bEnd: string };

function RuleForm({ rule, onSave, onCancel, busy }: { rule?: Rule; onSave: (v: Vals) => void; onCancel: () => void; busy: boolean }) {
  const [v, setV] = useState<Vals>({ days: rule ? [rule.weekday] : [0, 1, 2, 3, 4], start: rule?.start_time ?? "09:00", end: rule?.end_time ?? "17:00", bStart: rule?.break_start ?? "", bEnd: rule?.break_end ?? "" });
  const set = (k: keyof Vals, x: string) => setV({ ...v, [k]: x });
  const bad = !v.days.length || v.end <= v.start || !!v.bStart !== !!v.bEnd || (!!v.bStart && (v.bStart < v.start || v.bEnd > v.end || v.bEnd <= v.bStart));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(v); }} className="space-y-3 rounded-xl border border-line bg-canvas p-4">
      {rule ? <p className="font-semibold">{WEEKDAYS[rule.weekday]}</p> : <fieldset><legend className="label">Days</legend><div className="flex flex-wrap gap-2">{WEEKDAYS.map((w, i) => (
        <label key={w} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${v.days.includes(i) ? "border-primary bg-primary text-white" : "border-line bg-white"}`}>
          <input type="checkbox" className="sr-only" checked={v.days.includes(i)} onChange={() => setV({ ...v, days: v.days.includes(i) ? v.days.filter((d) => d !== i) : [...v.days, i] })} />{w.slice(0, 3)}</label>))}</div></fieldset>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["start", "Starts"], ["end", "Ends"], ["bStart", "Break from"], ["bEnd", "Break to"]] as const).map(([k, l]) => (
          <div key={k}><label className="label" htmlFor={`f-${k}`}>{l}</label><input id={`f-${k}`} type="time" className="input" value={v[k]} onChange={(e) => set(k, e.target.value)} /></div>))}</div>
      {bad && <p role="alert" className="text-xs text-red-600">Check the times: end must be after start, and a break needs both times inside working hours.</p>}
      <div className="flex gap-2"><button className="btn-primary" disabled={bad || busy}>{busy ? "Saving…" : rule ? "Save changes" : "Add hours"}</button><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

export default function Availability() {
  const { user } = useAuth(); const did = user?.doctor_id;
  const [av, setAv] = useState<Av | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false); const [editing, setEditing] = useState<number | null>(null); const [del, setDel] = useState<Rule | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null); const [off, setOff] = useState({ date: "", reason: "" });
  const load = useCallback(() => { setError(""); api.get(`/doctors/${did}/availability`).then((r) => setAv(r.data)).catch((e) => setError(errMsg(e))); }, [did]);
  useEffect(load, [load]);

  /** Run a change; if the server says it would orphan booked appointments, show them instead of failing silently. */
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); setAdding(false); setEditing(null); setDel(null); load(); }
    catch (e) { setDel(null); const data = axios.isAxiosError(e) ? e.response?.data : null; if (data?.conflicts) setConflicts(data.conflicts); else toast.error(errMsg(e)); }
    finally { setBusy(false); }
  };
  const body = (v: Vals, weekday: number) => ({ weekday, start_time: v.start, end_time: v.end, break_start: v.bStart || null, break_end: v.bEnd || null });
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!av) return <Spinner />;
  const byDay = WEEKDAYS.map((_, i) => av.weekly.filter((r) => r.weekday === i));

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Manage availability</h1><p className="mt-1 text-muted">Patients can only book inside these hours. Changes that would affect booked patients are blocked until you resolve them.</p></div>

      <section className="card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Weekly hours</h2>
        <div className="flex items-center gap-2"><label htmlFor="dur" className="text-sm text-muted">Appointment length</label>
          <select id="dur" className="input w-auto" value={av.slot_minutes} disabled={busy} onChange={(e) => run(() => api.put(`/doctors/${did}`, { slot_minutes: Number(e.target.value) }), "Appointment length updated")}>
            {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select></div></div>
        <div className="mt-4 divide-y divide-line">{byDay.map((rules, i) => (
          <div key={i} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start"><p className="w-28 shrink-0 font-medium">{WEEKDAYS[i]}</p>
            <div className="flex-1 space-y-2">{rules.length === 0 && <p className="text-sm text-slate-400">Not working</p>}
              {rules.map((r) => editing === r.id ? <RuleForm key={r.id} rule={r} busy={busy} onCancel={() => setEditing(null)} onSave={(v) => run(() => api.put(`/availability/${r.id}`, body(v, r.weekday)), "Hours updated")} /> : (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm"><span>{r.start_time}–{r.end_time}{r.break_start && <span className="text-muted"> · break {r.break_start}–{r.break_end}</span>}</span>
                  <span className="flex gap-1"><button aria-label={`Edit ${WEEKDAYS[i]} hours`} className="rounded-lg p-2 hover:bg-primary-soft" onClick={() => setEditing(r.id)}><Pencil size={15} /></button>
                    <button aria-label={`Remove ${WEEKDAYS[i]} hours`} className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => setDel(r)}><Trash2 size={15} /></button></span></div>))}</div></div>))}</div>
        <div className="mt-4">{adding ? <RuleForm busy={busy} onCancel={() => setAdding(false)} onSave={(v) => run(async () => { for (const d of v.days) await api.post("/availability", body(v, d)); }, "Hours added")} />
          : <button className="btn-ghost" onClick={() => setAdding(true)}><Plus size={16} />Add working hours</button>}</div></section>

      <section className="card p-6"><h2 className="text-lg font-bold">Days off and holidays</h2>
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post("/availability/unavailable", { date: off.date, reason: off.reason || null }); setOff({ date: "", reason: "" }); }, "Day off added"); }}>
          <div><label className="label" htmlFor="od">Date</label><input id="od" type="date" required min={todayStr()} className="input" value={off.date} onChange={(e) => setOff({ ...off, date: e.target.value })} /></div>
          <div className="min-w-40 flex-1"><label className="label" htmlFor="or">Reason (optional)</label><input id="or" maxLength={160} className="input" value={off.reason} onChange={(e) => setOff({ ...off, reason: e.target.value })} /></div>
          <button className="btn-primary" disabled={busy || !off.date}>Add day off</button></form>
        <ul className="mt-4 divide-y divide-line">{av.days_off.length === 0 && <li className="py-3 text-sm text-muted">No upcoming days off.</li>}
          {av.days_off.map((o) => (<li key={o.id} className="flex items-center justify-between py-2.5 text-sm"><span>{shortDay(o.date)}{o.reason && <span className="text-muted"> · {o.reason}</span>}</span>
            <button aria-label={`Remove day off ${o.date}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => run(() => api.delete(`/availability/unavailable/${o.id}`), "Day off removed")}><Trash2 size={15} /></button></li>))}</ul></section>

      <ConfirmDialog open={!!del} danger busy={busy} title="Remove these working hours?" message={del ? `${WEEKDAYS[del.weekday]} ${del.start_time}–${del.end_time} will no longer be bookable. If patients are already booked in this window, we'll show them first.` : ""}
        confirmLabel="Remove hours" onCancel={() => setDel(null)} onConfirm={() => del && run(() => api.delete(`/availability/${del.id}`), "Hours removed")} />

      {conflicts && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" onClick={() => setConflicts(null)}>
        <div role="alertdialog" aria-modal="true" aria-labelledby="cf" className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h2 id="cf" className="text-xl font-bold">This change affects booked patients</h2>
          <p className="mt-2 text-sm text-muted">Nothing was changed. Cancel or reschedule these appointments first, then try again.</p>
          <ul className="mt-4 max-h-60 divide-y divide-line overflow-auto text-sm">{conflicts.map((c) => (<li key={c.id}><Link to={`/appointments/${c.id}`} className="flex justify-between py-2.5 hover:text-primary">
            <span>{shortDay(c.start)} · {timeLabel(c.start)}</span><span className="text-muted">{c.booking_code} · {c.status}</span></Link></li>))}</ul>
          <button className="btn-primary mt-5 w-full" onClick={() => setConflicts(null)}>Got it</button></div></div>}
    </div>
  );
}
