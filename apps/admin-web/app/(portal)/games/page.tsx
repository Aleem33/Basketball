'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useOrganization } from '../../../components/portal-shell';
import { apiRequest } from '../../../lib/api-client';

type Game = {
  id: string;
  scheduledAt: string;
  status: string;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  venue: { name: string } | null;
  version: number;
};

export default function GamesPage() {
  const organization = useOrganization();
  const client = useQueryClient();
  const [status, setStatus] = useState('');
  const games = useQuery({
    queryKey: ['management-games', organization.organizationId, status],
    queryFn: () =>
      apiRequest<{ items: Game[] }>(
        `/management/organizations/${organization.organizationId}/games${status ? `?status=${status}` : ''}`,
        { organizationId: organization.organizationId },
      ),
  });
  const updateStatus = useMutation({
    mutationFn: ({ game, nextStatus }: { game: Game; nextStatus: 'POSTPONED' | 'CANCELLED' }) =>
      apiRequest(`/organizations/${organization.organizationId}/games/${game.id}/status`, {
        method: 'POST',
        organizationId: organization.organizationId,
        body: JSON.stringify({
          status: nextStatus,
          expectedVersion: game.version,
          idempotencyKey: crypto.randomUUID(),
          reason: `Organizer marked game ${nextStatus.toLowerCase()} from the operations portal`,
        }),
      }),
    onSuccess: async () =>
      client.invalidateQueries({ queryKey: ['management-games', organization.organizationId] }),
  });
  return (
    <div className="grid">
      <div>
        <h1>Games</h1>
        <p className="muted">
          Manual fixtures and generated schedules share the same authoritative records.
        </p>
      </div>
      <section className="card">
        <div className="field">
          <label htmlFor="game-status">Filter by status</label>
          <select
            id="game-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All</option>
            {[
              'SCHEDULED',
              'LIVE',
              'PAUSED',
              'FINAL',
              'POSTPONED',
              'CANCELLED',
              'ABANDONED',
              'FORFEITED',
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        {games.isPending && <p role="status">Loading games…</p>}
        {games.data?.items.length === 0 && (
          <p className="empty-state">No games match this filter.</p>
        )}
        {games.data && games.data.items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fixture</th>
                  <th>Time</th>
                  <th>Venue</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.data.items.map((game) => (
                  <tr key={game.id}>
                    <td>
                      {game.homeTeam?.name ?? 'To be decided'} vs{' '}
                      {game.awayTeam?.name ?? 'To be decided'}
                    </td>
                    <td>{new Date(game.scheduledAt).toLocaleString()}</td>
                    <td>{game.venue?.name ?? 'Unassigned'}</td>
                    <td>{game.status}</td>
                    <td>
                      {game.status === 'SCHEDULED' && (
                        <div>
                          <button
                            className="button secondary"
                            type="button"
                            onClick={() => updateStatus.mutate({ game, nextStatus: 'POSTPONED' })}
                          >
                            Postpone
                          </button>{' '}
                          <button
                            className="button danger"
                            type="button"
                            onClick={() => updateStatus.mutate({ game, nextStatus: 'CANCELLED' })}
                          >
                            Cancel
                          </button>
                        </div>
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
