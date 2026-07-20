'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useOrganization } from '../../../components/portal-shell';
import { apiRequest } from '../../../lib/api-client';

export default function AnnouncementsPage() {
  const organization = useOrganization();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [published, setPublished] = useState(false);
  const create = useMutation({
    mutationFn: () =>
      apiRequest(`/management/organizations/${organization.organizationId}/announcements`, {
        method: 'POST',
        organizationId: organization.organizationId,
        body: JSON.stringify({ title, body, published }),
      }),
    onSuccess: () => {
      setTitle('');
      setBody('');
      setPublished(false);
    },
  });
  return (
    <div className="grid">
      <div>
        <h1>Announcements</h1>
        <p className="muted">Publish immediately or keep private while content is reviewed.</p>
      </div>
      <section className="card">
        <form
          className="grid"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="field">
            <label htmlFor="announcement-title">Title</label>
            <input
              id="announcement-title"
              required
              minLength={2}
              maxLength={180}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="announcement-body">Message</label>
            <textarea
              id="announcement-body"
              required
              rows={8}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
          <label>
            <input
              type="checkbox"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
            />{' '}
            Publish to public channels
          </label>
          <button className="button" disabled={create.isPending}>
            Save announcement
          </button>
          {create.isSuccess && <p role="status">Announcement saved.</p>}
          {create.isError && (
            <div className="error-banner" role="alert">
              {create.error.message}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
