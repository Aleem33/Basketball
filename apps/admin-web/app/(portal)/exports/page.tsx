'use client';

import { useState } from 'react';
import { useOrganization } from '../../../components/portal-shell';
import { downloadAuthorizedCsv } from '../../../lib/api-client';

const resources = ['teams', 'games', 'rosters', 'audit'] as const;

export default function ExportsPage() {
  const organization = useOrganization();
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState('');
  const download = async (resource: (typeof resources)[number]) => {
    setError('');
    setActive(resource);
    try {
      await downloadAuthorizedCsv(
        `/management/organizations/${organization.organizationId}/exports/${resource}`,
        organization.organizationId,
        `${resource}.csv`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Export failed.');
    } finally {
      setActive(null);
    }
  };
  return (
    <div className="grid">
      <div>
        <h1>Authorized CSV exports</h1>
        <p className="muted">
          Exports contain only live records from the selected organization and are protected against
          spreadsheet formula injection.
        </p>
      </div>
      <section className="card">
        <h2>Datasets</h2>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <div>
          {resources.map((resource) => (
            <button
              key={resource}
              className="button secondary"
              type="button"
              disabled={active !== null}
              onClick={() => void download(resource)}
            >
              {active === resource ? 'Preparing…' : `Download ${resource}`}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
