/**
 * Booking Orchestrator — central booking state machine.
 *
 * Architecture:
 *   Qwen ENTIENDE → BACKEND decide el estado → BACKEND ejecuta → QWEN redacta
 *
 * This module is the sole controller of the booking workflow.
 * Qwen is NOT involved in deciding what happens next.
 * Qwen only helps with entity extraction (fallback: deterministic) and
 * formatting non-booking responses (greeting, general conversation).
 *
 * Booking flow is 100% deterministic:
 *   SERVICE → DATE → TIME → AVAILABILITY → CONFIRMATION → APPOINTMENT
 */
import { BookingState, PendingBooking, getOrCreateSession, updateSession, resetSession, setWaitingConfirmation, isConfirmation, isDecline, isNewBookingRequest, isCancellationRequest, isRescheduleRequest, formatDateNatural } from './bookingState.js';
import { findServiceByName, getAvailableSlots, getNextAvailableSlots, isSlotAvailable, createAppointmentAtomic, getEmployeesForService } from './availabilityEngine.js';
import { resolveAppointmentDate } from './dateResolver.js';
import { supabaseAdmin } from './supabase.js';
import { backendFunctions } from './tools.js';

// ── Types ──────────────────────────────────────────────────────────

export enum BookingAction {
  ASK_SERVICE,
  ASK_DATE,
  ASK_TIME,
  PROPOSE_BOOKING,
  CONFIRM_BOOKING,
  OFFER_ALTERNATIVES,
  CANCEL,
  RESCHEDULE,
  INFORMATION,
  GENERAL_CONVERSATION,
}

export interface ExtractedEntities {
  serviceName: string | null;
  dateStr: string | null;
  dayLabel: string | null;
  timeStr: string | null;
  isConfirm: boolean;
  isDecline: boolean;
  hasInfoRequest: boolean;
}

