-- Migration V3: Public booking + new appointment statuses

-- 1. Add new statuses to appointments
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_estado_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_estado_check
  CHECK (estado IN ('pending', 'confirmed', 'rejected', 'completed', 'cancelled'));

-- 2. Add slug column to businesses for public booking URLs
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Auto-generate slugs for existing businesses from their name
UPDATE public.businesses SET slug = lower(regexp_replace(regexp_replace(nombre, '[^a-zA-Z0-9\\s]', '', 'g'), '\\s+', '-', 'g'))
WHERE slug IS NULL;

-- 3. Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
