import { getAccessToken } from '../../lib/supabase';
import { ApiError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function buildHeaders(includeAuth = true): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    // 204 No Content
    if (response.status === 204) return undefined as unknown as T;
    return response.json() as Promise<T>;
  }

  let errorBody: { error?: string; message?: string; details?: Record<string, string[]> } = {};
  try {
    errorBody = await response.json();
  } catch {
    errorBody = { message: response.statusText };
  }

  const message = errorBody.message || errorBody.error || `HTTP ${response.status}`;

  switch (response.status) {
    case 400:
      throw new ValidationError(message, errorBody.details);
    case 401:
      throw new UnauthorizedError(message);
    case 403:
      throw new ForbiddenError(message);
    case 404:
      throw new NotFoundError(message);
    default:
      throw new ApiError(message, response.status);
  }
}

export async function httpGet<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const headers = await buildHeaders();
  const response = await fetch(url.toString(), { method: 'GET', headers });
  return handleResponse<T>(response);
}

export async function httpGetPublic<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const headers = await buildHeaders(false);
  const response = await fetch(url.toString(), { method: 'GET', headers });
  return handleResponse<T>(response);
}

export async function httpPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await buildHeaders();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function httpPatch<T>(path: string, body?: unknown): Promise<T> {
  const headers = await buildHeaders();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function httpDelete<T>(path: string): Promise<T> {
  const headers = await buildHeaders();
  const response = await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers });
  return handleResponse<T>(response);
}
