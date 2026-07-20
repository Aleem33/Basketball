'use client';

import { useState } from 'react';
import { apiRequest } from '../../lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <main
      id="main-content"
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem' }}
    >
      <section className="card" style={{ width: 'min(100%, 30rem)' }}>
        <h1>Reset password</h1>
        {sent ? (
          <p>If the account is eligible, instructions will be sent.</p>
        ) : (
          <form
            className="grid"
            onSubmit={(event) => {
              event.preventDefault();
              void apiRequest('/auth/password-reset/request', {
                method: 'POST',
                body: JSON.stringify({ email }),
                anonymous: true,
              }).then(() => setSent(true));
            }}
          >
            <div className="field">
              <label htmlFor="reset-email">Email address</label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button className="button">Send instructions</button>
          </form>
        )}
      </section>
    </main>
  );
}
