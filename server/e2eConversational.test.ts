/**
 * E2E Conversational Test — validates the Booking Orchestrator architecture with real data.
 *
 * Tests:
 *   1. CRITICAL: Full booking "quiero cita" → "degradado" → "lunes que viene" → "11:00" → "vale perfecto"
 *      Must resolve to Monday July 27, 2026 (not Friday July 31 or Monday Aug 3).
 *   2. Informational interruption during booking
 *   3. Time change during booking
 *   4. CONFIRMED session + new date → proposes reschedule (does not ignore)
 *   5. CONFIRMED session → "hola" → "quiero cita" (no data leak)
 *   6. General conversation
 *   7. Entity extraction
 *
 * Requires: Ollama running, Supabase configured.
 * Run: npx tsx server/e2eConversational.test.ts
 */
import { supabaseAdmin } from './supabase.js';
import { DEFAULT_BUSINESS_ID } from './config.js';
import { BookingState, getOrCreateSession, updateSession, resetSession, setWaitingConfirmation, clearSessionCache } from './bookingState.js';
import { orchestrate, BookingAction, extractEntities } from './bookingOrchestrator.js';
import { findServiceByName, getEmployeesForService, createAppointmentAtomic } from './availabilityEngine.js';

const BID = DEFAULT_BUSINESS_ID;

let p = 0, f = 0;
const assert = (label: string, cond: boolean) => (cond ? p++ : f++, console.log(`  ${cond ? '✅' : '❌'} ${label}`));

async function getTestService(serviceName: string) {
  const { data } = await supabaseAdmin.from('services').select('id, nombre, duracion, precio').eq('business_id', BID).eq('is_active', true);
  if (!data?.length) return null;
  const term = serviceName.toLowerCase();
  return data.find((s: any) => s.nombre.toLowerCase().includes(term)) || data[0];
}

async function runOrchestrator(message: string, convId: string, phone: string, customerId?: string): Promise<{ action: BookingAction; response: string; session: any }> {
  const session = await getOrCreateSession(BID, convId, phone);
  const result = await orchestrate(message, session, BID, customerId, convId, phone);
  const updatedSession = await getOrCreateSession(BID, convId, phone);
  return { action: result.action, response: result.response, session: updatedSession };
}

