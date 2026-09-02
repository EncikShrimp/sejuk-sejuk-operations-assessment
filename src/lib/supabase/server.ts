import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ServerSupabaseClient = SupabaseClient;

export function hasSupabaseConfiguration(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createServerSupabaseClient(): ServerSupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase is not configured for server persistence.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
