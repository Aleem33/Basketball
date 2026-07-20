'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useOrganization } from '../../../components/portal-shell';
import { apiRequest } from '../../../lib/api-client';

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  outcome: string;
  resourceType: string;
  actor: { email: string } | null;
  correlationId: string;
};

export default function AuditPage() {
  const organization = useOrganization();
  const [search, setSearch] = useState('');
  const rows = useQuery({
    queryKey: ['audit', organization.organizationId, search],
    queryFn: () =>
      apiRequest<{ items: AuditRow[] }>(
        `/management/organizations/${organization.organizationId}/audit${search ? `?search=${encodeURIComponent(search)}` : ''}`,
        { organizationId: organization.organizationId },
      ),
  });
  return (
    <div className="grid">
      <div>
        <h1>Audit log</h1>
        <p className="muted">
          Security-sensitive and elevated actions are immutable and correlation searchable.
        </p>
      </div>
      <section className="card">
        <div className="field">
          <label htmlFor="audit-search">Action, resource, or correlation ID</label>
          <input
            id="audit-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {rows.isPending && <p role="status">Loading audit records…</p>}
        {rows.data?.items.length === 0 && (
          <p className="empty-state">No audit records match this search.</p>
        )}
        {rows.data && rows.data.items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Resource</th>
                  <th>Outcome</th>
                  <th>Correlation</th>
                </tr>
              </thead>
              <tbody>
                {rows.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td>{row.action}</td>
                    <td>{row.actor?.email ?? 'System'}</td>
                    <td>{row.resourceType}</td>
                    <td>{row.outcome}</td>
                    <td>
                      <code>{row.correlationId}</code>
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
