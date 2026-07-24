// In dev, Vite proxies /api/* to localhost:5000 — no CORS needed.
// In production, set VITE_API_URL in the project-root .env or hosting environment.
// NOTE: Vite only exposes env vars with the VITE_ prefix; server/.env is NOT read by Vite.
function resolveApiBase(): string {
  const configured = String(import.meta.env.VITE_API_URL || '').trim();

  if (typeof window === 'undefined') {
    return configured;
  }

  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const configuredLooksLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured);

  if (configured && !(configuredLooksLocal && !isLocalHost)) {
    return configured;
  }

  if (!isLocalHost) {
    return 'https://server.drauwper.com';
  }

  return 'http://localhost:5000';
}

const API_BASE = resolveApiBase();
// const API_BASE = 'http://localhost:4000';

const TOKEN_KEY = 'drauwper_token';
const USER_KEY = 'drauwper_user';

function isTokenExpiredPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const payload = data as { success?: unknown; message?: unknown; error?: unknown };
  const message = String(payload.message || payload.error || '').toLowerCase();
  const explicitlyFailed = payload.success === false;
  if (!message) return false;
  return explicitlyFailed && /invalid|expired/.test(message) && /token/.test(message);
}

function forceClientLogout(reason = 'Your session has expired. Please sign in again.'): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // No-op: clearing auth storage should never crash the request pipeline.
  }

  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('drauwper:auth-expired', { detail: { reason } }));

  const isAlreadyOnLogin = /^\/login\/?$/i.test(window.location.pathname);
  if (!isAlreadyOnLogin) {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const redirect = `/login?reason=session-expired&next=${encodeURIComponent(next)}`;
    window.location.replace(redirect);
  }
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    console.log(`API Request: ${API_BASE}${path} -`, options.method || 'GET', path, options.body ? JSON.parse(options.body as string) : '');

    const data = await res.json();

    if (isTokenExpiredPayload(data) || res.status === 401) {
      forceClientLogout(String((data as { message?: string })?.message || 'Invalid or expired token'));
      throw new ApiError('Invalid or expired token', 401, data);
    }

    if (!res.ok) {
      throw new ApiError(data.message || res.statusText, res.status, data);
    }

    return data as T;
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  /** Upload multipart/form-data (bypasses Content-Type: application/json) */
  async upload<T>(path: string, formData: FormData): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (isTokenExpiredPayload(data) || res.status === 401) {
      forceClientLogout(String((data as { message?: string })?.message || 'Invalid or expired token'));
      throw new ApiError('Invalid or expired token', 401, data);
    }
    if (!res.ok) throw new ApiError(data.message || res.statusText, res.status, data);
    return data as T;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient();
