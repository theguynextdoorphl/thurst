import Constants from 'expo-constants';
import type { Me } from '@thurst/shared';

/**
 * The API lives on port 4000 of the machine running the dev server unless
 * EXPO_PUBLIC_API_URL says otherwise, so a phone on the same Wi-Fi just works.
 */
function defaultBase(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:4000`;
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultBase();

let token: string | null = null;
export const setApiToken = (t: string | null) => {
  token = t;
};
export const authHeaders = (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {});

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }), ...authHeaders() },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach Thurst. Check your connection.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong');
  return data as T;
}

export type AuthResponse = { token: string; me: Me };
