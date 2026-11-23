import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FieldError } from "../components/ui";
import { api, errMsg } from "../lib/api";

export function ForgotPassword() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ message: string; email_delivery: string; dev_reset_link?: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { setRes((await api.post("/auth/forgot-password", { email })).data); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (<div className="mx-auto max-w-md px-4 py-16"><h1 className="text-3xl font-bold">Forgot your password?</h1>
    <p className="mt-1 text-muted">Enter your account email and we'll prepare a reset link.</p>
    <form onSubmit={submit} className="card mt-6 space-y-4 p-6"><div><label className="label" htmlFor="email">Email</label>
      <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button></form>
    {res && <div role="status" className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-card">
      <p>{res.message}</p>
      {res.email_delivery === "not_configured" && <p className="mt-2 text-amber-700">Email isn't set up on this server, so nothing was emailed.</p>}
      {res.email_delivery === "failed" && <p className="mt-2 text-red-600">The email could not be sent. Try again later.</p>}
      {res.dev_reset_link && <p className="mt-2 break-all">Development only: <a className="text-primary underline" href={res.dev_reset_link}>open reset link</a></p>}</div>}
    <p className="mt-6 text-center text-sm"><Link to="/login" className="text-primary">Back to log in</Link></p></div>);
}

export function ResetPassword() {
  const [q] = useSearchParams(); const nav = useNavigate(); const token = q.get("token") ?? "";
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [busy, setBusy] = useState(false);
  const err = pw && (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) ? "Use 8+ characters with a letter and a number" : pw2 && pw !== pw2 ? "Passwords do not match" : "";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/auth/reset-password", { token, password: pw }); toast.success("Password updated. Please log in."); nav("/login"); } catch (x) { toast.error(errMsg(x)); } finally { setBusy(false); }
  };
  if (!token) return <div className="mx-auto max-w-md px-4 py-16 text-center"><p className="font-semibold">This reset link is missing its token.</p><Link to="/forgot-password" className="btn-primary mt-4">Request a new link</Link></div>;
  return (<div className="mx-auto max-w-md px-4 py-16"><h1 className="text-3xl font-bold">Choose a new password</h1>
    <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
      <div><label className="label" htmlFor="pw">New password</label><input id="pw" type="password" required autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <div><label className="label" htmlFor="pw2">Confirm password</label><input id="pw2" type="password" required autoComplete="new-password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} /><FieldError msg={err} /></div>
      <button className="btn-primary w-full" disabled={busy || !!err || !pw || !pw2}>{busy ? "Saving…" : "Reset password"}</button></form></div>);
}
