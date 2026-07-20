import type { ApiError, ApiSuccess } from '@tournament/contracts';
import { publicConfig } from './config';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith('tp_csrf='))
    ?.slice('tp_csrf='.length);
}

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues: readonly { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { organizationId?: string; anonymous?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('accept', 'application/json');
  if (options.body) headers.set('content-type', 'application/json');
  if (accessToken && !options.anonymous) headers.set('authorization', `Bearer ${accessToken}`);
  if (options.organizationId) headers.set('x-organization-id', options.organizationId);
  const csrf = csrfToken();
  if (csrf && !['GET', 'HEAD'].includes(options.method ?? 'GET'))
    headers.set('x-csrf-token', decodeURIComponent(csrf));
  const response = await fetch(`${publicConfig.apiUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiError | null;
  if (!response.ok || !body?.success) {
    const error = body?.success === false ? body.error : undefined;
    throw new ApiClientError(
      response.status,
      error?.code ?? 'NETWORK_RESPONSE_ERROR',
      error?.message ?? 'The server returned an invalid response',
      error?.issues ?? [],
    );
  }
  return body.data;
}

export async function restoreSession(): Promise<SessionData | null> {
  try {
    const data = await apiRequest<SessionData>('/auth/refresh', {
      method: 'POST',
      body: '{}',
      anonymous: true,
    });
    setAccessToken(data.accessToken);
    return data;
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function downloadAuthorizedCsv(
  path: string,
  organizationId: string,
  fileName: string,
): Promise<void> {
  const headers = new Headers({ accept: 'text/csv', 'x-organization-id': organizationId });
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${publicConfig.apiUrl}${path}`, {
    headers,
    credentials: 'include',
  });
  if (!response.ok)
    throw new ApiClientError(
      response.status,
      'EXPORT_FAILED',
      'The authorized export could not be created',
    );
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export type SessionData = {
  accessToken: string;
  accessTokenExpiresIn: number;
  sessionId: string;
  user: { id: string; email: string; displayName: string; platformSuperAdmin: boolean };
};
