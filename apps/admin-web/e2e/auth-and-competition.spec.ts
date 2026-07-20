import { expect, test } from '@playwright/test';

test('administrator can sign in and create a tournament', async ({ page }) => {
  const envelope = (data: object) => ({
    success: true,
    data,
    meta: {
      correlationId: '00000000-0000-4000-a000-000000000000',
      timestamp: new Date().toISOString(),
    },
  });
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'INVALID_SESSION', message: 'Session is invalid' },
        meta: {
          correlationId: '00000000-0000-4000-a000-000000000000',
          timestamp: new Date().toISOString(),
        },
      }),
    }),
  );
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        envelope({
          accessToken: 'test-access',
          accessTokenExpiresIn: 900,
          sessionId: '00000000-0000-4000-a000-000000000001',
          user: {
            id: '00000000-0000-4000-a000-000000000002',
            email: 'admin@example.test',
            displayName: 'Admin',
            platformSuperAdmin: false,
          },
        }),
      ),
    }),
  );
  await page.route('**/api/v1/me/access', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        envelope({
          platformSuperAdmin: false,
          memberships: [
            {
              organization: { id: '00000000-0000-4000-a000-000000000003', name: 'Organization' },
              roles: [
                {
                  key: 'organization-admin',
                  permissions: ['organization.manage', 'tournament.manage'],
                },
              ],
            },
          ],
        }),
      ),
    }),
  );
  let tournaments: object[] = [];
  await page.route('**/api/v1/management/organizations/*/tournaments', async (route) => {
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON() as { name: string };
      tournaments = [
        {
          id: '00000000-0000-4000-a000-000000000004',
          name: input.name,
          status: 'DRAFT',
          published: false,
          startsAt: '2026-08-01T10:00:00.000Z',
          endsAt: '2026-08-02T10:00:00.000Z',
          version: 1,
        },
      ];
      const createdTournament = tournaments[0];
      if (!createdTournament) throw new Error('Tournament fixture was not created');
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(envelope(createdTournament)),
      });
    } else
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(envelope({ items: tournaments })),
      });
  });

  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@example.test');
  await page.getByLabel('Password').fill('valid-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('/competitions');
  await page.getByLabel('Name').fill('City Championship');
  await page.getByLabel('Public slug').fill('city-championship');
  await page.getByLabel('Starts').fill('2026-08-01T10:00');
  await page.getByLabel('Ends').fill('2026-08-02T10:00');
  await page.getByRole('button', { name: 'Create tournament' }).click();
  await expect(page.getByText('City Championship')).toBeVisible();
});

test('organizer can approve a team application with a recorded reason', async ({ page }) => {
  const envelope = (data: object) => ({
    success: true,
    data,
    meta: {
      correlationId: '00000000-0000-4000-a000-000000000010',
      timestamp: new Date().toISOString(),
    },
  });
  const organizationId = '00000000-0000-4000-a000-000000000011';
  const tournamentId = '00000000-0000-4000-a000-000000000012';
  let status = 'OPEN';
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'INVALID_SESSION', message: 'Session is invalid' },
        meta: {
          correlationId: '00000000-0000-4000-a000-000000000010',
          timestamp: new Date().toISOString(),
        },
      }),
    }),
  );
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        envelope({
          accessToken: 'test-access',
          accessTokenExpiresIn: 900,
          sessionId: '00000000-0000-4000-a000-000000000013',
          user: {
            id: '00000000-0000-4000-a000-000000000014',
            email: 'organizer@example.test',
            displayName: 'Organizer',
            platformSuperAdmin: false,
          },
        }),
      ),
    }),
  );
  await page.route('**/api/v1/me/access', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        envelope({
          platformSuperAdmin: false,
          memberships: [
            {
              organization: { id: organizationId, name: 'Organization' },
              roles: [{ key: 'organizer', permissions: ['tournament.manage'] }],
            },
          ],
        }),
      ),
    }),
  );
  await page.route(`**/api/v1/management/organizations/${organizationId}/tournaments`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(envelope({ items: [{ id: tournamentId, name: 'City Championship' }] })),
    }),
  );
  await page.route(
    '**/api/v1/management/organizations/*/tournaments/*/team-applications**',
    async (route) => {
      if (route.request().method() === 'POST') status = 'APPROVED';
      const data =
        route.request().method() === 'POST'
          ? { id: '00000000-0000-4000-a000-000000000015', status }
          : {
              items: [
                {
                  id: '00000000-0000-4000-a000-000000000015',
                  status,
                  message: 'Ready to compete',
                  team: {
                    id: '00000000-0000-4000-a000-000000000016',
                    name: 'Falcons',
                    shortName: 'FAL',
                  },
                  submittedBy: {
                    email: 'manager@example.test',
                    profile: { displayName: 'Team Manager' },
                  },
                },
              ],
            };
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(envelope(data)),
      });
    },
  );
  await page.route('**/api/v1/management/organizations/*/tournaments/*/corrections', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(envelope({ items: [] })),
    }),
  );

  await page.goto('/login');
  await page.getByLabel('Email address').fill('organizer@example.test');
  await page.getByLabel('Password').fill('valid-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('/requests');
  await expect(page.getByText('Falcons')).toBeVisible();
  await page.getByLabel('Decision reason').fill('Eligibility and payment verified.');
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('cell', { name: 'APPROVED' })).toBeVisible();
});
