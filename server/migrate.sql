ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_origen_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_origen_check CHECK (origen IN ('MANUAL', 'IA', 'WHATSAPP', 'WEB', 'LABORATORIO'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'WHATSAPP';
