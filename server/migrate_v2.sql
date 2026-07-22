-- ============================================================================
-- MIGRATION V2: Availability Engine + Booking Sessions + Professional Booking
-- ============================================================================
-- Execute this SQL in the Supabase Dashboard SQL Editor.
-- 
-- PENDIENTE EJECUTAR EN SUPABASE
-- ============================================================================

-- 1. EMPLOYEE-SERVICE MAPPING
CREATE TABLE IF NOT EXISTS employee_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  UNIQUE(employee_id, service_id)
);

-- 2. BLOCKS (business-wide or per-employee)
CREATE TABLE IF NOT EXISTS blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'break',
  block_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 3. EMPLOYEE SCHEDULES (per-employee day overrides)
CREATE TABLE IF NOT EXISTS employee_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_working BOOLEAN NOT NULL DEFAULT true,
  start_time TEXT,
  end_time TEXT,
  UNIQUE(employee_id, day_of_week)
);

-- 4. BOOKING SESSIONS (persistent booking state, survives server restart)
CREATE TABLE IF NOT EXISTS booking_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'IDLE' 
    CHECK (state IN ('IDLE','WAITING_SERVICE','WAITING_DATE','WAITING_TIME','WAITING_CONFIRMATION','CONFIRMED','CANCELLED','EXPIRED')),
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  requested_date DATE,
  requested_time TEXT,
  start_time TEXT,
  end_time TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  UNIQUE(business_id, conversation_id)
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_blocks_date ON blocks(business_id, block_date);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_lookup ON employee_schedules(employee_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_active ON booking_sessions(business_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_appointments_overlap ON appointments(business_id, employee_id, fecha, hora);

-- 6. RLS POLICIES (service_role bypasses these; they protect anon-key access)
ALTER TABLE employee_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_access_employee_services" ON employee_services;
CREATE POLICY "business_access_employee_services" ON employee_services
  USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "business_access_blocks" ON blocks;
CREATE POLICY "business_access_blocks" ON blocks
  USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "business_access_employee_schedules" ON employee_schedules;
CREATE POLICY "business_access_employee_schedules" ON employee_schedules
  USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "business_access_booking_sessions" ON booking_sessions;
CREATE POLICY "business_access_booking_sessions" ON booking_sessions
  USING (business_id = get_user_business_id());

-- 7. ATOMIC BOOKING RPC (concurrent-safe appointment creation)
-- This function checks availability and creates an appointment in one transaction,
-- preventing double-booking even with concurrent requests.
CREATE OR REPLACE FUNCTION book_appointment(
  p_business_id UUID,
  p_customer_id UUID,
  p_employee_id UUID,
  p_servicio_id UUID,
  p_fecha DATE,
  p_hora TEXT,
  p_origen TEXT DEFAULT 'IA',
  p_notes TEXT DEFAULT 'Creado por Asistente IA.'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_service_duration INT;
  v_end_time TEXT;
  v_existing_count INT;
  v_appointment JSONB;
BEGIN
  -- Get service duration
  SELECT duracion INTO v_service_duration FROM services WHERE id = p_servicio_id;
  IF v_service_duration IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Servicio no encontrado');
  END IF;

  -- Compute end_time
  v_end_time := (EXTRACT(HOUR FROM p_hora::time) * 60 + EXTRACT(MINUTE FROM p_hora::time) + v_service_duration)::text;
  -- Actually compute proper end time
  v_end_time := to_char((p_hora::time + (v_service_duration || ' minutes')::interval), 'HH24:MI');

  -- Lock the appointments table to prevent concurrent inserts
  LOCK TABLE appointments IN EXCLUSIVE MODE;

  -- Check for overlapping appointments (same employee, same date)
  SELECT COUNT(*) INTO v_existing_count
  FROM appointments
  WHERE business_id = p_business_id
    AND employee_id = p_employee_id
    AND fecha = p_fecha
    AND estado != 'cancelled'
    AND (
      -- New start < existing end AND new end > existing start
      (p_hora::time < (hora::time + (SELECT COALESCE(duracion, 30) FROM services WHERE id = servicio_id) * interval '1 minute'))
      AND
      ((p_hora::time + (v_service_duration * interval '1 minute')) > hora::time)
    );

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'El horario seleccionado ya está ocupado.');
  END IF;

  -- Check for blocks
  SELECT COUNT(*) INTO v_existing_count
  FROM blocks
  WHERE business_id = p_business_id
    AND (employee_id IS NULL OR employee_id = p_employee_id)
    AND block_date = p_fecha
    AND start_time::time < (p_hora::time + (v_service_duration * interval '1 minute'))
    AND end_time::time > p_hora::time;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'El horario seleccionado está bloqueado.');
  END IF;

  -- Insert appointment
  INSERT INTO appointments (
    business_id, customer_id, employee_id, servicio_id, fecha, hora,
    estado, origen, notes, price_charged
  ) VALUES (
    p_business_id, p_customer_id, p_employee_id, p_servicio_id, p_fecha, p_hora,
    'pending', p_origen, p_notes,
    (SELECT precio FROM services WHERE id = p_servicio_id)
  )
  RETURNING jsonb_build_object(
    'success', true,
    'id', id,
    'business_id', business_id,
    'customer_id', customer_id,
    'employee_id', employee_id,
    'fecha', fecha::text,
    'hora', hora,
    'estado', estado,
    'origen', origen,
    'price_charged', price_charged
  ) INTO v_appointment;

  RETURN v_appointment;
END;
$$;

-- 8. UPDATE settings.horarios to support split hours (add column to existing JSONB)
-- This is informational — the default JSONB already works. Split hours are optional.
-- Example settings.horarios with split hours:
-- {
--   "start": "09:00",
--   "end": "20:30", 
--   "open_days": [1,2,3,4,5,6],
--   "slot_interval_minutes": 15,
--   "use_split_hours": false,
--   "split_hours": {
--     "morning_start": "09:00",
--     "morning_end": "14:00",
--     "afternoon_start": "16:00",
--     "afternoon_end": "20:00"
--   }
-- }
