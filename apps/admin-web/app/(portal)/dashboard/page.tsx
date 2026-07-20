'use client';

import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '../../../components/portal-shell';
import { apiRequest } from '../../../lib/api-client';

type Dashboard = {
  tournaments: number;
  teams: number;
  upcomingGames: number;
  liveGames: number;
  pendingRosters: number;
  openCorrections: number;
};

export default function DashboardPage() {
  const organization = useOrganization();
  const dashboard = useQuery({
    queryKey: ['dashboard', organization.organizationId],
    queryFn: () =>
      apiRequest<Dashboard>(`/management/organizations/${organization.organizationId}/dashboard`, {
        organizationId: organization.organizationId,
      }),
  });
  return (
    <>
      <h1>Operations overview</h1>
      <p className="muted">
        Live counts from {organization.organizationName}. No generated analytics or sample records
        are shown.
      </p>
      {dashboard.isPending && <p role="status">Loading operational data…</p>}
      {dashboard.isError && (
        <div className="error-banner" role="alert">
          Operational data is unavailable.{' '}
          <button type="button" onClick={() => void dashboard.refetch()}>
            Retry
          </button>
        </div>
      )}
      {dashboard.data && (
        <div className="grid two">
          {Object.entries({
            Tournaments: dashboard.data.tournaments,
            Teams: dashboard.data.teams,
            'Upcoming games': dashboard.data.upcomingGames,
            'Live games': dashboard.data.liveGames,
            'Rosters awaiting review': dashboard.data.pendingRosters,
            'Open corrections': dashboard.data.openCorrections,
          }).map(([label, value]) => (
            <section className="card" key={label}>
              <h2>{label}</h2>
              <p className="metric">{value}</p>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
