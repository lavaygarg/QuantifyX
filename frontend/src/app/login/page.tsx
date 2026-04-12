'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Registration failed');
          setLoading(false);
          return;
        }

        // Auto sign-in after registration
        const signInResult = await signIn('credentials', {
          email,
          password,
          redirect: false
        });

        if (signInResult?.error) {
          setError('Account created but sign-in failed. Please sign in manually.');
          setIsRegister(false);
          setLoading(false);
          return;
        }

        router.push('/');
        router.refresh();
      } else {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false
        });

        if (result?.error) {
          setError('Invalid email or password');
          setLoading(false);
          return;
        }

        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="login-background mx-auto flex min-h-screen max-w-md items-center px-4">
      <section className="w-full rounded-[1.75rem] border border-white/8 bg-slate-950/60 p-8 shadow-sm shadow-black/10 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">QuantifyX</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          {isRegister ? 'Create account' : 'Sign in to trade'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {isRegister
            ? 'Start with $100,000 in simulated capital.'
            : 'Access your portfolio and trading dashboard.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isRegister && (
            <label className="grid gap-2 text-sm text-slate-400">
              Name
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
                placeholder="Your name"
              />
            </label>
          )}

          <label className="grid gap-2 text-sm text-slate-400">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
              placeholder="you@example.com"
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-400">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-blue-300 transition hover:text-blue-200 hover:underline"
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </section>
    </main>
  );
}
