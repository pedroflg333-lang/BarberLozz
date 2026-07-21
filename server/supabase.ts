import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for user-facing operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for backend operations (bypasses RLS via service_role)
const activeKey = serviceRoleKey || supabaseAnonKey;
export const supabaseAdmin = createClient(supabaseUrl, activeKey);

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  supabaseUrl !== 'https://your-project.supabase.co';
