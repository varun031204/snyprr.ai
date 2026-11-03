/**
 * lib/apiClient.ts
 *
 * Thin convenience wrapper around the existing httpClient utilities.
 * Provides a consistent { get, post, patch, del } API surface
 * used by React Query hooks.
 */

import { httpGet, httpPost, httpPatch, httpDelete } from '../services/api/httpClient';

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    httpGet<T>(path, params),

  post: <T>(path: string, body?: unknown) =>
    httpPost<T>(path, body),

  patch: <T>(path: string, body?: unknown) =>
    httpPatch<T>(path, body),

  del: <T>(path: string) =>
    httpDelete<T>(path),
};
