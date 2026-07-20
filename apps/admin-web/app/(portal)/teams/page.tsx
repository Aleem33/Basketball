'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '../../../components/portal-shell';
import { apiRequest } from '../../../lib/api-client';

const teamSchema = z.object({
  name: z.string().trim().min(2),
  shortName: z.string().trim().max(32).optional(),
});
const playerSchema = z.object({
  givenName: z.string().trim().min(1),
  familyName: z.string().trim().min(1),
  defaultJersey: z.coerce.number().int().min(0).max(99).optional(),
  publicVisibility: z.enum(['PRIVATE', 'MEMBERS', 'PUBLIC']).default('PRIVATE'),
});

type TeamValues = z.infer<typeof teamSchema>;
type PlayerValues = z.infer<typeof playerSchema>;
type PlayerInput = z.input<typeof playerSchema>;
type Team = {
  id: string;
  name: string;
  shortName: string | null;
  published: boolean;
  playerCount: number;
  rosterCount: number;
};
type Player = { id: string; givenName: string; familyName: string; defaultJersey: number | null };
type Roster = {
  id: string;
  status: string;
  version: number;
  tournament: { id: string; name: string };
  players: { id: string; playerId: string; jerseyNumber: number; captain: boolean }[];
};
type TeamWorkspace = {
  id: string;
  name: string;
  version: number;
  players: Player[];
  rosters: Roster[];
  tournaments: { id: string; name: string; status: string }[];
};
type PublicTournament = { id: string; name: string; status: string };

