import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { dashboardPath } from "../lib/types";
import { Logo } from "./Logo";

const links = [["/", "Home"], ["/doctors", "Find doctors"], ["/how-it-works", "How it works"], ["/about", "About us"], ["/contact", "Contact"]];

function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const cls = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "text-primary" : "text-muted hover:text-ink"}`;
  const out = async () => { await logout(); setOpen(false); nav("/"); };
  const account = user ? (
    <>
      <Link to={dashboardPath(user.role)} className="btn-ghost" onClick={() => setOpen(false)}>My dashboard</Link>
      <button className="btn-ghost" onClick={out}><LogOut size={16} /> Log out</button>
    </>
  ) : (
    <>
      <Link to="/login" className="btn-ghost" onClick={() => setOpen(false)}>Log in</Link>
      <Link to="/register" className="btn-ghost" onClick={() => setOpen(false)}>Sign up</Link>
    </>
  );
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="MediSlot home"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(([to, label]) => <NavLink key={to} to={to} end className={cls}>{label}</NavLink>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {account}
          <Link to="/doctors" className="btn-primary">Book appointment</Link>
        </div>
        <button className="rounded-lg p-2 md:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 border-t border-line bg-white px-4 py-4 md:hidden">
          {links.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="py-2 font-medium">{label}</Link>)}
          <div className="flex flex-wrap gap-2 pt-2">{account}</div>
          <Link to="/doctors" className="btn-primary" onClick={() => setOpen(false)}>Book appointment</Link>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div><Logo /><p className="mt-3 max-w-xs text-sm text-muted">Find a doctor, pick a time, skip the waiting room queue. Supports SDG 3: Good Health and Well-being.</p></div>
        <div className="text-sm"><p className="font-semibold">Explore</p>
          <ul className="mt-3 space-y-2 text-muted"><li><Link to="/doctors">Find doctors</Link></li><li><Link to="/login">Log in</Link></li><li><Link to="/register">Create account</Link></li><li><Link to="/about">About us</Link></li><li><Link to="/contact">Contact</Link></li><li><Link to="/privacy">Privacy policy</Link></li><li><Link to="/terms">Terms and conditions</Link></li></ul></div>
        <div className="text-sm text-muted"><p className="font-semibold text-ink">About this project</p>
          <p className="mt-3">ADC (CCSDS0302) · Group 48<br />Purva Arora, Paras Gupta, Pushkar Agrawal, Manvendra Rajpoot</p>
          <p className="mt-2">All doctors, clinics and figures shown are demo data.</p></div>
      </div>
    </footer>
  );
}

export function Layout() {
  return <><Navbar /><main className="min-h-[70vh]"><Outlet /></main><Footer /></>;
}
