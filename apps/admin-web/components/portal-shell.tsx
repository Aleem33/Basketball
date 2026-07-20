'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/api-client';
import { publicConfig } from '../lib/config';
import { visibleNavigation } from '../lib/permissions';
import { useAuth } from './providers';
import styles from './portal-shell.module.css';

type AccessMembership = {
  organization: { id: string; name: string };
  roles: { key: string; permissions: string[] }[];
};

type AccessResponse = { platformSuperAdmin: boolean; memberships: AccessMembership[] };

type OrganizationContextValue = {
  organizationId: string;
  organizationName: string;
  permissions: ReadonlySet<string>;
  platformSuperAdmin: boolean;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function PortalShell({ children }: { children: ReactNode }) {
  const { session, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const access = useQuery({
    queryKey: ['access'],
    queryFn: () => apiRequest<AccessResponse>('/me/access'),
    enabled: Boolean(session),
  });
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!selectedOrganizationId && access.data?.memberships[0]) {
      setSelectedOrganizationId(access.data.memberships[0].organization.id);
    }
  }, [access.data, selectedOrganizationId]);

  const membership = access.data?.memberships.find(
    (item) => item.organization.id === selectedOrganizationId,
  );
  const context = useMemo<OrganizationContextValue | null>(() => {
    if (!membership) return null;
    return {
      organizationId: membership.organization.id,
      organizationName: membership.organization.name,
      permissions: new Set(membership.roles.flatMap((role) => role.permissions)),
      platformSuperAdmin: access.data?.platformSuperAdmin ?? false,
    };
  }, [membership, access.data?.platformSuperAdmin]);

  if (authLoading || (session && access.isPending))
    return <main className={styles.center}>Loading secure workspace…</main>;
  if (!session) return <main className={styles.center}>Redirecting to sign in…</main>;
  if (access.isError) {
    return (
      <main className={styles.center}>
        <div className="error-banner" role="alert">
          Your access information could not be loaded. Retry when the connection is stable.
        </div>
        <button className="button" type="button" onClick={() => void access.refetch()}>
          Retry
        </button>
      </main>
    );
  }
  if (!membership) {
    return (
      <main className={styles.center}>
        <div className="card">
          <h1>No organization access</h1>
          <p className="muted">
            Your account is active but has not been assigned to an organization.
          </p>
          <button className="button secondary" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <OrganizationContext.Provider value={context}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.brand}>
            {publicConfig.appName}
          </Link>
          <label className={styles.organizationPicker}>
            <span>Organization</span>
            <select
              value={selectedOrganizationId}
              onChange={(event) => setSelectedOrganizationId(event.target.value)}
            >
              {access.data?.memberships.map((item) => (
                <option value={item.organization.id} key={item.organization.id}>
                  {item.organization.name}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.userMenu}>
            <span>{session.user.displayName || session.user.email}</span>
            <button className="button secondary" type="button" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </header>
        <aside className={styles.sidebar} aria-label="Primary navigation">
          <nav>
            {visibleNavigation(
              context?.permissions ?? new Set(),
              context?.platformSuperAdmin ?? false,
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main id="main-content" className={styles.main}>
          {children}
        </main>
      </div>
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextValue {
  const value = useContext(OrganizationContext);
  if (!value) throw new Error('useOrganization must be used within PortalShell');
  return value;
}
