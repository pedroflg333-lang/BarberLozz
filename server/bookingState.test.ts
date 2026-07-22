import {
  BookingState,
  isConfirmation,
  isDecline,
  isNewBookingRequest,
  isCancellationRequest,
  isRescheduleRequest,
  formatDateNatural
} from './bookingState.js';

let p = 0, f = 0;
const assert = (l: string, c: boolean) => (c ? p++ : f++, console.log(`  ${c ? '✅' : '❌'} ${l}`));

console.log('=== isConfirmation ===');
assert('sí → true', isConfirmation('sí'));
assert('si → true', isConfirmation('si'));
assert('vale → true', isConfirmation('vale'));
assert('ok → true', isConfirmation('ok'));
assert('perfecto → true', isConfirmation('perfecto'));
assert('resérvala → true', isConfirmation('resérvala'));
assert('adelante → true', isConfirmation('adelante'));
assert('dale → true', isConfirmation('dale'));
assert('claro → true', isConfirmation('claro'));
assert('confirmo → true', isConfirmation('confirmo'));
assert('"no" → false', !isConfirmation('no'));
assert('"quiero cita" → false', !isConfirmation('quiero cita'));
assert('"viernes" → false', !isConfirmation('viernes'));
assert('"s" → true (single letter)', isConfirmation('s'));

console.log('\n=== isDecline ===');
assert('no → true', isDecline('no'));
assert('no gracias → true', isDecline('no gracias'));
assert('mejor no → true', isDecline('mejor no'));
assert('otra hora → true', isDecline('otra hora'));
assert('"sí" → false', !isDecline('sí'));
assert('"vale" → false', !isDecline('vale'));

console.log('\n=== isNewBookingRequest ===');
assert('"otra cita" → true', isNewBookingRequest('quiero otra cita'));
assert('"nueva cita" → true', isNewBookingRequest('necesito una nueva cita'));
assert('"otra cita el viernes" → true', isNewBookingRequest('quiero otra cita el viernes'));
assert('"quiero cita" → false', !isNewBookingRequest('quiero cita para el viernes'));
assert('"hola" → false', !isNewBookingRequest('hola'));

console.log('\n=== isCancellationRequest ===');
assert('"cancelar cita" → true', isCancellationRequest('quiero cancelar mi cita'));
assert('"anular reserva" → true', isCancellationRequest('necesito anular una reserva'));
assert('"cancelación" → true', isCancellationRequest('solicito cancelación'));
assert('"hola" → false', !isCancellationRequest('hola'));
assert('"cancelar" alone → false (needs "cita" or "reserva")', !isCancellationRequest('cancelar'));

console.log('\n=== isRescheduleRequest ===');
assert('"cambiar cita" → true', isRescheduleRequest('quiero cambiar mi cita'));
assert('"reprogramar cita" → true', isRescheduleRequest('necesito reprogramar'));
assert('"cambio de fecha" → true', isRescheduleRequest('quiero un cambio de fecha'));
assert('"hola" → false', !isRescheduleRequest('hola'));

console.log('\n=== formatDateNatural ===');
assert('2026-07-24 → "24 de julio"', formatDateNatural('2026-07-24') === '24 de julio');
assert('with dayLabel → "viernes 24 de julio"', formatDateNatural('2026-07-24', 'viernes') === 'viernes 24 de julio');
assert('empty → ""', formatDateNatural('') === '');

console.log(`\n=== ${p} passed, ${f} failed ===`);
if (f > 0) process.exit(1);
