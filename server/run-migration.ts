import { supabaseAdmin } from './supabase.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sql = readFileSync(resolve(__dirname, 'migrate.sql'), 'utf-8');

async function run() {
  const { error } = await supabaseAdmin.rpc('exec_sql', { query: sql });
  if (error) {
    // Fallback: try direct SQL via REST
    console.log('RPC not available, trying direct SQL...');
    const { error: sqlErr } = await supabaseAdmin.from('_sql').select('*').then(async () => {
      const { data, error } = await supabaseAdmin.rpc('pgql', { query: sql });
      if (error) throw error;
      return data;
    }).catch(async () => {
      // Try raw query
      const { data, error } = await supabaseAdmin.from('appointments').select('id').limit(1);
      if (error) throw error;
      // If we got here, connection works but we need SQL execution
      console.log('Connected to Supabase. SQL execution not available via REST API.');
      console.log('Please run the following SQL in Supabase Dashboard → SQL Editor:');
      console.log('---');
      console.log(sql);
      return null;
    });
    return;
  }
  console.log('Migration completed successfully!');
}

run().catch(console.error);
