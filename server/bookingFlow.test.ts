/**
 * Booking Flow Tests — validates the interceptor + tool-based architecture.
 *
 * The booking flow is now:
 *   1. Cancellation / reschedule / new-booking interceptors (deterministic)
 *   2. WAITING_CONFIRMATION + confirm → create appointment (deterministic)
 *   3. WAITING_CONFIRMATION + decline → reset session (deterministic)
 *   4. Everything else → Qwen with tools (conversational)
 *
 * Run: npx tsx server/bookingFlow.test.ts
 */
import { resolveAppointmentDate } from './dateResolver.js';
import { isConfirmation, isDecline, isCancellationRequest, isNewBookingRequest, isRescheduleRequest, BookingState } from './bookingState.js';
import { buildFallbackFromToolCalls } from './fallbackResponse.js';

// Replicate extractTime from server.ts (pure function, no side effects)
const extractTime = (text: string): string => {
  const match = text.match(/\b(\d{2}:\d{2})\b/);
  if (match) return match[1];
  const matchNum = text.match(/las\s*(\d{1,2})/i) || text.match(/a las\s*(\d{1,2})/i);
  if (matchNum) {
    const h = parseInt(matchNum[1]);
    if (h >= 9 && h <= 20) return `${String(h).padStart(2, '0')}:00`;
  }
  return '';
};

// Replicate extractBookingComponents logic (pure, no side effects)
const extractBookingComponents = (userMessage: string): {
  date: string | null;
  dayLabel: string | null;
  time: string | null;
  service: string | null;
} => {
  const resolved = resolveAppointmentDate(userMessage);
  const date = resolved?.dateStr || null;
  const dayLabel = resolved?.dayName || null;
  const time = extractTime(userMessage) || null;
  const msg = userMessage.toLowerCase();
  let service: string | null = null;
  if (msg.includes('corte') || msg.includes('degradado') || msg.includes('cortar') || msg.includes('pelo') || msg.includes('fade')) service = 'Corte Degradado (Fade)';
  else if (msg.includes('barba')) service = 'Arreglo de Barba Premium';
  return { date, dayLabel, time, service };
};

// Simulates the CURRENT interceptor checks from server.ts:
//   0. isNewBookingRequest → reset session FIRST (regardless of state)
//   1. cancellation → handled
//   2. WAITING_CONFIRMATION + confirm → create appointment
//   3. WAITING_CONFIRMATION + decline → reset
//   4. Otherwise → Qwen with tools (conversational — no hardcoded routing)
function interceptorDecision(
  message: string,
  pending: { state?: BookingState; requested_date?: string | null; requested_time?: string | null; service_name?: string | null }
): { action: string; reason: string } {
  // Same order as server.ts:
  //   5z. isNewBookingRequest checked FIRST → resets session, then falls through
  if (isNewBookingRequest(message)) {
    pending = { state: BookingState.IDLE }; // Simulate backend reset
    // Fall through to remaining checks with fresh session
  }
  //   5a. Cancellation request
  if (isCancellationRequest(message)) {
    return { action: 'cancellation', reason: 'Cancellation request detected' };
  }
  //   5a. Reschedule request
  if (isRescheduleRequest(message)) {
    return { action: 'reschedule', reason: 'Reschedule request detected' };
  }
  //   5b. WAITING_CONFIRMATION + confirmation
  if (pending?.state === BookingState.WAITING_CONFIRMATION && isConfirmation(message)) {
    return { action: 'create_appointment', reason: 'WAITING_CONFIRMATION + confirm → create appointment' };
  }
  //   5c. WAITING_CONFIRMATION + decline
  if (pending?.state === BookingState.WAITING_CONFIRMATION && isDecline(message)) {
    return { action: 'decline_reset', reason: 'WAITING_CONFIRMATION + decline → reset' };
  }
  // Everything else → Qwen with tools
  return { action: 'qwen_with_tools', reason: 'Conversational — no interceptor matched' };
}

let p = 0, f = 0;
const assert = (label: string, cond: boolean) => (cond ? p++ : f++, console.log(`  ${cond ? '✅' : '❌'} ${label}`));

// Mock pending session (simulating an existing booking attempt)
const pendingSession: any = {
  state: BookingState.IDLE,
  requested_date: '2026-07-24',
  requested_time: '15:00',
  service_name: 'Corte Degradado (Fade)'
};