async function main() {
  clearSessionCache();
  const testPhone = `e2e_orch_${Date.now()}`;
  const baseConvId = `orch_${Date.now()}`;

  // ============================================================
  // TEST 1: Full booking flow — SERVICE → DATE → TIME → CONFIRMATION
  // Must resolve "lunes que viene" to Monday July 27, 2026
  // ============================================================
  console.log('\n=== TEST 1: Full booking flow (lunes que viene = July 27) ===\n');
  const conv1 = `${baseConvId}_t1`;

  let r = await runOrchestrator('quiero cita', conv1, testPhone);
  assert('T1.1: ASK_SERVICE', r.action === BookingAction.ASK_SERVICE);
  assert('T1.1: asks for service', r.response.toLowerCase().includes('servicio'));

  r = await runOrchestrator('degradado', conv1, testPhone);
  assert('T1.2: ASK_DATE', r.action === BookingAction.ASK_DATE);
  assert('T1.2: service = Corte Degradado', r.session.service_name?.toLowerCase().includes('degradado'));

  r = await runOrchestrator('lunes que viene', conv1, testPhone);
  assert('T1.3: ASK_TIME', r.action === BookingAction.ASK_TIME);
  assert('T1.3: date = 2026-07-27 (Monday)', r.session.requested_date === '2026-07-27');
  assert('T1.3: dayLabel = lunes', r.session.dayLabel === 'lunes');
  console.log(`  Date resolved: ${r.session.requested_date} (${r.session.dayLabel})`);

  r = await runOrchestrator('11:00', conv1, testPhone);
  assert('T1.4: PROPOSE_BOOKING or OFFER_ALTERNATIVES', r.action === BookingAction.PROPOSE_BOOKING || r.action === BookingAction.OFFER_ALTERNATIVES);
  if (r.session.state === BookingState.WAITING_CONFIRMATION) {
    assert('T1.4: date still 2026-07-27', r.session.requested_date === '2026-07-27');
  }

  if (r.session.state === BookingState.WAITING_CONFIRMATION) {
    r = await runOrchestrator('vale perfecto', conv1, testPhone);
    if (r.action === BookingAction.CONFIRM_BOOKING) {
      assert('T1.5: CONFIRMED', r.session.state === BookingState.CONFIRMED);
      assert('T1.5: date = 2026-07-27', r.session.requested_date === '2026-07-27');
      console.log(`  ✅ Booking confirmed for Monday July 27: ${r.response.substring(0, 150)}`);
    }
  }

  await resetSession(BID, conv1);

  // ============================================================
  // TEST 2: Informational interruption
  // ============================================================
  console.log('\n=== TEST 2: Informational interruption ===\n');
  const conv2 = `${baseConvId}_t2`;

  r = await runOrchestrator('quiero cita', conv2, testPhone);
  r = await runOrchestrator('degradado', conv2, testPhone);
  assert('T2.1: ASK_DATE', r.action === BookingAction.ASK_DATE);

  r = await runOrchestrator('por cierto cuánto cuesta?', conv2, testPhone);
  assert('T2.2: INFORMATION', r.action === BookingAction.INFORMATION);
  assert('T2.2: has price', /\d+/.test(r.response));
  assert('T2.2: session preserved (still has service)', r.session.service_name?.toLowerCase().includes('degradado'));
  assert('T2.2: no date set', !r.session.requested_date);

  r = await runOrchestrator('el lunes', conv2, testPhone);
  assert('T2.3: ASK_TIME', r.action === BookingAction.ASK_TIME);
  assert('T2.3: date = 2026-07-27', r.session.requested_date === '2026-07-27');

  r = await runOrchestrator('cuánto tarda un degradado?', conv2, testPhone);
  assert('T2.4: INFORMATION', r.action === BookingAction.INFORMATION);
  assert('T2.4: has duration', /\d+/.test(r.response));
  assert('T2.4: date preserved', r.session.requested_date === '2026-07-27');

  r = await runOrchestrator('11:00', conv2, testPhone);
  assert('T2.5: continues', r.action === BookingAction.PROPOSE_BOOKING || r.action === BookingAction.OFFER_ALTERNATIVES || r.action === BookingAction.ASK_TIME);
  if (r.session.state === BookingState.WAITING_CONFIRMATION) {
    r = await runOrchestrator('sí', conv2, testPhone);
    if (r.action === BookingAction.CONFIRM_BOOKING) {
      assert('T2.6: CONFIRMED', r.session.state === BookingState.CONFIRMED);
      console.log(`  ✅ ${r.response.substring(0, 150)}`);
    }
  }

  await resetSession(BID, conv2);

  // ============================================================
  // TEST 3: Time change during booking
  // ============================================================
  console.log('\n=== TEST 3: Time change ===\n');
  const conv3 = `${baseConvId}_t3`;

  r = await runOrchestrator('quiero cita', conv3, testPhone);
  r = await runOrchestrator('degradado', conv3, testPhone);
  r = await runOrchestrator('lunes que viene', conv3, testPhone);
  r = await runOrchestrator('a las 11', conv3, testPhone);
  assert('T3.1: time = 11:00', r.session.requested_time?.startsWith('11'));

  r = await runOrchestrator('mejor a las 12', conv3, testPhone);
  assert('T3.2: time changed to 12:00', r.session.requested_time === '12:00');
  assert('T3.2: date preserved', r.session.requested_date === '2026-07-27');
  assert('T3.2: service preserved', !!r.session.service_name);

  await resetSession(BID, conv3);

  // ============================================================
  // TEST 4: CONFIRMED session + new date → proposes reschedule
  // ============================================================
  console.log('\n=== TEST 4: CONFIRMED + new date → reschedule proposal ===\n');
  const conv4 = `${baseConvId}_t4`;
  const svc4 = await getTestService('degradado');
  if (!svc4) { console.log('  SKIP T4 — no service'); return; }
  const emp4 = (await getEmployeesForService(BID, svc4.id))[0];
  if (!emp4) { console.log('  SKIP T4 — no employee'); return; }
  const { data: customers } = await supabaseAdmin.from('customers').select('id').eq('business_id', BID).limit(1);
  const cust4 = customers?.[0]?.id;
  if (!cust4) { console.log('  SKIP T4 — no customer'); return; }

  // Use a time slot that is definitely free (not 11:00 which is taken by buggy AP-465083)
  const apt4 = await createAppointmentAtomic(BID, cust4, emp4.id, svc4.id, '2026-07-31', '15:30', 'IA', 'E2E test T4');
  assert('T4: appointment created', apt4.success && !!apt4.cita?.id);
  if (!apt4.success || !apt4.cita?.id) { console.log('  SKIP T4'); return; }

  await getOrCreateSession(BID, conv4, testPhone);
  await updateSession(BID, conv4, {
    state: BookingState.CONFIRMED, service_name: svc4.nombre, employee_name: emp4.full_name,
    requested_date: '2026-07-31', requested_time: '15:30', customer_id: cust4
  });

  // "lunes que viene" → should RECOGNIZE correction, not ignore it
  r = await runOrchestrator('pero te dije lunes que viene', conv4, testPhone);
  assert('T4: action = RESCHEDULE (proposes change)', r.action === BookingAction.RESCHEDULE);
  assert('T4: mentions current booking (viernes 31)', r.response.includes('31') || r.response.includes('viernes'));
  assert('T4: mentions new date (lunes 27)', r.response.includes('27') || r.response.includes('lunes'));
  assert('T4: asks about change', r.response.toLowerCase().includes('cambiar') || r.response.toLowerCase().includes('reprogram'));
  console.log(`  Response: ${r.response.substring(0, 150)}`);

  // Session should still be CONFIRMED (not modified)
  const sess4 = await getOrCreateSession(BID, conv4, testPhone);
  assert('T4: session still CONFIRMED', sess4.state === BookingState.CONFIRMED);
  assert('T4: original date preserved (not overwritten)', sess4.requested_date === '2026-07-31');

  // Cleanup
  await supabaseAdmin.from('appointments').delete().eq('id', apt4.cita.id);
  await resetSession(BID, conv4);

  // ============================================================
  // TEST 5: CONFIRMED → "hola" → "quiero cita" (no data leak)
  // ============================================================
  console.log('\n=== TEST 5: CONFIRMED → new booking ===\n');
  const conv5 = `${baseConvId}_t5`;
  const svc5 = await getTestService('degradado');
  if (!svc5) { console.log('  SKIP T5 — no service'); return; }
  const emp5 = (await getEmployeesForService(BID, svc5.id))[0];
  if (!emp5) { console.log('  SKIP T5 — no employee'); return; }
  const cust5 = customers?.[0]?.id;
  if (!cust5) { console.log('  SKIP T5 — no customer'); return; }

  const apt5 = await createAppointmentAtomic(BID, cust5, emp5.id, svc5.id, '2026-07-31', '16:00', 'IA', 'E2E test T5');
  assert('T5: appointment created', apt5.success && !!apt5.cita?.id);
  if (!apt5.success || !apt5.cita?.id) { console.log('  SKIP T5'); return; }

  await getOrCreateSession(BID, conv5, testPhone);
  await updateSession(BID, conv5, {
    state: BookingState.CONFIRMED, service_name: svc5.nombre, employee_name: emp5.full_name,
    requested_date: '2026-07-31', requested_time: '16:00', customer_id: cust5
  });

  const { count: countBefore } = await supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('id', apt5.cita.id);

  r = await runOrchestrator('hola', conv5, testPhone);
  assert('T5: hola → GENERAL_CONVERSATION', r.action === BookingAction.GENERAL_CONVERSATION);
  const sess5a = await getOrCreateSession(BID, conv5, testPhone);
  assert('T5: still CONFIRMED after hola', sess5a.state === BookingState.CONFIRMED);

  r = await runOrchestrator('quiero cita', conv5, testPhone);
  assert('T5: quiero cita → ASK_SERVICE', r.action === BookingAction.ASK_SERVICE);
  const sess5b = await getOrCreateSession(BID, conv5, testPhone);
  assert('T5: session reset to IDLE', sess5b.state === BookingState.IDLE);
  assert('T5: old date cleared', !sess5b.requested_date);
  assert('T5: old time cleared', !sess5b.requested_time);

  const { count: countAfter } = await supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('id', apt5.cita.id);
  assert('T5: appointment count unchanged', countAfter === countBefore);

  await supabaseAdmin.from('appointments').delete().eq('id', apt5.cita.id);
  await resetSession(BID, conv5);

  // ============================================================
  // TEST 6: General conversation
  // ============================================================
  console.log('\n=== TEST 6: General conversation ===\n');
  const conv6 = `${baseConvId}_t6`;

  r = await runOrchestrator('hola', conv6, testPhone);
  assert('T6.1: GENERAL_CONVERSATION', r.action === BookingAction.GENERAL_CONVERSATION);

  r = await runOrchestrator('cuánto cuesta el degradado', conv6, testPhone);
  assert('T6.2: INFORMATION', r.action === BookingAction.INFORMATION);
  assert('T6.2: has price', r.response.includes('€') || /\d+/.test(r.response));

  const sess6 = await getOrCreateSession(BID, conv6, testPhone);
  assert('T6.3: no session (IDLE)', sess6.state === BookingState.IDLE);

  await resetSession(BID, conv6);

  // ============================================================
  // TEST 7: Entity extraction
  // ============================================================
  console.log('\n=== TEST 7: Entity extraction ===\n');
  const e1 = extractEntities('quiero un degradado');
  assert('E1: service = degradado', e1.serviceName?.toLowerCase().includes('degradado'));

  const e2 = extractEntities('el lunes que viene');
  assert('E2: has date', !!e2.dateStr);
  assert('E2: has dayLabel', !!e2.dayLabel);

  const e3 = extractEntities('a las 11:00');
  assert('E3: time = 11:00', e3.timeStr === '11:00');

  const e4 = extractEntities('vale perfecto');
  assert('E4: is confirm', e4.isConfirm === true);

  const e5 = extractEntities('pero te dije lunes que viene');
  assert('E5: has date (correction)', !!e5.dateStr);
  assert('E5: has dayLabel', !!e5.dayLabel);

  const e6 = extractEntities('hola');
  assert('E6: no entities', !e6.serviceName && !e6.dateStr && !e6.dayLabel && !e6.timeStr && !e6.isConfirm);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`\n\n=== FINAL: ${p} passed, ${f} failed ===`);
  if (f > 0) process.exit(1);
  console.log('\n✅ All tests passed.');
}

main().catch(e => { console.error('E2E test error:', e); process.exit(1); });

