import { supabaseAdmin } from './supabase.js';

const sql1 = `ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_origen_check`;
const sql2 = `ALTER TABLE appointments ADD CONSTRAINT appointments_origen_check CHECK (origen IN ('MANUAL', 'IA', 'WHATSAPP', 'WEB', 'LABORATORIO'))`;
const sql3 = `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'WHATSAPP'`;

async function run() {
  for (const sql of [sql1, sql2, sql3]) {
    const { error } = await supabaseAdmin.rpc('exec_sql', { query: sql });
    if (error) {
      console.log(`RPC error for: ${sql.substring(0, 60)}...`);
      console.log(error.message);
    } else {
      console.log(`OK: ${sql.substring(0, 60)}...`);
    }
  }
  console.log('Migration finished. If RPC failed, run this SQL in Supabase Dashboard SQL Editor:');
  console.log('---');
  console.log(sql1 + ';');
  console.log(sql2 + ';');
  console.log(sql3 + ';');
}

run().catch(console.error);
