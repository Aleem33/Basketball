import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { vi, expect, test } from 'vitest';
import LoginPage from '../app/login/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('../components/providers', () => ({ useAuth: () => ({ session: null, login: vi.fn() }) }));

test('login form has no basic accessibility violations', async () => {
  const client = new QueryClient();
  const { container } = render(
    <QueryClientProvider client={client}>
      <LoginPage />
    </QueryClientProvider>,
  );
  expect(screen.getByLabelText('Email address')).toHaveAttribute('type', 'email');
  expect(await axe(container)).toHaveNoViolations();
});
