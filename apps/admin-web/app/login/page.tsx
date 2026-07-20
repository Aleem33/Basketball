'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../components/providers';
import { publicConfig } from '../../lib/config';
import styles from './login.module.css';

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const auth = useAuth();
  const session = auth.session;
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (session) router.replace('/dashboard');
  }, [session, router]);

  const submit = handleSubmit(async (values) => {
    setServerError('');
    try {
      await auth.login(values.email, values.password);
      router.replace('/dashboard');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Sign in failed.');
    }
  });

  return (
    <main id="main-content" className={styles.page}>
      <section className={`card ${styles.panel}`} aria-labelledby="login-title">
        <p className={styles.eyebrow}>Tournament operations</p>
        <h1 id="login-title">Sign in to {publicConfig.appName}</h1>
        <p className="muted">
          Use the administrator, manager, coach, or scorekeeper account assigned to you.
        </p>
        {serverError && (
          <div className="error-banner" role="alert">
            {serverError}
          </div>
        )}
        <form onSubmit={(event) => void submit(event)} className="grid" noValidate>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email && <span className="field-error">Enter a valid email address.</span>}
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password && <span className="field-error">Password is required.</span>}
          </div>
          <button className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <a href="/forgot-password">Forgot your password?</a>
      </section>
    </main>
  );
}
