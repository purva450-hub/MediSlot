import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Logo } from "../components/Logo";
import { FieldError } from "../components/ui";
import { errMsg } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { dashboardPath } from "../lib/types";

const loginSchema = z.object({ email: z.string().email("Enter a valid email"), password: z.string().min(1, "Enter your password"), remember: z.boolean() });
const registerSchema = z.object({
  full_name: z.string().min(2, "Enter your full name"), email: z.string().email("Enter a valid email"),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Enter 10–15 digits"),
  password: z.string().min(8, "At least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/[0-9]/, "Include a number"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (<div className="mx-auto max-w-md px-4 py-14"><div className="mb-6 text-center"><Link to="/" className="inline-block"><Logo /></Link>
    <h1 className="mt-5 text-3xl font-bold">{title}</h1><p className="mt-1 text-muted">{sub}</p></div><div className="card p-6">{children}</div></div>);
}

export function Login() {
  const { login } = useAuth(); const nav = useNavigate(); const from = (useLocation().state as { from?: string } | null)?.from;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { remember: false } });
  const submit = handleSubmit(async (v) => {
    try { const u = await login(v.email, v.password, v.remember); toast.success(`Welcome back, ${u.full_name}`); nav(from ?? dashboardPath(u.role), { replace: true }); }
    catch (e) { toast.error(errMsg(e)); }
  });
  return (<Shell title="Log in" sub="Welcome back to MediSlot."><form onSubmit={submit} className="space-y-4" noValidate>
    <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" className="input" {...register("email")} /><FieldError msg={errors.email?.message} /></div>
    <div><label className="label" htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" className="input" {...register("password")} /><FieldError msg={errors.password?.message} /></div>
    <div className="flex items-center justify-between text-sm"><label className="inline-flex items-center gap-2"><input type="checkbox" {...register("remember")} />Remember me</label>
      <Link to="/forgot-password" className="font-medium text-primary">Forgot password?</Link></div>
    <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Logging in…" : "Log in"}</button>
    <p className="text-center text-sm text-muted">New here? <Link to="/register" className="font-medium text-primary">Create a patient account</Link></p></form></Shell>);
}

export function Register() {
  const { register: signup } = useAuth(); const nav = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  const submit = handleSubmit(async (v) => {
    try { const u = await signup(v); toast.success("Account created"); nav(dashboardPath(u.role), { replace: true }); } catch (e) { toast.error(errMsg(e)); }
  });
  const f = (id: keyof z.infer<typeof registerSchema>, label: string, type = "text", ac?: string) => (
    <div><label className="label" htmlFor={id}>{label}</label><input id={id} type={type} autoComplete={ac} className="input" {...register(id)} /><FieldError msg={errors[id]?.message} /></div>);
  return (<Shell title="Create your account" sub="Patient registration. Doctors are added by an administrator."><form onSubmit={submit} className="space-y-4" noValidate>
    {f("full_name", "Full name", "text", "name")}{f("email", "Email", "email", "email")}{f("phone", "Phone number", "tel", "tel")}
    {f("password", "Password", "password", "new-password")}{f("confirm_password", "Confirm password", "password", "new-password")}
    <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Creating account…" : "Create account"}</button>
    <p className="text-center text-sm text-muted">Already registered? <Link to="/login" className="font-medium text-primary">Log in</Link></p></form></Shell>);
}
