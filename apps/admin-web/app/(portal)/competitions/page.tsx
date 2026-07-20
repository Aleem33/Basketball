'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useOrganization } from '../../../components/portal-shell';
import { apiRequest } from '../../../lib/api-client';
import { tournamentFormSchema, type TournamentFormValues } from '../../../lib/tournament-form';
type Tournament = {
  id: string;
  name: string;
  status: string;
  published: boolean;
  startsAt: string;
  endsAt: string;
  version: number;
};

export default function CompetitionsPage() {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const tournaments = useQuery({
    queryKey: ['tournaments', organization.organizationId],
    queryFn: () =>
      apiRequest<{ items: Tournament[] }>(
        `/management/organizations/${organization.organizationId}/tournaments`,
        { organizationId: organization.organizationId },
      ),
  });
  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: { timezone: 'UTC' },
  });
  const create = useMutation({
    mutationFn: (values: TournamentFormValues) =>
      apiRequest(`/management/organizations/${organization.organizationId}/tournaments`, {
        method: 'POST',
        organizationId: organization.organizationId,
        body: JSON.stringify({
          ...values,
          startsAt: new Date(values.startsAt).toISOString(),
          endsAt: new Date(values.endsAt).toISOString(),
        }),
      }),
    onSuccess: async () => {
      form.reset({ timezone: 'UTC' });
      await queryClient.invalidateQueries({
        queryKey: ['tournaments', organization.organizationId],
      });
    },
  });

  return (
    <div className="grid">
      <div>
        <h1>Competitions</h1>
        <p className="muted">
          Create tournaments, then configure divisions, stages, rules, schedules, and publication.
        </p>
      </div>
      <section className="card" aria-labelledby="new-tournament">
        <h2 id="new-tournament">New tournament</h2>
        {create.isError && (
          <div className="error-banner" role="alert">
            {create.error.message}
          </div>
        )}
        <form
          className="grid two"
          onSubmit={(event) =>
            void form.handleSubmit((values) => create.mutateAsync(values))(event)
          }
          noValidate
        >
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              {...form.register('name')}
              aria-invalid={Boolean(form.formState.errors.name)}
            />
            {form.formState.errors.name && <span className="field-error">Name is required.</span>}
          </div>
          <div className="field">
            <label htmlFor="slug">Public slug</label>
            <input
              id="slug"
              {...form.register('slug')}
              aria-invalid={Boolean(form.formState.errors.slug)}
            />
            {form.formState.errors.slug && (
              <span className="field-error">Use lowercase words separated by hyphens.</span>
            )}
          </div>
          <div className="field">
            <label htmlFor="startsAt">Starts</label>
            <input id="startsAt" type="datetime-local" {...form.register('startsAt')} />
          </div>
          <div className="field">
            <label htmlFor="endsAt">Ends</label>
            <input
              id="endsAt"
              type="datetime-local"
              {...form.register('endsAt')}
              aria-invalid={Boolean(form.formState.errors.endsAt)}
            />
            {form.formState.errors.endsAt && (
              <span className="field-error">{form.formState.errors.endsAt.message}</span>
            )}
          </div>
          <div className="field">
            <label htmlFor="timezone">Time zone</label>
            <input id="timezone" {...form.register('timezone')} />
          </div>
          <div className="field">
            <span aria-hidden="true">&nbsp;</span>
            <button className="button" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create tournament'}
            </button>
          </div>
        </form>
      </section>
      <section className="card" aria-labelledby="tournament-list">
        <h2 id="tournament-list">Tournament records</h2>
        {tournaments.isPending && <p role="status">Loading tournaments…</p>}
        {tournaments.isError && (
          <div className="error-banner" role="alert">
            Tournament records could not be loaded.
          </div>
        )}
        {tournaments.data?.items.length === 0 && (
          <p className="empty-state">No tournaments have been created.</p>
        )}
        {tournaments.data && tournaments.data.items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th>Visibility</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.status}</td>
                    <td>
                      {new Date(item.startsAt).toLocaleDateString()} –{' '}
                      {new Date(item.endsAt).toLocaleDateString()}
                    </td>
                    <td>{item.published ? 'Published' : 'Private'}</td>
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