console.log('\n=== Interceptor: cancellation / reschedule / new-booking (always handled, no Qwen) ===');
{
  const r = interceptorDecision('cancelar cita', pendingSession);
  assert('"cancelar cita" → cancellation', r.action === 'cancellation');
}
{
  const r = interceptorDecision('quiero cancelar mi cita', pendingSession);
  assert('"quiero cancelar mi cita" → cancellation', r.action === 'cancellation');
}
{
  const r = interceptorDecision('quiero reprogramar mi cita', pendingSession);
  assert('"quiero reprogramar mi cita" → reschedule', r.action === 'reschedule');
}
{
  const r = interceptorDecision('otra cita', pendingSession);
  assert('"otra cita" → qwen_with_tools (reset first, not separate branch)', r.action === 'qwen_with_tools');
}

console.log('\n=== Interceptor: WAITING_CONFIRMATION + confirmation → create appointment ===');
{
  const pendingConfirm: any = { ...pendingSession, state: BookingState.WAITING_CONFIRMATION };
  const r = interceptorDecision('sí', pendingConfirm);
  assert('"sí" + WAITING_CONFIRMATION → create_appointment', r.action === 'create_appointment');
}
{
  const pendingConfirm: any = { ...pendingSession, state: BookingState.WAITING_CONFIRMATION };
  const r = interceptorDecision('vale', pendingConfirm);
  assert('"vale" + WAITING_CONFIRMATION → create_appointment', r.action === 'create_appointment');
}
{
  const pendingConfirm: any = { ...pendingSession, state: BookingState.WAITING_CONFIRMATION };
  const r = interceptorDecision('no', pendingConfirm);
  assert('"no" + WAITING_CONFIRMATION → decline_reset (not create_appointment)', r.action === 'decline_reset');
}