export interface OrchestratorResult {
  action: BookingAction;
  response: string;
  needsQwen?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────

const GREETING_PATTERNS = /^(hola|buenas|buenos días|buenas tardes|buenas noches|qué tal|hey|saludos|muy buenas)/i;
const PRICE_PATTERNS = /cuánto cuesta|qué precio|precio|cuánto vale|cuesta|caro|barato/i;
const DURATION_PATTERNS = /cuánto tarda|duración|cuánto dura|cuánto tiempo|se tarda|tarda/i;
const INFO_PATTERNS = /cuánto|precio|cuesta|vale\b|duración|tarda|horario|teléfono|dirección|ubicación|qué servicios|qué tienen|qué hacéis|listado/i;
const HOURS_PATTERNS = /horario|abrís|cerráis|cuándo abrís|cuándo cerráis/i;
const GREETING_WORDS = new Set(['hola', 'buenas', 'buenos', 'hey', 'saludos']);

function isGreeting(message: string): boolean {
  return GREETING_PATTERNS.test(message.trim());
}

function hasInfoRequest(message: string): boolean {
  return INFO_PATTERNS.test(message);
}

function isPriceOrDuration(message: string): boolean {
  return PRICE_PATTERNS.test(message) || DURATION_PATTERNS.test(message);
}

function isHoursRequest(message: string): boolean {
  return HOURS_PATTERNS.test(message);
}

function isSimpleGreeting(message: string): boolean {
  const m = message.toLowerCase().trim();
  return m.length < 30 && (GREETING_WORDS.has(m) || /^(buenas|muy buenas|qué tal|qué hay|todo bien|bien y tú)/i.test(m) || m === 'hey');
}

function isTimeOnly(message: string): boolean {
  const m = message.toLowerCase().trim();
  if (/^\d{2}:\d{2}$/.test(m)) return true;
  if (/\ba\s+las\s+\d{1,2}\b/.test(m)) return true;
  if (/^\d{1,2}\s*$/.test(m)) return true;
  if (/las?\s+\d{1,2}/i.test(m)) return true;
  return false;
}

function extractTimeFromMessage(text: string): string | null {
  const match = text.match(/\b(\d{2}:\d{2})\b/);
  if (match) return match[1];
  const matchNum = text.match(/a\s+las\s+(\d{1,2})/i) || text.match(/las\s+(\d{1,2})/i) || text.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (matchNum) {
    const h = parseInt(matchNum[1]);
    if (h >= 8 && h <= 21) return `${String(h).padStart(2, '0')}:00`;
    const m2 = matchNum[2];
    if (m2) return `${String(h).padStart(2, '0')}:${m2}`;
  }
  const solo = text.match(/^\s*(\d{1,2})\s*$/);
  if (solo) {
    const h = parseInt(solo[1]);
    if (h >= 8 && h <= 21) return `${String(h).padStart(2, '0')}:00`;
  }
  return null;
}

// ── Entity Extraction ──────────────────────────────────────────────

export function extractEntities(message: string): ExtractedEntities {
  const msg = message.toLowerCase().trim();
  const resolved = resolveAppointmentDate(message);
  return {
    serviceName: extractServiceName(msg),
    dateStr: resolved?.dateStr || null,
    dayLabel: resolved?.dayName || null,
    timeStr: extractTimeFromMessage(message),
    isConfirm: isConfirmation(message),
    isDecline: isDecline(message),
    hasInfoRequest: hasInfoRequest(message),
  };
}

function extractServiceName(msg: string): string | null {
  const svcPatterns: { pattern: RegExp; name: string }[] = [
    { pattern: /degradado|fade/i, name: 'Corte Degradado (Fade)' },
    { pattern: /clásico.*tijera|corte.*tijera|tijera/i, name: 'Corte Clásico Tijera' },
    { pattern: /barba.*premium|arreglo.*barba/i, name: 'Arreglo de Barba Premium' },
    { pattern: /completo|corte.*barba.*lavado|combo/i, name: 'Servicio Completo (Corte + Barba + Lavado)' },
  ];
  for (const svc of svcPatterns) {
    if (svc.pattern.test(msg)) return svc.name;
  }
  if (/\bcorte\b|\bcortar\b|\bpelo\b|\bcabello\b/i.test(msg)) return null;
  return null;
}

// ── Intent Detection ───────────────────────────────────────────────

export function detectPrimaryIntent(message: string, entities: ExtractedEntities, session: PendingBooking | null): string {
  if (isNewBookingRequest(message)) return 'NEW_BOOKING';
  if (isCancellationRequest(message)) return 'CANCEL';
  if (isRescheduleRequest(message)) return 'RESCHEDULE';
  if (session?.state === BookingState.WAITING_CONFIRMATION && entities.isConfirm) return 'CONFIRM';
  if (session?.state === BookingState.WAITING_CONFIRMATION && entities.isDecline) return 'DECLINE';
  if (entities.hasInfoRequest && !entities.serviceName && !entities.dateStr && !entities.timeStr && !entities.isConfirm) return 'INFORMATION';
  if (isSimpleGreeting(message)) return 'GREETING';
  if (session && (session.service_name || session.requested_date || session.requested_time) && session.state !== BookingState.IDLE && session.state !== BookingState.CONFIRMED && session.state !== BookingState.CANCELLED && session.state !== BookingState.EXPIRED) return 'BOOKING_CONTINUATION';
  if (entities.serviceName || entities.dateStr || entities.timeStr || entities.isConfirm) return 'BOOKING_CONTINUATION';
  if (isGreeting(message) || message.length < 20) return 'GREETING';
  return 'OTHER';
}

// ── Information Handler ────────────────────────────────────────────

async function handleInfoRequest(message: string, entities: ExtractedEntities, business_id: string, session: PendingBooking | null): Promise<string | null> {
  const msg = message.toLowerCase();

  // Price or duration query
  if (isPriceOrDuration(msg)) {
    const searchTerm = entities.serviceName || session?.service_name;
    if (searchTerm) {
      const svc = await findServiceByName(business_id, searchTerm);
      if (svc) {
        if (PRICE_PATTERNS.test(msg)) return `El ${svc.nombre} cuesta ${svc.precio}€.`;
        if (DURATION_PATTERNS.test(msg)) return `El ${svc.nombre} dura ${svc.duracion} minutos.`;
        return `El ${svc.nombre} cuesta ${svc.precio}€ y dura ${svc.duracion} minutos.`;
      }
    }
  }

  // Hours query
  if (isHoursRequest(msg)) {
    const settings = await backendFunctions.getBusinessSettings({ business_id });
    if (settings) {
      const daysMap: Record<number, string> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo' };
      return `${settings.name} abre ${settings.open_days.map((d: number) => daysMap[d]).join(', ')} de ${settings.business_hours.start} a ${settings.business_hours.end}.`;
    }
    return null;
  }

  // General info: services list
  if (/qué servicios|qué tienen|qué hacéis|listado|servicios/i.test(msg)) {
    const { data: svcs } = await supabaseAdmin.from('services').select('nombre, duracion, precio, descripcion').eq('business_id', business_id).eq('is_active', true);
    if (svcs?.length) {
      return `${svcs.map((s: any) => `${s.nombre}: ${s.precio}€ — ${s.duracion} min`).join('\n')}`;
    }
    return null;
  }

  return null;
}

// ── Cancellation Handler ───────────────────────────────────────────

async function handleCancellation(message: string, business_id: string, customer_id: string | undefined): Promise<OrchestratorResult | null> {
  const { data: futureAppointments } = await supabaseAdmin.from('appointments').select('*, service:services(*)').eq('business_id', business_id).eq('customer_id', customer_id).in('estado', ['pending']).gte('fecha', new Date().toISOString().split('T')[0]).order('fecha', { ascending: true });

  if (futureAppointments && futureAppointments.length > 0) {
    const citasStr = futureAppointments.map((a: any, i: number) => `${i + 1}. ${a.fecha} a las ${a.hora} - ${a.service?.nombre || 'servicio'}`).join('\n');
    return { action: BookingAction.CANCEL, response: `Tienes las siguientes citas:\n${citasStr}\n\n¿Cuál te gustaría cancelar?`, needsQwen: true };
  }
  return { action: BookingAction.CANCEL, response: 'No tienes citas futuras pendientes.', needsQwen: false };
}

// ── Main Orchestrator ──────────────────────────────────────────────

export async function orchestrate(
  message: string,
  session: PendingBooking | null,
  business_id: string,
  customer_id: string | undefined,
  conversation_id: string,
  phone: string
): Promise<OrchestratorResult> {
  // Step 1: Extract entities + detect intent
  const entities = extractEntities(message);
  const intent = detectPrimaryIntent(message, entities, session);

  // Step 2: Handle non-booking intents that need immediate processing

  // NEW BOOKING → reset session, then continue
  if (intent === 'NEW_BOOKING') {
    await resetSession(business_id, conversation_id);
    session = await getOrCreateSession(business_id, conversation_id, phone);
  }

  // CANCEL
  if (intent === 'CANCEL') {
    const cancelResult = await handleCancellation(message, business_id, customer_id);
    if (cancelResult) return cancelResult;
  }

  // RESCHEDULE
  if (intent === 'RESCHEDULE') {
    return { action: BookingAction.RESCHEDULE, response: '¿Qué cita te gustaría cambiar y para qué día y hora prefieres?', needsQwen: true };
  }

  // DECLINE during WAITING_CONFIRMATION
  if (intent === 'DECLINE' && session?.state === BookingState.WAITING_CONFIRMATION) {
    await resetSession(business_id, conversation_id);
    return { action: BookingAction.GENERAL_CONVERSATION, response: 'De acuerdo, si cambias de opinión aquí estoy. ¿Necesitas algo más?' };
  }

  // CONFIRM during WAITING_CONFIRMATION → create appointment
  if (intent === 'CONFIRM' && session?.state === BookingState.WAITING_CONFIRMATION) {
    return handleConfirmed(session, business_id, conversation_id, phone, message);
  }

  // GREETING (pure, no booking entities)
  if (intent === 'GREETING') {
    return { action: BookingAction.GENERAL_CONVERSATION, response: '', needsQwen: true };
  }

  // INFORMATION (no booking entities, pure info query)
  if (intent === 'INFORMATION') {
    const infoResponse = await handleInfoRequest(message, entities, business_id, session);
    if (infoResponse) {
      return { action: BookingAction.INFORMATION, response: infoResponse };
    }
    return { action: BookingAction.GENERAL_CONVERSATION, response: '', needsQwen: true };
  }

  // OTHER — unknown intent
  if (intent === 'OTHER') {
    return { action: BookingAction.GENERAL_CONVERSATION, response: '', needsQwen: true };
  }

  // Step 3: CONFIRMED session + new booking data → propose reschedule
  if (session?.state === BookingState.CONFIRMED && (entities.dateStr || entities.timeStr || entities.serviceName)) {
    const oldDate = formatDateNatural(session.requested_date!, session.dayLabel);
    const oldTime = session.requested_time || '';
    const newDate = entities.dateStr ? formatDateNatural(entities.dateStr, entities.dayLabel) : null;
    const newTime = entities.timeStr || '';
    const parts: string[] = [];
    if (newDate) parts.push(`el ${newDate}`);
    if (newTime) parts.push(`a las ${newTime}`);
    const changeDesc = parts.length > 0 ? `para ${parts.join(' ')}` : '';
    return {
      action: BookingAction.RESCHEDULE,
      response: `Veo que ya tienes una cita el ${oldDate} a las ${oldTime}${session.service_name ? ` para ${session.service_name}` : ''}. ¿Quieres cambiarla ${changeDesc}?`,
      needsQwen: true
    };
  }

  // Step 4: Booking flow — SERVICE → DATE → TIME → AVAILABILITY → CONFIRMATION

  // Process entities first (save what the user just said)
  if (entities.serviceName || entities.dateStr || entities.timeStr) {
    const updates: any = {};
    if (entities.serviceName) {
      const svc = await findServiceByName(business_id, entities.serviceName);
      if (svc) {
        updates.service_name = svc.nombre;
        updates.service_id = svc.id;
      }
    }
    if (entities.dateStr) {
      updates.requested_date = entities.dateStr;
      updates.dayLabel = entities.dayLabel;
    }
    if (entities.timeStr) {
      updates.requested_time = entities.timeStr;
    }
    if (Object.keys(updates).length > 0) {
      await updateSession(business_id, conversation_id, updates);
      session = await getOrCreateSession(business_id, conversation_id, phone);
    }
  }

  // Handle INFORMATIONAL query DURING booking (does not advance flow, only answers)
  if (entities.hasInfoRequest && isPriceOrDuration(message)) {
    const infoResponse = await handleInfoRequest(message, entities, business_id, session);
    if (infoResponse) {
      return { action: BookingAction.INFORMATION, response: infoResponse };
    }
  }

  // 3a. ASK_SERVICE
  if (!session?.service_id && !session?.service_name) {
    return askService(business_id);
  }

  // 3b. ASK_DATE
  if (!session?.requested_date) {
    const svcName = session.service_name || '';
    return { action: BookingAction.ASK_DATE, response: `Perfecto${svcName ? `, para ${svcName}` : ''}. ¿Qué día te gustaría venir?` };
  }

  // 3c. ASK_TIME
  if (!session?.requested_time) {
    const svcName = session.service_name || '';
    const dateNatural = formatDateNatural(session.requested_date!, session.dayLabel || getDayLabel(session.requested_date!));
    const hasSlots = session.service_id ? await checkHasSlots(business_id, session.requested_date!, session.service_id) : false;
    if (hasSlots) {
      const slots = await getAvailableSlots(business_id, session.requested_date!, session.service_id!);
      const uniqueTimes = [...new Set(slots.slots.map(s => s.start))].slice(0, 5);
      const timesStr = uniqueTimes.join(', ');
      return { action: BookingAction.ASK_TIME, response: `${dateNatural} tengo disponibilidad a las ${timesStr}${svcName ? ` para ${svcName}` : ''}. ¿Qué hora te viene mejor?` };
    }
    return { action: BookingAction.ASK_TIME, response: `¿Sobre qué hora te gustaría venir ${dateNatural ? 'el ' + dateNatural : ''}${svcName ? ' para ' + svcName : ''}?` };
  }

  // 3d. We have service + date + time → CHECK AVAILABILITY
  const sid = session.service_id!;
  const sd = session.requested_date!;
  const st = session.requested_time!;
  const svcName = session.service_name || '';

  const availSlots = await getAvailableSlots(business_id, sd, sid, { preferred_time: st });
  const slot = availSlots.slots.find(s => s.start === st);

  if (slot) {
    await setWaitingConfirmation(business_id, conversation_id, {
      service_id: sid,
      employee_id: slot.employee_id!,
      requested_date: sd,
      requested_time: st,
      start_time: st,
      end_time: slot.end,
      customer_id: customer_id || '',
      phone: phone,
    });
    await updateSession(business_id, conversation_id, { employee_name: slot.employee_name });
    session = await getOrCreateSession(business_id, conversation_id, phone);

    const dateNatural = formatDateNatural(sd, session.dayLabel || getDayLabel(sd));
    return { action: BookingAction.PROPOSE_BOOKING, response: `${dateNatural ? 'El ' + dateNatural : ''} a las ${st}${svcName ? ' para ' + svcName : ''} está libre. ¿Quieres que te reserve la cita?` };
  }

  // 3e. Not available → OFFER ALTERNATIVES
  const nearby = await getNextAvailableSlots(business_id, sd, sid, st, { count: 3 });
  if (nearby.slots.length > 0) {
    const times = nearby.slots.map(s => s.start).join(', ');
    return { action: BookingAction.OFFER_ALTERNATIVES, response: `A las ${st} no tengo disponibilidad. Tengo libre a las ${times}. ¿Qué hora te viene mejor?` };
  }
  return { action: BookingAction.OFFER_ALTERNATIVES, response: `Lo siento, no tengo disponibilidad el ${formatDateNatural(sd, session.dayLabel || getDayLabel(sd))}. ¿Quieres probar otro día?` };
}

// ── Confirmation Handler ───────────────────────────────────────────

async function handleConfirmed(session: PendingBooking, business_id: string, conversation_id: string, phone: string, message: string): Promise<OrchestratorResult> {
  if (!session.start_time || !session.end_time || !session.employee_id || !session.service_id) {
    await resetSession(business_id, conversation_id);
    return { action: BookingAction.GENERAL_CONVERSATION, response: 'Lo siento, hubo un problema con los datos de la reserva. ¿Puedes empezar de nuevo?' };
  }

  const recheck = await isSlotAvailable(business_id, session.requested_date!, session.start_time, session.end_time, session.employee_id, session.service_id);

  if (!recheck.available) {
    await resetSession(business_id, conversation_id);
    const nearby = await getNextAvailableSlots(business_id, session.requested_date!, session.service_id, session.requested_time!, { employee_id: session.employee_id, count: 5 });
    if (nearby.slots.length > 0) {
      const altStr = nearby.slots.map(s => s.start).join(', ');
      return { action: BookingAction.OFFER_ALTERNATIVES, response: `Lo siento, justo ese horario acaba de ocuparse. Tengo libre a las ${altStr}. ¿Qué hora te viene mejor?` };
    }
    return { action: BookingAction.OFFER_ALTERNATIVES, response: 'Lo siento, ese horario acaba de ocuparse y no tengo más disponibilidad. ¿Quieres que busque otro día?' };
  }

  const toolResult = await createAppointmentAtomic(business_id, session.customer_id || '', session.employee_id, session.service_id, session.requested_date!, session.requested_time!, 'IA', 'Creado por Asistente IA.');

  if (toolResult.success) {
    await updateSession(business_id, conversation_id, { state: BookingState.CONFIRMED });
    const cita = toolResult.cita;
    const aptId = cita?.id ? `#AP-${cita.id.toString().substring(0, 6).toUpperCase()}` : '#AP-000000';
    const serviceName = cita?.service?.nombre || session.service_name;
    const employeeName = cita?.employee_name || session.employee_name || 'BarberLozz';
    const fechaNatural = formatDateNatural(session.requested_date!, session.dayLabel);
    return { action: BookingAction.CONFIRM_BOOKING, response: `¡Perfecto! Te he reservado la cita para el ${fechaNatural} a las ${session.requested_time} en BarberLozz con ${employeeName} para ${serviceName}. Tu referencia es ${aptId}. ¡Te esperamos!` };
  }

  await resetSession(business_id, conversation_id);
  return { action: BookingAction.GENERAL_CONVERSATION, response: `Lo siento, no pude crear la cita. ${toolResult.message || 'Inténtalo de nuevo.'}` };
}

// ── Response Templates ─────────────────────────────────────────────

async function askService(business_id: string): Promise<OrchestratorResult> {
  const { data: svcs } = await supabaseAdmin.from('services').select('nombre').eq('business_id', business_id).eq('is_active', true);
  if (svcs?.length) {
    const names = svcs.map((s: any) => s.nombre).join(', ');
    return { action: BookingAction.ASK_SERVICE, response: `Claro 😊 ¿Qué servicio te gustaría reservar? Tenemos ${names}.` };
  }
  return { action: BookingAction.ASK_SERVICE, response: '¿Qué servicio te gustaría reservar?' };
}

async function checkHasSlots(business_id: string, date: string, service_id: string): Promise<boolean> {
  const slots = await getAvailableSlots(business_id, date, service_id);
  return slots.slots.length > 0;
}

function getDayLabel(dateStr: string): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const d = new Date(dateStr + 'T12:00:00');
  return isNaN(d.getTime()) ? '' : days[d.getDay()];
}
