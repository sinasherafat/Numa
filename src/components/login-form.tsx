"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ nextPath = "/workspace" }: { nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/workspace";
    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        router.push(safeNext);
        router.refresh();
      }
    } else {
      const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(safeNext)}`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) setMessage(error.message);
      else if (data.session) {
        router.push(safeNext);
        router.refresh();
      } else {
        setMessage("Check your email to confirm your account, then return to sign in.");
      }
    }
    setBusy(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="brand auth-brand" aria-label="Numa sample workspace">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Numa</span>
        </Link>
        <span className="badge green">Live private workspace</span>
        <h1>{mode === "sign-in" ? "Welcome back" : "Create your Numa account"}</h1>
        <p className="subtitle">Your sources, audio and learning evidence stay scoped to your account.</p>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="auth-password">Password</label>
          <input id="auth-password" className="input" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          {message && <div className="notice" role="status">{message}</div>}
          <button className="button primary" type="submit" disabled={busy}>{busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
        </form>
        <button className="text-link auth-mode" type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }}>
          {mode === "sign-in" ? "New to Numa? Create an account" : "Already have an account? Sign in"}
        </button>
        <Link href="/" className="button">Open the labeled sample workspace</Link>
      </section>
    </main>
  );
}
