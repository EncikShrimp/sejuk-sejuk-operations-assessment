"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, ClipboardList, LogIn, Wrench } from "lucide-react";

import type { UserRole } from "@/lib/domain/types";

const roles: { id: UserRole; title: string; description: string; icon: typeof ClipboardList; accent: string }[] = [
  { id: "admin", title: "Admin", description: "Create orders, quote work, and assign technicians.", icon: ClipboardList, accent: "border-teal-600 bg-teal-50" },
  { id: "technician", title: "Technician", description: "View assigned jobs and complete field service work.", icon: Wrench, accent: "border-amber-500 bg-amber-50" },
  { id: "manager", title: "Manager", description: "Review jobs, inspect KPIs, and query Operations AI.", icon: BarChart3, accent: "border-violet-600 bg-violet-50" },
];

export function MockLoginForm() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (!selectedRole) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/mock-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!response.ok) throw new Error("We could not start that assessment session.");
      router.replace(`/${selectedRole}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not start that assessment session.");
      setIsSubmitting(false);
    }
  }

  return <main className="grid min-h-dvh bg-[#f4f7f5] lg:grid-cols-[minmax(0,1fr)_520px]">
    <section className="hidden bg-[#123b38] p-10 text-white lg:flex lg:flex-col xl:p-14">
      <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[#dbf06d] text-[#123b38]"><Wrench className="size-6" /></div><div><p className="font-semibold tracking-tight">Sejuk Sejuk</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-100/65">Operations system</p></div></div>
      <div className="my-auto max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#dbf06d]">Service workflow</p><h1 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-[-0.055em]">Every job has a clear next owner.</h1><p className="mt-6 max-w-md text-base leading-7 text-teal-50/75">Sign in to the correct operational workspace. The assessment uses a visible mock sign-in, not production authentication.</p><div className="mt-10 grid grid-cols-3 gap-3 text-xs"><div className="rounded-xl border border-white/15 bg-white/5 p-3"><p className="font-bold text-[#dbf06d]">01</p><p className="mt-2 text-teal-50/80">Create & assign</p></div><div className="rounded-xl border border-white/15 bg-white/5 p-3"><p className="font-bold text-[#dbf06d]">02</p><p className="mt-2 text-teal-50/80">Complete in field</p></div><div className="rounded-xl border border-white/15 bg-white/5 p-3"><p className="font-bold text-[#dbf06d]">03</p><p className="mt-2 text-teal-50/80">Review & close</p></div></div></div>
      <p className="text-xs text-teal-100/55">Malaysia service operations · assessment environment</p>
    </section>
    <section className="flex items-center justify-center p-5 sm:p-8"><div className="w-full max-w-md"><div className="flex items-center gap-3 lg:hidden"><div className="grid size-10 place-items-center rounded-xl bg-[#123b38] text-[#dbf06d]"><Wrench className="size-5" /></div><div><p className="font-semibold">Sejuk Sejuk</p><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Operations system</p></div></div><p className="mt-10 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700 lg:mt-0">Mock sign-in</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-slate-950">Choose your workspace</h1><p className="mt-3 text-sm leading-6 text-slate-600">Select one role. The portal will show only the views available to that role.</p><div className="mt-7 space-y-3">{roles.map(({ id, title, description, icon: Icon, accent }) => <button key={id} type="button" onClick={() => setSelectedRole(id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedRole === id ? `${accent} ring-2 ring-[#123b38]/10` : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}><div className="flex items-start gap-4"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${selectedRole === id ? "bg-white text-[#123b38]" : "bg-slate-100 text-slate-600"}`}><Icon className="size-5" /></span><span><span className="block text-sm font-bold text-slate-950">{title}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span></span></div></button>)}</div>{error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}<button type="button" disabled={!selectedRole || isSubmitting} onClick={submit} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#123b38] px-4 text-sm font-bold text-white transition hover:bg-[#0d302d] disabled:cursor-not-allowed disabled:opacity-40"><LogIn className="size-4" />{isSubmitting ? "Signing in…" : "Continue to portal"}</button><p className="mt-4 text-center text-xs leading-5 text-slate-500">This is a role-selection login for the assessment. It does not claim production authentication.</p></div></section>
  </main>;
}
