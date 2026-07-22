/**
 * Availability Engine — single source of truth for slot calculation.
 * 
 * Ollama NEVER computes availability. This engine is the sole authority.
 * All availability queries MUST go through this module.
 */
import { supabaseAdmin, isSupabaseConfigured } from './supabase.js';

export interface TimeSlot {
  start: string;        // HH:MM
  end: string;          // HH:MM
  employee_id: string | null;
  employee_name: string | null;
}

export interface AvailableSlotsResult {
  date: string;
  service_id: string;
  service_name: string;
  duration_minutes: number;
  slots: TimeSlot[];
}

export interface BusinessHoursConfig {
  start: string;
  end: string;
  open_days: number[];
  slot_interval_minutes: number;
  use_split_hours: boolean;
  split_hours?: {
    morning_start: string;
    morning_end: string;
    afternoon_start: string;
    afternoon_end: string;
  };
}

const DEFAULT_HOURS: BusinessHoursConfig = {
  start: '09:00',
  end: '20:30',
  open_days: [1, 2, 3, 4, 5, 6],
  slot_interval_minutes: 30,
  use_split_hours: false
};

/**
 * Convert HH:MM to minutes since midnight
 */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Format minutes since midnight to HH:MM
 */
function toTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Get business hours configuration for a given business.
 * Returns configured hours or defaults.
 */
export async function getBusinessHours(business_id: string): Promise<BusinessHoursConfig> {
  if (!isSupabaseConfigured) return { ...DEFAULT_HOURS };

  const { data: settings } = await supabaseAdmin
    .from('settings')
    .select('horarios')
    .eq('business_id', business_id)
    .maybeSingle();

  if (!settings?.horarios) return { ...DEFAULT_HOURS };

  const h = settings.horarios as any;
  return {
    start: h.start || DEFAULT_HOURS.start,
    end: h.end || DEFAULT_HOURS.end,
    open_days: h.open_days || DEFAULT_HOURS.open_days,
    slot_interval_minutes: h.slot_interval_minutes || DEFAULT_HOURS.slot_interval_minutes,
    use_split_hours: h.use_split_hours || false,
    split_hours: h.split_hours || undefined
  };
}

/**
 * Get the date's day-of-week (0=Sun, 1=Mon, ..., 6=Sat) in Europe/Madrid.
 */
function getDayOfWeek(dateStr: string): number {
  // Use Madrid timezone to determine the correct day
  const d = new Date(dateStr + 'T12:00:00+02:00');
  return d.getDay();
}

/**
 * Check if the business is open on a given date.
 */
export async function checkBusinessHours(
  business_id: string,
  date: string
): Promise<{ open: boolean; message?: string; hours?: { start: string; end: string }[] }> {
  const config = await getBusinessHours(business_id);
  const dayOfWeek = getDayOfWeek(date);

  if (!config.open_days.includes(dayOfWeek)) {
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return { open: false, message: `El ${dayNames[dayOfWeek]} estamos cerrados.` };
  }

  if (config.use_split_hours && config.split_hours) {
    return {
      open: true,
      hours: [
        { start: config.split_hours.morning_start, end: config.split_hours.morning_end },
        { start: config.split_hours.afternoon_start, end: config.split_hours.afternoon_end }
      ]
    };
  }

  return {
    open: true,
    hours: [{ start: config.start, end: config.end }]
  };
}

/**
 * Get service duration from Supabase.
 * Returns duration in minutes.
 */
export async function getServiceDuration(service_id: string): Promise<number> {
  if (!isSupabaseConfigured) return 30;

  const { data } = await supabaseAdmin
    .from('services')
    .select('duracion')
    .eq('id', service_id)
    .maybeSingle();

  return data?.duracion || 30;
}

/**
 * Get service info by name (fuzzy match within a business).
 */
