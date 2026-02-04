import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type PricingRow = {
  id: string;
  device_id: string;
  games: unknown;
  current_game_id: string | null;
  named_profiles: unknown;
  updated_at: string;
};