console.log('\n=== Interceptor: IDLE session → Qwen with tools (no hardcoded routing) ===');
// With IDLE session, ALL messages go to Qwen (no pre-classification)
{
  const r = interceptorDecision('hola', pendingSession);
  assert('"hola" → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('cuánto cuesta un corte', pendingSession);
  assert('"cuánto cuesta un corte" → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('he dicho hola', pendingSession);
  assert('"he dicho hola" → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('buenos días', pendingSession);
  assert('"buenos días" → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('gracias', pendingSession);
  assert('"gracias" → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('qué tal', pendingSession);
  assert('"qué tal" → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('15:30', pendingSession);
  assert('"15:30" → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('me viene bien a las 16:00', pendingSession);
  assert('"me viene bien a las 16:00" → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('la primera', pendingSession);
  assert('"la primera" → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('quiero cita el viernes a las 15:00 para un corte degradado', pendingSession);
  assert('"quiero cita..." → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('agenda una cita para el sábado', pendingSession);
  assert('"agenda una cita..." → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('qué servicios tenéis', pendingSession);
  assert('"qué servicios tenéis" → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('cuánto cuesta un corte', pendingSession);
  assert('"cuánto cuesta un corte" → qwen_with_tools (informational, no booking trigger)', r.action === 'qwen_with_tools');
}
{
  const r = interceptorDecision('tenéis hueco mañana', pendingSession);
  assert('"tenéis hueco mañana" → qwen_with_tools', r.action === 'qwen_with_tools');
}

console.log('\n=== Interceptor: WAITING_CONFIRMATION + informational → qwen (preserves session) ===');
// When a user is at WAITING_CONFIRMATION and asks something informational,
// it should NOT trigger create_appointment or reset.
{
  const pendingConfirm: any = { ...pendingSession, state: BookingState.WAITING_CONFIRMATION };
  const r = interceptorDecision('cuánto cuesta un corte', pendingConfirm);
  assert('"cuánto cuesta" + WAITING_CONFIRMATION → qwen_with_tools (not confirm, not decline)', r.action === 'qwen_with_tools');
}
{
  const pendingConfirm: any = { ...pendingSession, state: BookingState.WAITING_CONFIRMATION };
  const r = interceptorDecision('qué servicios tenéis', pendingConfirm);
  assert('"qué servicios" + WAITING_CONFIRMATION → qwen_with_tools', r.action === 'qwen_with_tools');
}
{
  const pendingConfirm: any = { ...pendingSession, state: BookingState.WAITING_CONFIRMATION };
  const r = interceptorDecision('hola', pendingConfirm);
  assert('"hola" + WAITING_CONFIRMATION → qwen_with_tools', r.action === 'qwen_with_tools');
}

console.log('\n=== No pending session → extractBookingComponents ===');
{
  const c = extractBookingComponents('hola');
  assert('"hola" extracts no date', c.date === null);
  assert('"hola" extracts no time', c.time === null);
  assert('"hola" extracts no service', c.service === null);
}
{
  const c = extractBookingComponents('he dicho hola');
  assert('"he dicho hola" extracts nothing', c.date === null && c.time === null && c.service === null);
}
{
  const c = extractBookingComponents('14:30');
  assert('"14:30" extracts time=14:30', c.time === '14:30');
  assert('"14:30" extracts no date', c.date === null);
}
{
  const c = extractBookingComponents('quiero cita el viernes');
  assert('"quiero cita el viernes" has date', c.date !== null);
  assert('"quiero cita el viernes" has dayLabel', c.dayLabel !== null);
}
{
  const c = extractBookingComponents('me gustaría un corte degradado a las 16:00');
  assert('"corte degradado 16:00" has time', c.time !== null);
  assert('"corte degradado 16:00" has service', c.service !== null);
}

console.log('\n=== Synchronous helpers (bookingState.ts) ===');
assert('"sí" is confirmation', isConfirmation('sí'));
assert('"vale" is confirmation', isConfirmation('vale'));
assert('"no" is NOT confirmation', !isConfirmation('no'));
assert('"no" is decline', isDecline('no'));
assert('"no gracias" is decline', isDecline('no gracias'));
assert('"cancelar cita" is cancellation', isCancellationRequest('cancelar cita'));
assert('"otra cita" is new booking request', isNewBookingRequest('otra cita'));
assert('"sí" is NOT decline', !isDecline('sí'));

console.log('\n=== Fallback: buildFallbackFromToolCalls (empty Qwen response guard) ===');
{
  const r = buildFallbackFromToolCalls([], { state: BookingState.IDLE }, '');
  assert('no tools, IDLE → generic', r === '¿En qué puedo ayudarte?');
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls([], { state: BookingState.CONFIRMED, service_name: 'Corte Degradado (Fade)' }, 'gracias');
  assert('CONFIRMED session → reminds confirmed', r.includes('confirmada'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls([], { state: BookingState.WAITING_CONFIRMATION, service_name: 'Corte Degradado (Fade)', requested_date: '2026-07-24', requested_time: '17:00' }, '');
  assert('WAITING_CONFIRMATION → asks confirm', r.includes('confirme'));
  assert('WAITING_CONFIRMATION → mentions service', r.includes('Corte Degradado'));
  assert('WAITING_CONFIRMATION → mentions time', r.includes('17:00'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls([], { service_name: 'Corte Degradado (Fade)', requested_date: '2026-07-24' }, 'viernes');
  assert('service+date, no time → asks time', r.includes('hora'));
  assert('service+date, no time → mentions date', r.includes('24'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls([], { service_name: 'Arreglo de Barba Premium' }, 'barba');
  assert('service only → asks day', r.includes('día'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls(
    [{ functionName: 'getServiceInfo', args: { serviceName: 'Corte Degradado (Fade)' }, result: { found: true, nombre: 'Corte Degradado (Fade)', precio: '15€', duracion: '30 minutos' } }],
    { state: BookingState.IDLE },
    'cuánto cuesta'
  );
  assert('getServiceInfo → price', r.includes('15€'));
  assert('getServiceInfo → duration', r.includes('30 minutos'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls(
    [{ functionName: 'checkAvailability', args: { date: '2026-07-24', serviceName: 'Corte Degradado (Fade)' }, result: { date: '2026-07-24', availableSlots: ['10:00', '11:00', '12:00'] } }],
    { state: BookingState.IDLE },
    'viernes'
  );
  assert('availableSlots → offers times', r.includes('10:00'));
  assert('availableSlots → asks which time', r.includes('Cuál'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls(
    [{ functionName: 'checkAvailability', args: { date: '2026-07-24', time: '15:00', serviceName: 'Corte Degradado (Fade)' }, result: { available: false, date: '2026-07-24', time: '15:00', alternatives: [{ time: '16:00' }, { time: '17:00' }] } }],
    { state: BookingState.IDLE },
    'las 3'
  );
  assert('not available + alternatives → suggests alternatives', r.includes('16:00'));
  assert('not available → says no disponibilidad', r.includes('no tengo'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls(
    [{ functionName: 'checkAvailability', args: { date: '2026-07-24', time: '15:00', serviceName: 'Corte Degradado (Fade)' }, result: { available: true, date: '2026-07-24', time: '15:00', employee: 'BarberLozz' } }],
    { state: BookingState.IDLE },
    'sí'
  );
  assert('available true → says hay disponibilidad', r.includes('disponibilidad'));
  assert('available true → mentions time', r.includes('15:00'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls(
    [{ functionName: 'suggestBooking', args: { date: '2026-07-24', time: '15:00', serviceName: 'Corte Degradado (Fade)' }, result: { success: true } }],
    { state: BookingState.WAITING_CONFIRMATION },
    'vale'
  );
  assert('suggestBooking success → proposes booking', r.includes('reserve la cita'));
  assert('suggestBooking → mentions time', r.includes('15:00'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls(
    [{ functionName: 'crear_cita', args: { servicio: 'Corte Degradado (Fade)' }, result: { success: true, cita: { id: '123' } } }],
    { state: BookingState.CONFIRMED },
    'vale perfecto'
  );
  assert('crear_cita success → says confirmada', r.includes('confirmada'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls(
    [{ functionName: 'suggestBooking', args: { date: '2026-07-24', time: '15:00', serviceName: 'Corte Degradado (Fade)' }, result: { success: false, message: 'Las 15:00 ya no están disponibles.' } }],
    { state: BookingState.IDLE },
    'sí'
  );
  assert('suggestBooking failed → says no disponible', r.includes('disponible'));
  assert('never empty', r.length > 0);
}

console.log('\n=== isNewBookingRequest expanded detection ===');
assert('"quiero cita" is new booking', isNewBookingRequest('quiero cita'));
assert('"quiero reservar" is new booking', isNewBookingRequest('quiero reservar'));
assert('"quiero una cita" is new booking', isNewBookingRequest('quiero una cita'));
assert('"necesito cita" is new booking', isNewBookingRequest('necesito cita'));
assert('"necesito una reserva" is new booking', isNewBookingRequest('necesito una reserva'));
assert('"agenda una cita" is new booking', isNewBookingRequest('agenda una cita'));
assert('"agendar cita" is new booking', isNewBookingRequest('agendar cita'));
assert('"otra cita" is new booking (existing)', isNewBookingRequest('otra cita'));
assert('"programar cita" is new booking', isNewBookingRequest('programar cita'));
assert('"programa una cita" is new booking', isNewBookingRequest('programa una cita'));

console.log('\n=== Fallback for CONFIRMED/CANCELLED/EXPIRED (closed sessions) ===');
// buildFallbackFromToolCalls with CONFIRMED/EXPIRED state should NOT leak booking data
{
  const r = buildFallbackFromToolCalls([], { state: BookingState.CONFIRMED, service_name: 'Corte Degradado (Fade)', requested_date: '2026-07-24', requested_time: '18:00' }, 'hola');
  assert('CONFIRMED → says ya está confirmada', r.includes('confirmada'));
  assert('CONFIRMED → does NOT offer time/date/data', !r.includes('18:00') && !r.includes('24'));
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls([], { state: BookingState.CANCELLED }, 'hola');
  assert('CANCELLED → generic fallback', r === '¿En qué puedo ayudarte?');
  assert('never empty', r.length > 0);
}
{
  const r = buildFallbackFromToolCalls([], { state: BookingState.EXPIRED }, 'hola');
  assert('EXPIRED → generic fallback', r === '¿En qué puedo ayudarte?');
  assert('never empty', r.length > 0);
}

console.log('\n=== Fake confirmation protection ===');
// When crear_cita NOT in functionCallsExecuted, must NOT say "confirmada"
{
  const r = buildFallbackFromToolCalls(
    [{ functionName: 'suggestBooking', args: { date: '2026-07-24', time: '15:00', serviceName: 'Corte Degradado (Fade)' }, result: { success: true } }],
    { state: BookingState.WAITING_CONFIRMATION },
    'vale perfecto'
  );
  // suggestBooking proposed — not confirmed yet — should NOT say confirmada
  assert('suggestBooking without crear_cita → "reserve la cita", NOT "confirmada"', r.includes('reserve la cita') && !r.includes('confirmada'));
  assert('never empty', r.length > 0);
}
{
  // Simulate what happens when Qwen lies about confirmation after suggestBooking only
  // The fakePatterns from server.ts should be rejected. Here we test that
  // buildFallbackFromToolCalls handles the scenario correctly.
  const r = buildFallbackFromToolCalls(
    [{ functionName: 'checkAvailability', args: { date: '2026-07-24', time: '15:00', serviceName: 'Corte Degradado (Fade)' }, result: { available: true, date: '2026-07-24', time: '15:00', employee: 'Test' } }],
    { state: BookingState.IDLE },
    'sí'
  );
  // Only checkAvailability, no crear_cita → must NOT say confirmada
  assert('no crear_cita → no "confirmada"', !r.includes('confirmada') && r.includes('disponibilidad'));
  assert('never empty', r.length > 0);
}

console.log(`\n=== ${p} passed, ${f} failed ===`);
if (f > 0) process.exit(1);