export default function TeamsPage() {
  const organization = useOrganization();
  const client = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [selectedRosterId, setSelectedRosterId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [correctionDescription, setCorrectionDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const teams = useQuery({
    queryKey: ['teams', organization.organizationId],
    queryFn: () =>
      apiRequest<{ items: Team[] }>(
        `/management/organizations/${organization.organizationId}/teams`,
        {
          organizationId: organization.organizationId,
        },
      ),
  });
  const publicTournaments = useQuery({
    queryKey: ['public-registration-tournaments'],
    queryFn: () =>
      apiRequest<{ items: PublicTournament[] }>('/public/tournaments?historical=false&limit=100', {
        anonymous: true,
      }),
  });
  const workspace = useQuery({
    queryKey: ['team-workspace', organization.organizationId, selectedTeamId],
    queryFn: () =>
      apiRequest<TeamWorkspace>(
        `/management/organizations/${organization.organizationId}/teams/${selectedTeamId}/workspace`,
        { organizationId: organization.organizationId },
      ),
    enabled: Boolean(selectedTeamId),
  });

  useEffect(() => {
    if (!selectedTeamId && teams.data?.items[0]) setSelectedTeamId(teams.data.items[0].id);
  }, [selectedTeamId, teams.data]);

  const teamForm = useForm<TeamValues>({ resolver: zodResolver(teamSchema) });
  const playerForm = useForm<PlayerInput, unknown, PlayerValues>({
    resolver: zodResolver(playerSchema),
    defaultValues: { publicVisibility: 'PRIVATE' },
  });
  const refreshWorkspace = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['teams', organization.organizationId] }),
      client.invalidateQueries({
        queryKey: ['team-workspace', organization.organizationId, selectedTeamId],
      }),
    ]);
  };
  const createTeam = useMutation({
    mutationFn: (values: TeamValues) =>
      apiRequest<Team>(`/management/organizations/${organization.organizationId}/teams`, {
        method: 'POST',
        organizationId: organization.organizationId,
        body: JSON.stringify(values),
      }),
    onSuccess: async (created) => {
      teamForm.reset();
      setSelectedTeamId(created.id);
      await refreshWorkspace();
    },
  });
  const createPlayer = useMutation({
    mutationFn: (values: PlayerValues) =>
      apiRequest(
        `/management/organizations/${organization.organizationId}/teams/${selectedTeamId}/players`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify(values),
        },
      ),
    onSuccess: async () => {
      playerForm.reset({ publicVisibility: 'PRIVATE' });
      await refreshWorkspace();
    },
  });
  const createRoster = useMutation({
    mutationFn: () =>
      apiRequest(
        `/management/organizations/${organization.organizationId}/teams/${selectedTeamId}/rosters`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({ tournamentId: selectedTournamentId, visibility: 'MEMBERS' }),
        },
      ),
    onSuccess: refreshWorkspace,
  });
  const applyToTournament = useMutation({
    mutationFn: () =>
      apiRequest(
        `/management/organizations/${organization.organizationId}/tournaments/${selectedTournamentId}/teams/${selectedTeamId}/applications`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({ message: 'Submitted through the authorized team workspace.' }),
        },
      ),
  });
  const addRosterPlayer = useMutation({
    mutationFn: () =>
      apiRequest(
        `/management/organizations/${organization.organizationId}/teams/${selectedTeamId}/rosters/${selectedRosterId}/players`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({
            playerId: selectedPlayerId,
            jerseyNumber: Number(jerseyNumber),
            captain: false,
          }),
        },
      ),
    onSuccess: refreshWorkspace,
  });
  const submitRoster = useMutation({
    mutationFn: (roster: Roster) =>
      apiRequest(
        `/management/organizations/${organization.organizationId}/teams/${selectedTeamId}/rosters/${roster.id}/submit`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({
            expectedVersion: roster.version,
            message: 'Submitted for organizer review.',
          }),
        },
      ),
    onSuccess: refreshWorkspace,
  });
  const submitCorrection = useMutation({
    mutationFn: () =>
      apiRequest(
        `/management/organizations/${organization.organizationId}/tournaments/${selectedTournamentId}/teams/${selectedTeamId}/corrections`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({
            resourceType: 'TEAM',
            resourceId: selectedTeamId,
            description: correctionDescription,
          }),
        },
      ),
    onSuccess: () => setCorrectionDescription(''),
  });
  const uploadLogo = useMutation({
    mutationFn: async () => {
      if (!logoFile || !workspace.data) throw new Error('Choose a logo image first.');
      const request = await apiRequest<{
        assetId: string;
        uploadUrl: string;
        requiredHeaders: Record<string, string>;
      }>(
        `/organizations/${organization.organizationId}/media/teams/${selectedTeamId}/upload-requests`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({
            purpose: 'TEAM_LOGO',
            fileName: logoFile.name,
            contentType: logoFile.type,
            byteLength: logoFile.size,
            visibility: 'PUBLIC',
          }),
        },
      );
      const uploaded = await fetch(request.uploadUrl, {
        method: 'PUT',
        headers: request.requiredHeaders,
        body: logoFile,
      });
      if (!uploaded.ok) throw new Error('Object storage rejected the upload.');
      await apiRequest(
        `/organizations/${organization.organizationId}/media/teams/${selectedTeamId}/upload-completions`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({
            assetId: request.assetId,
            checksum: uploaded.headers.get('etag') ?? 'storage-verified',
          }),
        },
      );
      return apiRequest(
        `/organizations/${organization.organizationId}/media/teams/${selectedTeamId}/logo`,
        {
          method: 'POST',
          organizationId: organization.organizationId,
          body: JSON.stringify({
            assetId: request.assetId,
            expectedTeamVersion: workspace.data.version,
          }),
        },
      );
    },
    onSuccess: async () => {
      setLogoFile(null);
      await refreshWorkspace();
    },
  });

  const registrationTournaments =
    publicTournaments.data?.items.filter((item) => item.status === 'REGISTRATION') ?? [];

  return (
    <div className="grid">
      <div>
        <h1>Teams and rosters</h1>
        <p className="muted">Manage only the teams assigned to your account.</p>
      </div>
      {organization.permissions.has('organization.manage') && (
        <section className="card">
          <h2>Create team</h2>
          <form
            className="grid two"
            onSubmit={(event) =>
              void teamForm.handleSubmit((values) => createTeam.mutateAsync(values))(event)
            }
          >
            <div className="field">
              <label htmlFor="team-name">Name</label>
              <input id="team-name" {...teamForm.register('name')} />
            </div>
            <div className="field">
              <label htmlFor="short-name">Short name</label>
              <input id="short-name" {...teamForm.register('shortName')} />
            </div>
            <button className="button" disabled={createTeam.isPending}>
              Create team
            </button>
          </form>
        </section>
      )}
      <section className="card">
        <h2>Authorized team workspace</h2>
        {teams.isPending && <p role="status">Loading teams…</p>}
        {teams.data?.items.length === 0 && (
          <p className="empty-state">No teams are assigned to your account.</p>
        )}
        {teams.data && teams.data.items.length > 0 && (
          <div className="field">
            <label htmlFor="selected-team">Team</label>
            <select
              id="selected-team"
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
            >
              {teams.data.items.map((team) => (
                <option value={team.id} key={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>
      {workspace.data && (
        <>
          <section className="card">
            <h2>Players</h2>
            <form
              className="grid two"
              onSubmit={(event) =>
                void playerForm.handleSubmit((values) => createPlayer.mutateAsync(values))(event)
              }
            >
              <div className="field">
                <label htmlFor="given-name">Given name</label>
                <input id="given-name" {...playerForm.register('givenName')} />
              </div>
              <div className="field">
                <label htmlFor="family-name">Family name</label>
                <input id="family-name" {...playerForm.register('familyName')} />
              </div>
              <div className="field">
                <label htmlFor="jersey">Default jersey</label>
                <input
                  id="jersey"
                  type="number"
                  min="0"
                  max="99"
                  {...playerForm.register('defaultJersey')}
                />
              </div>
              <div className="field">
                <label htmlFor="player-visibility">Public visibility</label>
                <select id="player-visibility" {...playerForm.register('publicVisibility')}>
                  <option>PRIVATE</option>
                  <option>MEMBERS</option>
                  <option>PUBLIC</option>
                </select>
              </div>
              <button className="button" disabled={createPlayer.isPending}>
                Add player
              </button>
            </form>
            {workspace.data.players.length === 0 ? (
              <p className="empty-state">No players have been added.</p>
            ) : (
              <ul>
                {workspace.data.players.map((player) => (
                  <li key={player.id}>
                    {player.givenName} {player.familyName}
                    {player.defaultJersey === null ? '' : ` — #${player.defaultJersey}`}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card">
            <h2>Registration and rosters</h2>
            <div className="grid two">
              <div className="field">
                <label htmlFor="selected-tournament">Tournament</label>
                <select
                  id="selected-tournament"
                  value={selectedTournamentId}
                  onChange={(event) => setSelectedTournamentId(event.target.value)}
                >
                  <option value="">Select a tournament</option>
                  {registrationTournaments.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name} (registration open)
                    </option>
                  ))}
                  {workspace.data.tournaments.map((item) => (
                    <option value={item.id} key={`registered-${item.id}`}>
                      {item.name} (registered)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  className="button secondary"
                  type="button"
                  disabled={!selectedTournamentId || applyToTournament.isPending}
                  onClick={() => applyToTournament.mutate()}
                >
                  Submit team application
                </button>{' '}
                <button
                  className="button"
                  type="button"
                  disabled={!selectedTournamentId || createRoster.isPending}
                  onClick={() => createRoster.mutate()}
                >
                  Create roster
                </button>
              </div>
            </div>
            {applyToTournament.isSuccess && <p role="status">Team application submitted.</p>}
            {workspace.data.rosters.length === 0 ? (
              <p className="empty-state">No tournament rosters exist.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Tournament</th>
                      <th>Status</th>
                      <th>Players</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.data.rosters.map((roster) => (
                      <tr key={roster.id}>
                        <td>{roster.tournament.name}</td>
                        <td>{roster.status}</td>
                        <td>{roster.players.length}</td>
                        <td>
                          {['DRAFT', 'CHANGES_REQUESTED'].includes(roster.status) && (
                            <button
                              className="button"
                              type="button"
                              disabled={roster.players.length === 0 || submitRoster.isPending}
                              onClick={() => submitRoster.mutate(roster)}
                            >
                              Submit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="grid two">
              <div className="field">
                <label htmlFor="roster">Roster</label>
                <select
                  id="roster"
                  value={selectedRosterId}
                  onChange={(event) => setSelectedRosterId(event.target.value)}
                >
                  <option value="">Select</option>
                  {workspace.data.rosters
                    .filter((item) => ['DRAFT', 'CHANGES_REQUESTED'].includes(item.status))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.tournament.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="roster-player">Player</label>
                <select
                  id="roster-player"
                  value={selectedPlayerId}
                  onChange={(event) => setSelectedPlayerId(event.target.value)}
                >
                  <option value="">Select</option>
                  {workspace.data.players.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.givenName} {item.familyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="roster-jersey">Jersey</label>
                <input
                  id="roster-jersey"
                  type="number"
                  min="0"
                  max="99"
                  value={jerseyNumber}
                  onChange={(event) => setJerseyNumber(event.target.value)}
                />
              </div>
              <button
                className="button secondary"
                type="button"
                disabled={
                  !selectedRosterId ||
                  !selectedPlayerId ||
                  !jerseyNumber ||
                  addRosterPlayer.isPending
                }
                onClick={() => addRosterPlayer.mutate()}
              >
                Add to roster
              </button>
            </div>
          </section>
          <section className="card">
            <h2>Team logo and correction request</h2>
            <div className="field">
              <label htmlFor="logo">Replacement logo</label>
              <input
                id="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <button
              className="button secondary"
              type="button"
              disabled={!logoFile || uploadLogo.isPending}
              onClick={() => uploadLogo.mutate()}
            >
              Upload logo
            </button>
            <div className="field">
              <label htmlFor="correction-description">Correction request</label>
              <textarea
                id="correction-description"
                rows={4}
                minLength={10}
                value={correctionDescription}
                onChange={(event) => setCorrectionDescription(event.target.value)}
              />
            </div>
            <button
              className="button secondary"
              type="button"
              disabled={
                !selectedTournamentId ||
                correctionDescription.trim().length < 10 ||
                submitCorrection.isPending
              }
              onClick={() => submitCorrection.mutate()}
            >
              Submit correction request
            </button>
          </section>
        </>
      )}
    </div>
  );
}
