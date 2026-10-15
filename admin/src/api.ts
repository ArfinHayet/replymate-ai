import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in admin/.env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new ApiError('Your session has expired. Sign in again.', 401);
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(message || `Request failed (${response.status})`, response.status);
  }
  return response.json() as Promise<T>;
}
