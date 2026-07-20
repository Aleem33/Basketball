'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useOrganization } from '../../../components/portal-shell';
import { apiRequest } from '../../../lib/api-client';

type Tournament = { id: string; name: string };
type TeamApplication = {
  id: string;
  status: string;
  message: string | null;
  team: { id: string; name: string; shortName: string | null };
  submittedBy: { email: string; profile: { displayName: string } | null };
};
type Correction = {
  id: string;
  resourceType: string;
  description: string;
  status: string;
  requestedBy: { email: string; profile: { displayName: string } | null };
};

export default function RequestsPage() {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const [tournamentId, setTournamentId] = useState('');
  const [reason, setReason] = useState('');
  const tournaments = useQuery({
    queryKey: ['tournaments', organization.organizationId],
    queryFn: () =>
      apiRequest<{ items: Tournament[] }>(
        `/management/organizations/${organization.organizationId}/tournaments`,
        { organizationId: organization.organizationId },
      ),
  });
  useEffect(() => {
    if (!tournamentId && tournaments.data?.items[0]) setTournamentId(tournaments.data.items[0].id);
  }, [tournamentId, tournaments.data]);
  const applications = useQuery({
    queryKey: ['team-applications', organization.organizationId, tournamentId],
    queryFn: () =>
      apiRequest<{ items: TeamApplication[] }>(
        `/management/organizations/${organization.organizationId}/tournaments/${tournamentId}/team-applications`,
        { organizationId: organization.organizationId },
      ),
    enabled: Boolean(tournamentId),
  });
  const corrections = useQuery({
    queryKey: ['correction-requests', organization.organizationId, tournamentId],
    queryFn: () =>
      apiRequest<{ items: Correction[] }>(
        `/management/organizations/${organization.organizationId}/tournaments/${tournamentId}/corrections`,
        { organizationId: organization.organizationId },
      ),
    enabled: Boolean(tournamentId),
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['team-applications', organization.organizationId, tournamentId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['correction-requests', organization.organizationId, tournamentId],
      }),
    ]);
  };
  const decideApplication = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      apiRequest(
        `/management/organizations/${organization.organizationId}/tournaments/${tournamentId}/team-applications/${id}/decision`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({ decision, reason }),
        },
      ),
    onSuccess: refresh,
  });
  const decideCorrection = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      apiRequest(
        `/management/organizations/${organization.organizationId}/tournaments/${tournamentId}/corrections/${id}/decision`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({ decision, resolution: reason }),
        },
      ),
    onSuccess: refresh,
  });
  const canDecide = reason.trim().length > 0;
  return (
    <div className="grid">
      <div>
        <h1>Applications and corrections</h1>
        <p className="muted">
          Every decision records its actor, reason, timestamp, and correlation ID.
        </p>
      </div>
      <section className="card grid two">
        <div className="field">
          <label htmlFor="request-tournament">Tournament</label>
          <select
            id="request-tournament"
            value={tournamentId}
            onChange={(event) => setTournamentId(event.target.value)}
          >
            <option value="">Select</option>
            {tournaments.data?.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="decision-reason">Decision reason</label>
          <textarea
            id="decision-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      </section>
      <section className="card">
        <h2>Team applications</h2>
        {applications.isPending && <p role="status">Loading applications…</p>}
        {applications.data?.items.length === 0 && (
          <p className="empty-state">No team applications exist for this tournament.</p>
        )}
        {applications.data && applications.data.items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Submitted by</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {applications.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.team.name}</td>
                    <td>{item.submittedBy.profile?.displayName ?? item.submittedBy.email}</td>
                    <td>{item.message ?? 'No message'}</td>
                    <td>{item.status}</td>
                    <td>
                      {['OPEN', 'IN_REVIEW'].includes(item.status) && (
                        <>
                          <button
                            className="button"
                            disabled={!canDecide || decideApplication.isPending}
                            onClick={() =>
                              decideApplication.mutate({ id: item.id, decision: 'APPROVED' })
                            }
                          >
                            Approve
                          </button>{' '}
                          <button
                            className="button danger"
                            disabled={!canDecide || decideApplication.isPending}
                            onClick={() =>
                              decideApplication.mutate({ id: item.id, decision: 'REJECTED' })
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="card">
        <h2>Correction requests</h2>
        {corrections.isPending && <p role="status">Loading corrections…</p>}
        {corrections.data?.items.length === 0 && (
          <p className="empty-state">No correction requests exist for this tournament.</p>
        )}
        {corrections.data && corrections.data.items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Requested by</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {corrections.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.resourceType}</td>
                    <td>{item.requestedBy.profile?.displayName ?? item.requestedBy.email}</td>
                    <td>{item.description}</td>
                    <td>{item.status}</td>
                    <td>
                      {['OPEN', 'IN_REVIEW'].includes(item.status) && (
                        <>
                          <button
                            className="button"
                            disabled={!canDecide || decideCorrection.isPending}
                            onClick={() =>
                              decideCorrection.mutate({ id: item.id, decision: 'APPROVED' })
                            }
                          >
                            Approve
                          </button>{' '}
                          <button
                            className="button danger"
                            disabled={!canDecide || decideCorrection.isPending}
                            onClick={() =>
                              decideCorrection.mutate({ id: item.id, decision: 'REJECTED' })
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
