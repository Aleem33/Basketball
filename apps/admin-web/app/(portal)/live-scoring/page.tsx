'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useOrganization } from '../../../components/portal-shell';
import { apiRequest } from '../../../lib/api-client';

type AssignedGame = {
  id: string;
  status: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homeScore: number;
  awayScore: number;
  currentPeriod: number;
  version: number;
  scoreEvents: {
    id: string;
    teamId: string;
    type: string;
    pointsDelta: number;
    period: number;
    sequence: number;
    occurredAt: string;
  }[];
};
type Lease = {
  scoringSessionId: string;
  leaseToken: string;
  expiresAt: string;
  redisCoordinated: boolean;
};

export default function LiveScoringPage() {
  const organization = useOrganization();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [lease, setLease] = useState<Lease | null>(null);
  const [reason, setReason] = useState('');
  const games = useQuery({
    queryKey: ['scoring-games', organization.organizationId],
    queryFn: () =>
      apiRequest<{ items: AssignedGame[] }>('/me/scoring-games', {
        organizationId: organization.organizationId,
      }),
  });
  const selected = games.data?.items.find((game) => game.id === selectedId);
  useEffect(() => {
    if (!lease || !selectedId) return;
    const timer = window.setInterval(() => {
      void apiRequest<Lease>(
        `/organizations/${organization.organizationId}/games/${selectedId}/scoring/lease/heartbeat`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({
            scoringSessionId: lease.scoringSessionId,
            leaseToken: lease.leaseToken,
          }),
        },
      )
        .then((heartbeat) => setLease((current) => (current ? { ...current, ...heartbeat } : null)))
        .catch(() => setLease(null));
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [lease?.scoringSessionId, organization.organizationId, selectedId]);
  const acquire = useMutation({
    mutationFn: () =>
      apiRequest<Lease>(
        `/organizations/${organization.organizationId}/games/${selectedId}/scoring/lease`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({ expectedGameVersion: selected?.version ?? 0 }),
        },
      ),
    onSuccess: setLease,
  });
  const command = useMutation({
    mutationFn: ({
      teamId,
      type,
    }: {
      teamId: string;
      type: 'ADD_ONE' | 'ADD_TWO' | 'ADD_THREE';
    }) => {
      if (!selected || !lease) throw new Error('Acquire the scoring lock first.');
      return apiRequest(
        `/organizations/${organization.organizationId}/games/${selected.id}/scoring/events`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          headers: { 'x-scoring-lease-token': lease.leaseToken },
          body: JSON.stringify({
            scoringSessionId: lease.scoringSessionId,
            idempotencyKey: crypto.randomUUID(),
            expectedVersion: selected.version,
            occurredAt: new Date().toISOString(),
            period: selected.currentPeriod,
            teamId,
            type,
          }),
        },
      );
    },
    onSuccess: async () =>
      client.invalidateQueries({ queryKey: ['scoring-games', organization.organizationId] }),
  });
  const transition = useMutation({
    mutationFn: (
      type:
        | 'GAME_STARTED'
        | 'PERIOD_STARTED'
        | 'PERIOD_PAUSED'
        | 'PERIOD_ENDED'
        | 'GAME_ENDED'
        | 'GAME_FINALIZED',
    ) => {
      if (!selected || !lease) throw new Error('Acquire the scoring lock first.');
      return apiRequest(
        `/organizations/${organization.organizationId}/games/${selected.id}/scoring/transitions`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          headers: { 'x-scoring-lease-token': lease.leaseToken },
          body: JSON.stringify({
            scoringSessionId: lease.scoringSessionId,
            idempotencyKey: crypto.randomUUID(),
            expectedVersion: selected.version,
            occurredAt: new Date().toISOString(),
            type,
            period: selected.currentPeriod || 1,
            ...(reason.trim() ? { reason: reason.trim() } : {}),
          }),
        },
      );
    },
    onSuccess: async () => {
      setReason('');
      await client.invalidateQueries({ queryKey: ['scoring-games', organization.organizationId] });
    },
  });
  const correction = useMutation({
    mutationFn: () => {
      const latest = selected?.scoreEvents[0];
      if (!selected || !lease || !latest) throw new Error('There is no scoring event to correct.');
      return apiRequest(
        `/organizations/${organization.organizationId}/games/${selected.id}/scoring/events`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          headers: { 'x-scoring-lease-token': lease.leaseToken },
          body: JSON.stringify({
            scoringSessionId: lease.scoringSessionId,
            idempotencyKey: crypto.randomUUID(),
            expectedVersion: selected.version,
            occurredAt: new Date().toISOString(),
            period: selected.currentPeriod || latest.period,
            type: 'CORRECTION',
            correctionOfEventId: latest.id,
            correctionReason: reason.trim(),
          }),
        },
      );
    },
    onSuccess: async () => {
      setReason('');
      await client.invalidateQueries({ queryKey: ['scoring-games', organization.organizationId] });
    },
  });
  return (
    <div className="grid">
      <div>
        <h1>Live scoring</h1>
        <p className="muted">
          A server-authoritative scoring lease prevents two scorekeepers from silently controlling
          the same game.
        </p>
      </div>
      <section className="card">
        <div className="field">
          <label htmlFor="score-game">Assigned game</label>
          <select
            id="score-game"
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setLease(null);
            }}
          >
            <option value="">Select a game</option>
            {games.data?.items.map((game) => (
              <option value={game.id} key={game.id}>
                {game.homeTeam.name} vs {game.awayTeam.name} · {game.status}
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <div className="grid">
            <button
              className="button"
              type="button"
              disabled={acquire.isPending}
              onClick={() => acquire.mutate()}
            >
              Acquire scoring control
            </button>
            {lease && (
              <p className="notice">
                Control active until {new Date(lease.expiresAt).toLocaleTimeString()}.{' '}
                {lease.redisCoordinated
                  ? 'Distributed coordination is healthy.'
                  : 'Realtime coordination is degraded; database protection remains active.'}
              </p>
            )}
            <div className="grid two">
              {[selected.homeTeam, selected.awayTeam].map((team) => (
                <section className="card" key={team.id}>
                  <h2>{team.name}</h2>
                  <p className="metric">
                    {team.id === selected.homeTeam.id ? selected.homeScore : selected.awayScore}
                  </p>
                  <div role="group" aria-label={`Add points for ${team.name}`}>
                    {(
                      [
                        ['+1', 'ADD_ONE'],
                        ['+2', 'ADD_TWO'],
                        ['+3', 'ADD_THREE'],
                      ] as const
                    ).map(([label, type]) => (
                      <button
                        className="button"
                        type="button"
                        disabled={!lease || command.isPending || selected.status !== 'LIVE'}
                        onClick={() => command.mutate({ teamId: team.id, type })}
                        key={type}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <section className="card grid">
              <h2>Game control</h2>
              <div className="field">
                <label htmlFor="scoring-reason">Reason or operator note</label>
                <input
                  id="scoring-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Required for a correction"
                />
              </div>
              <div role="group" aria-label="Game state transitions">
                {(
                  [
                    ['Start game', 'GAME_STARTED'],
                    ['Start period', 'PERIOD_STARTED'],
                    ['Pause period', 'PERIOD_PAUSED'],
                    ['End period', 'PERIOD_ENDED'],
                    ['End game', 'GAME_ENDED'],
                    ['Finalize', 'GAME_FINALIZED'],
                  ] as const
                ).map(([label, type]) => (
                  <button
                    className="button secondary"
                    type="button"
                    disabled={!lease || transition.isPending}
                    onClick={() => transition.mutate(type)}
                    key={type}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="button danger"
                type="button"
                disabled={
                  !lease ||
                  !selected.scoreEvents[0] ||
                  reason.trim().length < 3 ||
                  correction.isPending
                }
                onClick={() => correction.mutate()}
              >
                Correct last scoring event
              </button>
              <p className="muted">
                Corrections append a compensating event; the original history is retained.
              </p>
            </section>
            {(command.isError || transition.isError || correction.isError) && (
              <div className="error-banner" role="alert">
                {(command.error ?? transition.error ?? correction.error)?.message}. Refresh state
                before retrying.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
