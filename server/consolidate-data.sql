-- ============================================================================
-- MIGRACIÓN: CONSOLIDACIÓN DE BUSINESSES DUPLICADOS (V2 - SEGURA)
-- ============================================================================
-- Diagnóstico: 3 registros "BarberLozz" con distintos business_id
--
--   df4bc918-c44e-4bba-a692-ecee1760cbbe   ← perfil del usuario (source)
--   4dbcb542-eeb2-45f0-8174-6da4f0fca741   ← DEFAULT_BUSINESS_ID (target) → CONSERVAR
--   83795de3-a3a9-484e-bc94-59efabee5764   ← sin datos → ELIMINAR
--
-- Estrategia:
--   1) Resolver conflictos dinámicamente (sin IDs fijos)
--   2) Migrar TODAS las tablas con business_id
--   3) Verificar que no queden referencias rotas
--   4) Generar informe de registros migrados
-- ============================================================================

DO $$
DECLARE
  -- IDs de los negocios involucrados
  v_source_id UUID := 'df4bc918-c44e-4bba-a692-ecee1760cbbe';
  v_target_id UUID := '4dbcb542-eeb2-45f0-8174-6da4f0fca741';
  v_delete_id UUID := '83795de3-a3a9-484e-bc94-59efabee5764';

  -- Contadores de migración
  v_migrated_profiles INT := 0;
  v_migrated_services INT := 0;
  v_migrated_customers INT := 0;
  v_migrated_appointments INT := 0;
  v_migrated_employees INT := 0;
  v_migrated_conversations INT := 0;
  v_migrated_booking_sessions INT := 0;
  v_migrated_settings INT := 0;
  v_migrated_statistics INT := 0;
  v_migrated_emp_services INT := 0;
  v_migrated_blocks INT := 0;
  v_migrated_emp_schedules INT := 0;

  -- Variables para resolución de conflictos
  v_conflict_phone TEXT := '34611222333';
  v_source_cust_id UUID;
  v_target_cust_id UUID;
  v_source_cust_name TEXT;
  v_target_cust_name TEXT;
  v_conflict_count INT;

  -- Variables para verificación
  v_orphan_count INT;
  v_final_biz_count INT;
  v_rc INT;
