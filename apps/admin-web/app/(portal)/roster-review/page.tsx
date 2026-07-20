'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '../../../components/portal-shell';
import { apiRequest } from '../../../lib/api-client';

type Roster = {
  id: string;
  team: { name: string };
  tournament: { name: string };
  version: number;
  players: { id: string }[];
};

export default function RosterReviewPage() {
  const organization = useOrganization();
  const client = useQueryClient();
  const rosters = useQuery({
    queryKey: ['submitted-rosters', organization.organizationId],
    queryFn: () =>
      apiRequest<{ items: Roster[] }>(
        `/management/organizations/${organization.organizationId}/rosters?status=SUBMITTED`,
        { organizationId: organization.organizationId },
      ),
  });
  const decision = useMutation({
    mutationFn: ({ roster, value }: { roster: Roster; value: 'APPROVED' | 'CHANGES_REQUESTED' }) =>
      apiRequest(
        `/management/organizations/${organization.organizationId}/rosters/${roster.id}/decision`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({
            decision: value,
            message:
              value === 'APPROVED'
                ? 'Roster reviewed and approved.'
                : 'Roster requires organizer corrections; see the associated correction request.',
            expectedVersion: roster.version,
          }),
        },
      ),
    onSuccess: async () =>
      client.invalidateQueries({ queryKey: ['submitted-rosters', organization.organizationId] }),
  });
  return (
    <div className="grid">
      <div>
        <h1>Roster review</h1>
        <p className="muted">
          Submitted rosters remain immutable until approved or returned for correction.
        </p>
      </div>
      <section className="card">
        {rosters.isPending && <p role="status">Loading submissions…</p>}
        {rosters.data?.items.length === 0 && (
          <p className="empty-state">No rosters are awaiting review.</p>
        )}
        {rosters.data && rosters.data.items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Tournament</th>
                  <th>Players</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {rosters.data.items.map((roster) => (
                  <tr key={roster.id}>
                    <td>{roster.team.name}</td>
                    <td>{roster.tournament.name}</td>
                    <td>{roster.players.length}</td>
                    <td>
                      <button
                        className="button"
                        type="button"
                        onClick={() => decision.mutate({ roster, value: 'APPROVED' })}
                      >
                        Approve
                      </button>{' '}
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => decision.mutate({ roster, value: 'CHANGES_REQUESTED' })}
                      >
                        Return
                      </button>
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
