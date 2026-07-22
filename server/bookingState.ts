/**
 * Booking State Machine — manages persistent booking sessions in Supabase.
 * 
 * States: IDLE → WAITING_CONFIRMATION → CONFIRMED
 *         IDLE → CANCELLED
 *         WAITING_CONFIRMATION → CONFIRMED | CANCELLED | EXPIRED
 * 
 * Sessions survive server restarts (stored in booking_sessions table).
 */
import { supabaseAdmin, isSupabaseConfigured } from './supabase.js';
import { DEFAULT_BUSINESS_ID } from './config.js';

export enum BookingState {
  IDLE = 'IDLE',
  WAITING_SERVICE = 'WAITING_SERVICE',
  WAITING_DATE = 'WAITING_DATE',
  WAITING_TIME = 'WAITING_TIME',
  WAITING_CONFIRMATION = 'WAITING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface PendingBooking {
  id?: string;
  state: BookingState;
  business_id: string;
  conversation_id?: string;
  customer_id?: string;
  phone: string;
  name?: string;
  service_id?: string | null;
  service_name?: string | null;
  employee_id?: string | null;
  employee_name?: string | null;
  requested_date?: string | null;
  requested_time?: string | null;
  dayLabel?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * In-memory cache for fast lookups (synced with Supabase).
 */
const sessionCache = new Map<string, PendingBooking>();

function cacheKey(business_id: string, conversation_id: string): string {
  return `${business_id}::${conversation_id}`;
}

/**
 * Get or create a booking session for a business+conversation.
 * This is the primary function — always fetches from Supabase first,
 * falls back to cache, then creates if neither exists.
 */
export async function getOrCreateSession(
  business_id: string,
  conversation_id: string,
  phone: string
): Promise<PendingBooking> {
  const key = cacheKey(business_id, conversation_id);

  // Try Supabase first
  if (isSupabaseConfigured) {
    const { data: existing } = await supabaseAdmin
      .from('booking_sessions')
      .select('*')
      .eq('business_id', business_id)
      .eq('conversation_id', conversation_id)
      .maybeSingle();

    if (existing) {
      const session: PendingBooking = {
        id: existing.id,
        state: existing.state as BookingState,
        business_id: existing.business_id,
        conversation_id: existing.conversation_id,
        customer_id: existing.customer_id,
        phone: existing.phone,
        service_id: existing.service_id,
        service_name: existing.service_name,
        employee_id: existing.employee_id,
        employee_name: existing.employee_name,
        requested_date: existing.requested_date,
        requested_time: existing.requested_time,
        dayLabel: existing.daylabel,
        start_time: existing.start_time,
        end_time: existing.end_time,
        expires_at: existing.expires_at,
        created_at: existing.created_at,
        updated_at: existing.updated_at
      };

      // Handle expiry
      if (session.state === BookingState.WAITING_CONFIRMATION && session.expires_at) {
        if (new Date(session.expires_at) < new Date()) {
          session.state = BookingState.EXPIRED;
          await supabaseAdmin
            .from('booking_sessions')
            .update({ state: 'EXPIRED', updated_at: new Date().toISOString() })
            .eq('id', session.id);
        }
      }

      sessionCache.set(key, session);
      return session;
    }
  }

  // Check cache
  const cached = sessionCache.get(key);
  if (cached) return cached;

  // Create new session
  const session: PendingBooking = {
    state: BookingState.IDLE,
    business_id,
    conversation_id,
    phone
  };

  if (isSupabaseConfigured) {
    const { data: newSession, error } = await supabaseAdmin
      .from('booking_sessions')
      .insert({
        business_id,
        conversation_id,
        phone,
        state: 'IDLE'
      })
      .select()
      .single();

    if (error) {
      console.error(`[BookingState] Error creating session: ${error.message}`);
    } else if (newSession) {
      session.id = newSession.id;
      session.created_at = newSession.created_at;
    }
  }

  sessionCache.set(key, session);
  return session;
}

/**
 * Update a booking session's state in Supabase.
 */
export async function updateSession(
  business_id: string,
  conversation_id: string,
  updates: Partial<PendingBooking>
): Promise<PendingBooking> {
  const key = cacheKey(business_id, conversation_id);
  const current = sessionCache.get(key) || await getOrCreateSession(business_id, conversation_id, '');

  const updated: PendingBooking = { ...current, ...updates };

  if (isSupabaseConfigured && current.id) {
    const dbUpdates: any = {
      state: updated.state,
      updated_at: new Date().toISOString()
    };
    if (updates.service_id !== undefined) dbUpdates.service_id = updates.service_id;
    if (updates.service_name !== undefined) dbUpdates.service_name = updates.service_name;
    if (updates.employee_id !== undefined) dbUpdates.employee_id = updates.employee_id;
    if (updates.employee_name !== undefined) dbUpdates.employee_name = updates.employee_name;
    if (updates.requested_date !== undefined) dbUpdates.requested_date = updates.requested_date;
    if (updates.requested_time !== undefined) dbUpdates.requested_time = updates.requested_time;
    if (updates.dayLabel !== undefined) dbUpdates.daylabel = updates.dayLabel;
    if (updates.start_time !== undefined) dbUpdates.start_time = updates.start_time;
    if (updates.end_time !== undefined) dbUpdates.end_time = updates.end_time;
    if (updates.customer_id !== undefined) dbUpdates.customer_id = updates.customer_id;
    if (updates.expires_at !== undefined) dbUpdates.expires_at = updates.expires_at;

    const { error } = await supabaseAdmin
      .from('booking_sessions')
      .update(dbUpdates)
      .eq('id', current.id);

    if (error) {
      console.error(`[BookingState] Error updating session: ${error.message}`);
    }
  }

  sessionCache.set(key, updated);
  return updated;
}

/**
 * Reset a booking session (delete from Supabase + cache).
 */
export async function resetSession(business_id: string, conversation_id: string): Promise<void> {
  const key = cacheKey(business_id, conversation_id);

  if (isSupabaseConfigured) {
    const cached = sessionCache.get(key);
    if (cached?.id) {
      await supabaseAdmin
        .from('booking_sessions')
        .delete()
        .eq('id', cached.id);
    }
  }

  sessionCache.delete(key);
}

/**
 * Get current session state for a business+conversation.
 */
export async function getSessionState(
  business_id: string,
  conversation_id: string
): Promise<BookingState> {
  const session = await getOrCreateSession(business_id, conversation_id, '');
  return session.state;
}

/**
 * Set session to WAITING_CONFIRMATION with booking data.
 * Also sets expiry to 15 minutes from now.
 */
export async function setWaitingConfirmation(
  business_id: string,
  conversation_id: string,
  data: {
    service_id: string;
    employee_id: string;
    requested_date: string;
    requested_time: string;
    start_time: string;
    end_time: string;
    customer_id: string;
    phone: string;
  }
): Promise<PendingBooking> {
  const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  return updateSession(business_id, conversation_id, {
    state: BookingState.WAITING_CONFIRMATION,
    service_id: data.service_id,
    employee_id: data.employee_id,
    requested_date: data.requested_date,
    requested_time: data.requested_time,
    start_time: data.start_time,
    end_time: data.end_time,
    customer_id: data.customer_id,
    expires_at
  });
}

/**
 * Clear the session cache (used for testing).
 */
export function clearSessionCache(): void {
  sessionCache.clear();
}

// ---- Synchronous helpers (no DB needed) ----

const AFFIRMATIVE_WORDS = new Set(['sí', 'si', 'vale', 'ok', 'okey', 'okay', 'dale', 'claro', 'sip', 'simon', 'simón']);
const AFFIRMATIVE_PHRASES = [
  'sí', 'si', 'vale', 'de acuerdo', 'ok', 'okey', 'okay',
  'perfecto', 'resérvala', 'reservala', 'confirmo',
  'adelante', 'dale', 'sí por favor', 'si por favor',
  'claro', 'por supuesto', 'reserva', 'confirmar',
  'agendalo', 'agéndalo', 'agendala', 'agéndala'
];

export function isConfirmation(message: string): boolean {
  const msg = message.toLowerCase().trim();
  const normalized = msg.normalize('NFC');
  if (AFFIRMATIVE_PHRASES.includes(normalized)) return true;
  if (AFFIRMATIVE_WORDS.has(normalized)) return true;
  const stripped = normalized.replace(/[^a-z]/g, '');
  if (stripped === 's' || stripped === 'si' || stripped === 'sim') return true;
  if (stripped === 'vale' || stripped === 'ok' || stripped === 'okey') return true;
  if (stripped === 'dale' || stripped === 'claro' || stripped === 'sip') return true;
  return false;
}

const DECLINE_WORDS = new Set(['no', 'nop', 'nope']);
const DECLINE_PHRASES = [
  'no', 'no gracias', 'no, gracias', 'no quiero', 'mejor no',
  'otra hora', 'otro día', 'después', 'luego', 'ahora no',
  'cancelar', 'cancela', 'para nada'
];

export function isDecline(message: string): boolean {
  const msg = message.toLowerCase().trim();
  if (DECLINE_PHRASES.includes(msg)) return true;
  if (DECLINE_WORDS.has(msg)) return true;
  if (msg.startsWith('no ')) return true;
  return false;
}

export function isNewBookingRequest(message: string): boolean {
  const msg = message.toLowerCase();
  if (/\botra\s+cita\b/.test(msg)) return true;
  if (/\bnuev[oa]\s+(cita|reserva)\b/.test(msg)) return true;
  if (/\b(otra|nueva)\s+(cita|reserva|vez)\b/.test(msg)) return true;
  return false;
}

export function isCancellationRequest(message: string): boolean {
  const msg = message.toLowerCase();
  // "cancelación" alone is specific enough to be a cancellation request
  if (/cancelaci[oó]n/.test(msg)) return true;
  // Otherwise require both a cancellation verb and a booking noun
  return /cancelar|cancela|anular|anula/i.test(msg) &&
    /cita|reserva/i.test(msg);
}

export function isRescheduleRequest(message: string): boolean {
  const msg = message.toLowerCase();
  return /cambiar|reprogramar|cambio\s+(de\s+)?(cita|reserva|hora|fecha)|modificar\s+(mi\s+)?(cita|reserva)/i.test(msg);
}

const SPANISH_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function formatDateNatural(dateStr: string, dayLabel?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  const monthName = SPANISH_MONTHS[month - 1] || '';
  const dayName = dayLabel || '';
  if (dayName) {
    return `${dayName} ${day} de ${monthName}`;
  }
  return `${day} de ${monthName}`;
}

export function formatTimeNatural(time: string): string {
  return time;
}
