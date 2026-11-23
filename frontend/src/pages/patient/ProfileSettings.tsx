import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FieldError } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

const profileSchema = z.object({ full_name: z.string().min(2, "Enter your full name"), phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Enter 10–15 digits") });
const pwSchema = z.object({ current_password: z.string().min(1, "Enter your current password"),
  new_password: z.string().min(8, "At least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/[0-9]/, "Include a number"), confirm: z.string() })
  .refine((d) => d.new_password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export function Profile() {
  const { user, setUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { full_name: user?.full_name, phone: user?.phone ?? "" } });
  const save = handleSubmit(async (v) => {
    try { const r = await api.put("/auth/me", v); setUser(r.data.user); reset(v); toast.success("Profile saved"); } catch (e) { toast.error(errMsg(e)); }
  });
  return (<div className="max-w-xl"><h1 className="text-3xl font-bold">My profile</h1>
    <form onSubmit={save} noValidate className="card mt-6 space-y-4 p-6">
      <div><label className="label" htmlFor="full_name">Full name</label><input id="full_name" className="input" {...register("full_name")} /><FieldError msg={errors.full_name?.message} /></div>
      <div><label className="label" htmlFor="email">Email</label><input id="email" className="input bg-canvas" value={user?.email} readOnly /><p className="mt-1 text-xs text-muted">Email can't be changed.</p></div>
      <div><label className="label" htmlFor="phone">Phone number</label><input id="phone" type="tel" className="input" {...register("phone")} /><FieldError msg={errors.phone?.message} /></div>
      <button className="btn-primary" disabled={isSubmitting || !isDirty}>{isSubmitting ? "Saving…" : "Save changes"}</button></form></div>);
}

export function PatientSettings() {
  const { logout } = useAuth(); const nav = useNavigate();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof pwSchema>>({ resolver: zodResolver(pwSchema) });
  const change = handleSubmit(async (v) => {
    try { await api.post("/auth/change-password", { current_password: v.current_password, new_password: v.new_password }); toast.success("Password updated"); reset(); } catch (e) { toast.error(errMsg(e)); }
  });
  const f = (id: "current_password" | "new_password" | "confirm", label: string, ac: string) => (
    <div><label className="label" htmlFor={id}>{label}</label><input id={id} type="password" autoComplete={ac} className="input" {...register(id)} /><FieldError msg={errors[id]?.message} /></div>);
  return (<div className="max-w-xl space-y-6"><h1 className="text-3xl font-bold">Settings</h1>
    <form onSubmit={change} noValidate className="card space-y-4 p-6"><h2 className="text-lg font-bold">Change password</h2>
      {f("current_password", "Current password", "current-password")}{f("new_password", "New password", "new-password")}{f("confirm", "Confirm new password", "new-password")}
      <button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? "Updating…" : "Update password"}</button></form>
    <div className="card flex items-center justify-between p-6"><div><h2 className="text-lg font-bold">Sign out</h2><p className="text-sm text-muted">End this session on this device.</p></div>
      <button className="btn-ghost" onClick={async () => { await logout(); nav("/"); }}>Log out</button></div></div>);
}