export async function findServiceByName(
  business_id: string,
  serviceName: string
): Promise<{ id: string; nombre: string; duracion: number; precio: number } | null> {
  if (!isSupabaseConfigured) return null;

  const term = serviceName.toLowerCase();
  const { data: services } = await supabaseAdmin
    .from('services')
    .select('id, nombre, duracion, precio')
    .eq('business_id', business_id)
    .eq('is_active', true);

  if (!services || services.length === 0) return null;

  // Try exact match first, then includes, then first available
  let service = services.find((s: any) => s.nombre.toLowerCase() === term);
  if (!service) {
    service = services.find((s: any) => s.nombre.toLowerCase().includes(term));
  }
  if (!service) {
    service = services.find((s: any) => term.includes(s.nombre.toLowerCase()));
  }
  return service || services[0];
}

/**
 * Get employees who can perform a given service.
 * 
 * BEHAVIOR:
 * - If ANY employee_services mappings exist for this business:
 *   ONLY employees with a mapping for the requested service are returned.
 *   An employee without a mapping for that service CANNOT be selected.
 * 
 * - If NO employee_services mappings exist for this business (yet):
 *   All active employees are returned as fallback.
 *   This preserves compatibility for businesses that haven't configured mappings.
 * 
 * - If service_id is omitted (no service specified):
 *   All employees are returned (legacy behavior).
 */
export async function getEmployeesForService(
  business_id: string,
  service_id?: string
): Promise<{ id: string; full_name: string }[]> {
  if (!isSupabaseConfigured) return [];

  // Check if ANY mappings exist for this business
  const { count: totalMappings } = await supabaseAdmin
    .from('employee_services')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business_id);

  const hasMappings = (totalMappings ?? 0) > 0;

  if (service_id) {
    // Try employee_services mapping first
    const { data: mappings } = await supabaseAdmin
      .from('employee_services')
      .select('employee:employees(id, full_name)')
      .eq('business_id', business_id)
      .eq('service_id', service_id);

    if (mappings && mappings.length > 0) {
      return mappings.map((m: any) => m.employee).filter(Boolean);
    }

    // If mappings exist but none for this service, return empty
    if (hasMappings) {
      return [];
    }
  }

  // No mappings configured yet → fallback to all employees
  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('id, full_name')
    .eq('business_id', business_id);

  return employees || [];
}

/**
 * Get existing appointments for a date/business (excluding cancelled).
 */
export async function getAppointmentsForDate(
  business_id: string,
  date: string
): Promise<{ hora: string; employee_id: string | null; servicio_id: string }[]> {
  if (!isSupabaseConfigured) return [];

  const { data } = await supabaseAdmin
    .from('appointments')
    .select('hora, employee_id, servicio_id')
    .eq('business_id', business_id)
    .eq('fecha', date)
    .neq('estado', 'cancelled');

  return data || [];
}

/**
 * Get active blocks for a date (business-wide + per-employee).
 */
