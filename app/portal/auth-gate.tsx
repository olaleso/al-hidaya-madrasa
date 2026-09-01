"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from "lucide-react";
import Link from "next/link";
import { FormFeedback } from "@/components/form-feedback";
import PortalClient from "./portal-client";
import { PasswordChange } from "./password-change";

export type PortalUser = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "teacher" | "finance" | "parent";
  mustChangePassword: boolean;
};

export default function AuthGate() {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then(async (response) => {
        if (response.ok) setUser((await response.json()).user);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      setUser(data.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    setUser(null);
  }

  if (loading) {
    return (
      <main className="auth-page auth-page-simple">
        <div className="auth-loading">
          <img src="/al-hidaya-logo.png" alt="" />
          <p>Opening the secure portal…</p>
        </div>
      </main>
    );
  }

  if (user?.mustChangePassword) return <PasswordChange user={user} onChanged={logout} mandatory />;
  if (user) return <PortalClient user={user} onLogout={logout} />;

  return (
    <main className="auth-page auth-page-simple">
      <section className="auth-showcase" aria-label="Al-Hidaya Madrasat">
        <div className="auth-showcase-inner">
          <img
            className="auth-showcase-logo"
            src="/al-hidaya-logo.png"
            alt="Al-Hidaya Islamic Centre"
          />
          <span>Al-Hidaya Islamic Centre · Bolton</span>
          <h1>
            Madrasat Management
            <br />
            System
          </h1>
          <blockquote>
            “My Lord, increase me in knowledge.”
            <cite>Qur’an 20:114</cite>
          </blockquote>
        </div>
      </section>

      <section className="auth-signin">
        <div className="auth-card auth-card-simple">
          <Link className="auth-back" href="/">
            ← Return to website
          </Link>
          <h2>Assalamu alaikum</h2>
          <p>Sign in to your secure Madrasat workspace.</p>

          <form onSubmit={login} onChange={() => error && setError("")}>
            <label>
              Email address
              <span className="auth-input-wrap">
                <Mail aria-hidden="true" />
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="name@example.com"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-feedback" : undefined}
                  required
                />
              </span>
            </label>

            <label>
              Password
              <span className="auth-input-wrap password-field">
                <LockKeyhole aria-hidden="true" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-feedback" : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </span>
            </label>

            <FormFeedback id="login-feedback" message={error} />
            <button className="primary" disabled={busy}>
              <LogIn size={18} />
              {busy ? "Signing in…" : "Sign in securely"}
            </button>
          </form>

          <p className="auth-role-note">
            One secure sign-in for administrators, staff and parents. Your
            account opens the correct workspace automatically.
          </p>
          <div className="auth-help">
            <span>Need help signing in?</span>
            <a href="mailto:alhidayatulummaha@gmail.com">Contact the Madrasat</a>
          </div>
        </div>
      </section>
    </main>
  );
}