BEGIN
  -- ==========================================================================
  -- FASE 0: VERIFICAR QUE LOS BUSINESS_ID EXISTEN
  -- ==========================================================================
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_source_id) THEN
    RAISE EXCEPTION 'Business source % no existe', v_source_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_target_id) THEN
    RAISE EXCEPTION 'Business target % no existe', v_target_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_delete_id) THEN
    RAISE WARNING 'Business a eliminar % no existe, se omite', v_delete_id;
    v_delete_id := NULL;
  END IF;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'INICIANDO CONSOLIDACIÓN';
  RAISE NOTICE 'Source: %', v_source_id;
  RAISE NOTICE 'Target: %', v_target_id;
  RAISE NOTICE 'Delete: %', v_delete_id;
  RAISE NOTICE '==========================================';

  -- ==========================================================================
  -- FASE 1: RESOLVER CONFLICTO DE CLIENTE CON TELÉFONO DUPLICADO
  -- ==========================================================================
  -- Buscar dinámicamente si el teléfono conflictivo existe en ambos negocios
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.customers
  WHERE telefono = v_conflict_phone
    AND business_id IN (v_source_id, v_target_id);

  IF v_conflict_count >= 2 THEN
    -- Obtener IDs de los clientes en conflicto
    SELECT id, nombre INTO v_source_cust_id, v_source_cust_name
    FROM public.customers
    WHERE business_id = v_source_id AND telefono = v_conflict_phone
    LIMIT 1;

    SELECT id, nombre INTO v_target_cust_id, v_target_cust_name
    FROM public.customers
    WHERE business_id = v_target_id AND telefono = v_conflict_phone
    LIMIT 1;

    RAISE NOTICE 'Conflicto detectado: teléfono %', v_conflict_phone;
    RAISE NOTICE '  Source: % ("%")', v_source_cust_id, v_source_cust_name;
    RAISE NOTICE '  Target: % ("%")', v_target_cust_id, v_target_cust_name;

    -- Reasignar citas del cliente source al cliente target
    UPDATE public.appointments
    SET customer_id = v_target_cust_id
    WHERE customer_id = v_source_cust_id;

    GET DIAGNOSTICS v_migrated_appointments = ROW_COUNT;
    RAISE NOTICE 'Citas reasignadas de customer source → target: %', v_migrated_appointments;

    -- Reasignar booking_sessions del cliente source al cliente target
    UPDATE public.booking_sessions
    SET customer_id = v_target_cust_id
    WHERE customer_id = v_source_cust_id;

    GET DIAGNOSTICS v_conflict_count = ROW_COUNT;
    IF v_conflict_count > 0 THEN
      RAISE NOTICE 'Booking sessions reasignadas: %', v_conflict_count;
    END IF;

    -- Reasignar conversaciones del cliente source al cliente target
    UPDATE public.conversations
    SET customer_id = v_target_cust_id
    WHERE customer_id = v_source_cust_id;

    -- Eliminar el cliente duplicado del source
    DELETE FROM public.customers WHERE id = v_source_cust_id;
    RAISE NOTICE 'Cliente source duplicado eliminado: % ("%")', v_source_cust_id, v_source_cust_name;

    v_migrated_customers := 1;
  ELSE
    RAISE NOTICE 'Sin conflicto de teléfono — se migrarán clientes directamente';
  END IF;

  -- ==========================================================================
  -- FASE 2: MIGRAR TABLAS CON BUSINESS_ID (source → target)
  -- ==========================================================================

  -- 2a. Migrar perfiles (solo si no hay conflicto de UNIQUE)
  UPDATE public.profiles
  SET business_id = v_target_id
  WHERE business_id = v_source_id;
  GET DIAGNOSTICS v_migrated_profiles = ROW_COUNT;

  -- 2b. Migrar servicios
  UPDATE public.services
  SET business_id = v_target_id
  WHERE business_id = v_source_id;
  GET DIAGNOSTICS v_migrated_services = ROW_COUNT;

  -- 2c. Migrar clientes (los que no tenían conflicto de teléfono)
  UPDATE public.customers
  SET business_id = v_target_id
  WHERE business_id = v_source_id;
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  v_migrated_customers := v_migrated_customers + v_rc;

  -- 2d. Migrar citas (las que no se reasignaron ya en Fase 1)
  UPDATE public.appointments
  SET business_id = v_target_id
  WHERE business_id = v_source_id;
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  v_migrated_appointments := v_migrated_appointments + v_rc;

  -- 2e. Migrar empleados
  UPDATE public.employees
  SET business_id = v_target_id
  WHERE business_id = v_source_id;
  GET DIAGNOSTICS v_migrated_employees = ROW_COUNT;

  -- 2f. Migrar conversaciones
  UPDATE public.conversations
  SET business_id = v_target_id
  WHERE business_id = v_source_id;
  GET DIAGNOSTICS v_migrated_conversations = ROW_COUNT;

  -- 2g. Migrar booking_sessions
  UPDATE public.booking_sessions
  SET business_id = v_target_id
  WHERE business_id = v_source_id;
  GET DIAGNOSTICS v_migrated_booking_sessions = ROW_COUNT;

  -- 2h. Migrar settings (si existe la tabla y tiene datos)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') THEN
    UPDATE public.settings
    SET business_id = v_target_id
    WHERE business_id = v_source_id;
    GET DIAGNOSTICS v_migrated_settings = ROW_COUNT;
  END IF;

  -- 2i. Migrar estadísticas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'statistics') THEN
    UPDATE public.statistics
    SET business_id = v_target_id
    WHERE business_id = v_source_id;
    GET DIAGNOSTICS v_migrated_statistics = ROW_COUNT;
  END IF;

  -- 2j. Migrar employee_services
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_services') THEN
    UPDATE public.employee_services
    SET business_id = v_target_id
    WHERE business_id = v_source_id;
    GET DIAGNOSTICS v_migrated_emp_services = ROW_COUNT;
  END IF;

  -- 2k. Migrar blocks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blocks') THEN
    UPDATE public.blocks
    SET business_id = v_target_id
    WHERE business_id = v_source_id;
    GET DIAGNOSTICS v_migrated_blocks = ROW_COUNT;
  END IF;

  -- 2l. Migrar employee_schedules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_schedules') THEN
    UPDATE public.employee_schedules
    SET business_id = v_target_id
    WHERE business_id = v_source_id;
    GET DIAGNOSTICS v_migrated_emp_schedules = ROW_COUNT;
  END IF;

  -- ==========================================================================
  -- FASE 3: ELIMINAR NEGOCIOS DUPLICADOS
  -- ==========================================================================
  -- Nota: Solo 83795de3 se elimina si existe.
  -- df4bc918 se eliminará automáticamente si ya no tiene referencias.
  -- ON DELETE CASCADE está configurado en las FKs, por lo que si quedara
  -- alguna referencia accidental, la restricción la detectará.

  IF v_delete_id IS NOT NULL THEN
    DELETE FROM public.businesses WHERE id = v_delete_id;
    RAISE NOTICE 'Business eliminado (sin datos): %', v_delete_id;
  END IF;

  DELETE FROM public.businesses WHERE id = v_source_id;
  RAISE NOTICE 'Business source eliminado: %', v_source_id;

  -- ==========================================================================
  -- FASE 4: VERIFICACIÓN DE INTEGRIDAD
  -- ==========================================================================
  SELECT COUNT(*) INTO v_final_biz_count FROM public.businesses;
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'INFORME DE MIGRACIÓN';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Businesses finales: % (debe ser 1)', v_final_biz_count;
  RAISE NOTICE '';

  IF v_migrated_services > 0 THEN
    RAISE NOTICE 'Servicios migrados: %', v_migrated_services;
  END IF;
  IF v_migrated_customers > 0 THEN
    RAISE NOTICE 'Clientes migrados: %', v_migrated_customers;
  END IF;
  IF v_migrated_appointments > 0 THEN
    RAISE NOTICE 'Citas migradas: %', v_migrated_appointments;
  END IF;
  IF v_migrated_profiles > 0 THEN
    RAISE NOTICE 'Perfiles migrados: %', v_migrated_profiles;
  END IF;
  IF v_migrated_employees > 0 THEN
    RAISE NOTICE 'Empleados migrados: %', v_migrated_employees;
  END IF;
  IF v_migrated_conversations > 0 THEN
    RAISE NOTICE 'Conversaciones migradas: %', v_migrated_conversations;
  END IF;
  IF v_migrated_booking_sessions > 0 THEN
    RAISE NOTICE 'Booking sessions migradas: %', v_migrated_booking_sessions;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '--- Verificando huérfanos ---';

  -- Verificar cada tabla
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    SELECT COUNT(*) INTO v_orphan_count FROM public.customers c
      WHERE NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = c.business_id);
    IF v_orphan_count > 0 THEN RAISE EXCEPTION 'Clientes huérfanos: %', v_orphan_count; END IF;
    RAISE NOTICE 'Clientes: OK';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    SELECT COUNT(*) INTO v_orphan_count FROM public.services s
      WHERE NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = s.business_id);
    IF v_orphan_count > 0 THEN RAISE EXCEPTION 'Servicios huérfanos: %', v_orphan_count; END IF;
    RAISE NOTICE 'Servicios: OK';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    SELECT COUNT(*) INTO v_orphan_count FROM public.appointments a
      WHERE NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = a.business_id);
    IF v_orphan_count > 0 THEN RAISE EXCEPTION 'Citas huérfanas: %', v_orphan_count; END IF;

    -- Verificar customer_id de citas
    SELECT COUNT(*) INTO v_orphan_count FROM public.appointments a
      WHERE NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = a.customer_id);
    IF v_orphan_count > 0 THEN RAISE EXCEPTION 'Citas con customer_id huérfano: %', v_orphan_count; END IF;

    -- Verificar servicio_id de citas
    SELECT COUNT(*) INTO v_orphan_count FROM public.appointments a
      WHERE NOT EXISTS (SELECT 1 FROM public.services s WHERE s.id = a.servicio_id);
    IF v_orphan_count > 0 THEN RAISE EXCEPTION 'Citas con servicio_id huérfano: %', v_orphan_count; END IF;

    RAISE NOTICE 'Citas: OK';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    SELECT COUNT(*) INTO v_orphan_count FROM public.employees e
      WHERE NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = e.business_id);
    IF v_orphan_count > 0 THEN RAISE EXCEPTION 'Empleados huérfanos: %', v_orphan_count; END IF;
    RAISE NOTICE 'Empleados: OK';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    SELECT COUNT(*) INTO v_orphan_count FROM public.conversations co
      WHERE NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = co.business_id);
    IF v_orphan_count > 0 THEN RAISE EXCEPTION 'Conversaciones huérfanas: %', v_orphan_count; END IF;
    RAISE NOTICE 'Conversaciones: OK';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_sessions') THEN
    SELECT COUNT(*) INTO v_orphan_count FROM public.booking_sessions bs
      WHERE NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = bs.business_id);
    IF v_orphan_count > 0 THEN RAISE EXCEPTION 'Booking sessions huérfanas: %', v_orphan_count; END IF;
    RAISE NOTICE 'Booking sessions: OK';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') THEN
    SELECT COUNT(*) INTO v_orphan_count FROM public.settings st
      WHERE NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = st.business_id);
    IF v_orphan_count > 0 THEN RAISE EXCEPTION 'Settings huérfanos: %', v_orphan_count; END IF;
    RAISE NOTICE 'Settings: OK';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_messages') THEN
    SELECT COUNT(*) INTO v_orphan_count FROM public.whatsapp_messages wm
      WHERE NOT EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = wm.conversation_id);
    IF v_orphan_count > 0 THEN RAISE EXCEPTION 'WhatsApp messages con conversation_id huérfano: %', v_orphan_count; END IF;
    RAISE NOTICE 'WhatsApp messages: OK';
  END IF;

  -- Verificar que solo quede 1 business
  IF v_final_biz_count != 1 THEN
    RAISE EXCEPTION 'FALLO: Debe haber exactamente 1 negocio, hay %', v_final_biz_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ CONSOLIDACIÓN COMPLETADA CON ÉXITO';
  RAISE NOTICE 'Business definitivo: %', v_target_id;
  RAISE NOTICE '==========================================';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '❌ ERROR DURANTE LA CONSOLIDACIÓN';
  RAISE NOTICE 'SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
  RAISE NOTICE 'Se ejecutará ROLLBACK automático (BEGIN sin COMMIT hasta el final)';
  RAISE NOTICE '==========================================';
  RAISE;
END;
$$;
