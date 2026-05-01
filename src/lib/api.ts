// In dev, Vite proxies /api/* to localhost:4000 — no CORS needed.
// In production, set VITE_API_URL in the project-root .env (e.g. VITE_API_URL=https://api.drauwpr.com).
// NOTE: Vite only exposes env vars with the VITE_ prefix; server/.env is NOT read by Vite.
const API_BASE = import.meta.env.VITE_API_URL || '';
// const API_BASE = 'http://localhost:4000';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('drauwper_token');
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