export async function getBlocksForDate(
  business_id: string,
  date: string,
  employee_id?: string
): Promise<{ start_time: string; end_time: string; employee_id: string | null }[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabaseAdmin
    .from('blocks')
    .select('start_time, end_time, employee_id')
    .eq('business_id', business_id)
    .eq('block_date', date);

  if (employee_id) {
    query = query.or(`employee_id.is.null,employee_id.eq.${employee_id}`);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Check if a specific time interval overlaps with any existing appointments.
 * Uses proper interval logic: newStart < existingEnd AND newEnd > existingStart
 */
export async function checkAppointmentOverlap(
  business_id: string,
  employee_id: string | null,
  date: string,
  start_time: string,
  end_time: string,
  exclude_appointment_id?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !employee_id) return false;

  const newStart = toMinutes(start_time);
  const newEnd = toMinutes(end_time);

  let query = supabaseAdmin
    .from('appointments')
    .select('hora, servicio_id')
    .eq('business_id', business_id)
    .eq('employee_id', employee_id)
    .eq('fecha', date)
    .neq('estado', 'cancelled');

  if (exclude_appointment_id) {
    query = query.neq('id', exclude_appointment_id);
  }

  const { data: appointments } = await query;
  if (!appointments || appointments.length === 0) return false;

  // Get service durations in a batch
  const serviceIds = [...new Set(appointments.map(a => a.servicio_id))];
  const durations: Record<string, number> = {};
  for (const sid of serviceIds) {
    durations[sid] = await getServiceDuration(sid);
  }

  for (const apt of appointments) {
    const existingStart = toMinutes(apt.hora);
    const existingEnd = existingStart + (durations[apt.servicio_id] || 30);

    // Overlap: newStart < existingEnd AND newEnd > existingStart
    if (newStart < existingEnd && newEnd > existingStart) {
      return true;
    }
  }

  return false;
}

/**
 * Generate all possible time slots for a given date and service,
 * filtered by business hours, employee availability, existing appointments, and blocks.
 */
export async function getAvailableSlots(
  business_id: string,
  date: string,
  service_id: string,
  options?: {
    preferred_time?: string;
    employee_id?: string;
  }
): Promise<AvailableSlotsResult> {
  const service = await supabaseAdmin
    .from('services')
    .select('id, nombre, duracion')
    .eq('id', service_id)
    .maybeSingle();

  if (!service?.data) {
    return { date, service_id, service_name: '', duration_minutes: 0, slots: [] };
  }

  const srv = service.data as any;
  const duration = srv.duracion || 30;
  const serviceName = srv.nombre || '';

  // 1. Check business hours
  const bizHours = await checkBusinessHours(business_id, date);
  if (!bizHours.open) {
    return { date, service_id, service_name: serviceName, duration_minutes: duration, slots: [] };
  }

  // 2. Get config for slot interval
  const config = await getBusinessHours(business_id);
  const slotInterval = config.slot_interval_minutes;

  // 3. Get employees for this service
  let employees = await getEmployeesForService(business_id, service_id);
  if (options?.employee_id) {
    employees = employees.filter(e => e.id === options.employee_id);
  }
  if (employees.length === 0) {
    return { date, service_id, service_name: serviceName, duration_minutes: duration, slots: [] };
  }

  // 4. Get existing appointments and blocks
  const allAppointments = await getAppointmentsForDate(business_id, date);
  const allBlocks = await getBlocksForDate(business_id, date);

  // 5. Generate slots for each employee
  const slots: TimeSlot[] = [];

  for (const employee of employees) {
    // Get employee schedule if available
    let empStart = bizHours.hours![0].start;
    let empEnd = bizHours.hours![0].end;
    const empHours: { start: string; end: string }[] = bizHours.hours ? [...bizHours.hours] : [{ start: empStart, end: empEnd }];

    // Check employee-specific schedule override
    if (isSupabaseConfigured) {
      const dayOfWeek = getDayOfWeek(date);
      const { data: empSchedule } = await supabaseAdmin
        .from('employee_schedules')
        .select('start_time, end_time, is_working')
        .eq('employee_id', employee.id)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();

      if (empSchedule) {
        if (!empSchedule.is_working) continue; // Employee doesn't work this day
        if (empSchedule.start_time && empSchedule.end_time) {
          // Override business hours with employee hours
          empHours.length = 0;
          empHours.push({ start: empSchedule.start_time, end: empSchedule.end_time });
        }
      }
    }

    // Get employee-specific blocks
    const empBlocks = allBlocks.filter(b => !b.employee_id || b.employee_id === employee.id);

    // Get appointments for this employee
    const empAppointments = allAppointments.filter(a => a.employee_id === employee.id);

    // Get durations for these appointments
    const empServiceIds = [...new Set(empAppointments.map(a => a.servicio_id))];
    const empDurations: Record<string, number> = {};
    for (const sid of empServiceIds) {
      empDurations[sid] = await getServiceDuration(sid);
    }

    // For each business hour segment (morning, afternoon, or single block)
    for (const period of empHours) {
      const periodStart = toMinutes(period.start);
      const periodEnd = toMinutes(period.end);

      for (let m = periodStart; m + duration <= periodEnd; m += slotInterval) {
        const slotStart = toTimeStr(m);
        const slotEnd = toTimeStr(m + duration);

        // Check against blocks
        let blocked = false;
        for (const block of empBlocks) {
          const blockStart = toMinutes(block.start_time);
          const blockEnd = toMinutes(block.end_time);
          if (m < blockEnd && m + duration > blockStart) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        // Check against existing appointments
        let overlapping = false;
        for (const apt of empAppointments) {
          const aptStart = toMinutes(apt.hora);
          const aptEnd = aptStart + (empDurations[apt.servicio_id] || 30);
          if (m < aptEnd && m + duration > aptStart) {
            overlapping = true;
            break;
          }
        }
        if (overlapping) continue;

        slots.push({
          start: slotStart,
          end: slotEnd,
          employee_id: employee.id,
          employee_name: employee.full_name
        });
      }
    }
  }

  // Sort by time then employee
  slots.sort((a, b) => a.start.localeCompare(b.start) || (a.employee_name || '').localeCompare(b.employee_name || ''));

  return {
    date,
    service_id,
    service_name: serviceName,
    duration_minutes: duration,
    slots
  };
}

/**
 * Check if a single slot is available right now.
 * This MUST be called immediately before creating an appointment
 * to prevent double-booking (re-validation).
 */
export async function isSlotAvailable(
  business_id: string,
  date: string,
  start_time: string,
  end_time: string,
  employee_id: string | null,
  service_id: string
): Promise<{ available: boolean; message?: string }> {
  // 1. Check business hours
  const bizHours = await checkBusinessHours(business_id, date);
  if (!bizHours.open) {
    return { available: false, message: bizHours.message };
  }

  const newStart = toMinutes(start_time);
  const newEnd = toMinutes(end_time);

  // 2. Check hours within business hours
  let withinHours = false;
  if (bizHours.hours) {
    for (const period of bizHours.hours) {
      if (newStart >= toMinutes(period.start) && newEnd <= toMinutes(period.end)) {
        withinHours = true;
        break;
      }
    }
  }
  if (!withinHours) {
    return { available: false, message: 'La hora solicitada está fuera del horario de atención.' };
  }

  // 3. Check blocks (null employee = only business-wide blocks)
  const blocks = await getBlocksForDate(business_id, date, employee_id || undefined);
  for (const block of blocks) {
    // When checking for a null employee, skip employee-specific blocks
    if (!employee_id && block.employee_id) continue;
    if (newStart < toMinutes(block.end_time) && newEnd > toMinutes(block.start_time)) {
      return { available: false, message: 'El horario seleccionado está bloqueado.' };
    }
  }

  // 4. Check appointment overlap for this employee
  if (employee_id) {
    const overlaps = await checkAppointmentOverlap(business_id, employee_id, date, start_time, end_time);
    if (overlaps) {
      return { available: false, message: 'La hora seleccionada ya está ocupada.' };
    }
  }

  return { available: true };
}

/**
 * Get nearby available slots when a preferred time is unavailable.
 * Returns slots before and after the requested time.
 */
export async function getNextAvailableSlots(
  business_id: string,
  date: string,
  service_id: string,
  preferred_time: string,
  options?: {
    employee_id?: string;
    count?: number;
  }
): Promise<{ slots: TimeSlot[] }> {
  const allSlots = await getAvailableSlots(business_id, date, service_id, {
    preferred_time,
    employee_id: options?.employee_id
  });

  if (allSlots.slots.length === 0) {
    return { slots: [] };
  }

  const preferred = toMinutes(preferred_time);
  const count = options?.count || 5;

  // Score: distance from preferred time
  const scored = allSlots.slots.map(s => ({
    ...s,
    score: Math.abs(toMinutes(s.start) - preferred)
  }));
  scored.sort((a, b) => a.score - b.score);

  return { slots: scored.slice(0, count) };
}

/**
 * Create an appointment atomically via the book_appointment RPC.
 * This is the ONLY function that should create appointments.
 * It uses a PostgreSQL transaction with table locking to prevent concurrent double-booking.
 */
export async function createAppointmentAtomic(
  business_id: string,
  customer_id: string,
  employee_id: string,
  servicio_id: string,
  fecha: string,
  hora: string,
  origen: string = 'IA',
  notes: string = 'Creado por Asistente IA.'
): Promise<{ success: boolean; cita?: any; message?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  // Try the RPC first (atomic, prevents double-booking)
  try {
    const { data, error } = await supabaseAdmin.rpc('book_appointment', {
      p_business_id: business_id,
      p_customer_id: customer_id,
      p_employee_id: employee_id,
      p_servicio_id: servicio_id,
      p_fecha: fecha,
      p_hora: hora,
      p_origen: origen,
      p_notes: notes
    });

    if (error) throw error;

    if (data?.success) {
      // Fetch full appointment with relations
      const { data: fullCita } = await supabaseAdmin
        .from('appointments')
        .select('*, customer:customers(*), service:services(*)')
        .eq('id', data.id)
        .single();

      // Get employee name
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('full_name')
        .eq('id', employee_id)
        .maybeSingle();

      return {
        success: true,
        cita: { ...(fullCita || data), employee_name: emp?.full_name || null }
      };
    }

    return { success: false, message: data?.message || 'Error al crear la cita.' };
  } catch (rpcErr: any) {
    // RPC might not exist yet (migration not applied). Fall back to client-side insert.
    console.warn(`[Availability] RPC book_appointment not available, using client-side fallback: ${rpcErr.message}`);
    return createAppointmentFallback(business_id, customer_id, employee_id, servicio_id, fecha, hora, origen, notes);
  }
}

/**
 * Fallback: client-side appointment creation with double-check.
 * Used when the RPC function is not available (migration not yet applied).
 */
async function createAppointmentFallback(
  business_id: string,
  customer_id: string,
  employee_id: string,
  servicio_id: string,
  fecha: string,
  hora: string,
  origen: string,
  notes: string
): Promise<{ success: boolean; cita?: any; message?: string }> {
  // Get service duration
  const duration = await getServiceDuration(servicio_id);
  const endTime = toTimeStr(toMinutes(hora) + duration);

  // Re-validate availability
  const availCheck = await isSlotAvailable(business_id, fecha, hora, endTime, employee_id, servicio_id);
  if (!availCheck.available) {
    return { success: false, message: availCheck.message || 'La hora ya no está disponible.' };
  }

  // Get price
  const { data: srv } = await supabaseAdmin
    .from('services')
    .select('precio')
    .eq('id', servicio_id)
    .maybeSingle();

  const { data: cita, error: aptErr } = await supabaseAdmin
    .from('appointments')
    .insert({
      business_id,
      customer_id,
      employee_id,
      servicio_id,
      fecha,
      hora,
      estado: 'pending',
      origen,
      notes,
      price_charged: srv?.precio || 0
    })
    .select('*, customer:customers(*), service:services(*)')
    .single();

  if (aptErr) {
    // Check if it's a duplicate constraint violation
    if (aptErr.message?.includes('duplicate') || aptErr.code === '23505') {
      return { success: false, message: 'La hora seleccionada acaba de ser ocupada por otra reserva.' };
    }
    return { success: false, message: aptErr.message };
  }

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('full_name')
    .eq('id', employee_id)
    .maybeSingle();

  return {
    success: true,
    cita: { ...cita, employee_name: emp?.full_name || null }
  };
}
