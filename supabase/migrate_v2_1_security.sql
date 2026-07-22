-- ============================================================================
-- MIGRATION V2.1: Multi-tenant security for book_appointment RPC
-- ============================================================================
-- Adds business_id ownership validation before inserting appointments.
-- Prevents cross-tenant booking (e.g., customer from business A booked into business B).
--
-- Execute in Supabase Dashboard SQL Editor after migrate_v2.sql.
-- ============================================================================

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
  v_customer_biz UUID;
  v_employee_biz UUID;
  v_service_biz UUID;
BEGIN
  -- ==========================================================================
  -- MULTI-TENANT VALIDATION: Verify all entities belong to p_business_id
  -- ==========================================================================

  -- 1. Validate customer belongs to the business
  SELECT business_id INTO v_customer_biz FROM customers WHERE id = p_customer_id;
  IF v_customer_biz IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cliente no encontrado.');
  END IF;
  IF v_customer_biz != p_business_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'El cliente no pertenece a este negocio.');
  END IF;

  -- 2. Validate employee belongs to the business
  SELECT business_id INTO v_employee_biz FROM employees WHERE id = p_employee_id;
  IF v_employee_biz IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Empleado no encontrado.');
  END IF;
  IF v_employee_biz != p_business_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'El empleado no pertenece a este negocio.');
  END IF;

  -- 3. Validate service belongs to the business
  SELECT business_id INTO v_service_biz FROM services WHERE id = p_servicio_id;
  IF v_service_biz IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Servicio no encontrado.');
  END IF;
  IF v_service_biz != p_business_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'El servicio no pertenece a este negocio.');
  END IF;

  -- ==========================================================================
  -- EXISTING LOGIC (unchanged)
  -- ==========================================================================

  -- Get service duration
  SELECT duracion INTO v_service_duration FROM services WHERE id = p_servicio_id;

  -- Compute end_time
  v_end_time := to_char((p_hora::time + (v_service_duration || ' minutes')::interval), 'HH24:MI');

  -- Lock the appointments table to prevent concurrent inserts
  LOCK TABLE appointments IN EXCLUSIVE MODE;

  -- Check for overlapping appointments
  SELECT COUNT(*) INTO v_existing_count
  FROM appointments
  WHERE business_id = p_business_id
    AND employee_id = p_employee_id
    AND fecha = p_fecha
    AND estado != 'cancelled'
    AND (
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
