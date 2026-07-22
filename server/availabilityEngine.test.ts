/**
 * Availability Engine + Booking State tests against REAL Supabase.
 * All operations use real data. Creates temporary test data, cleans up after.
 */
import { supabaseAdmin } from './supabase.js';
import {
  getAvailableSlots, isSlotAvailable, checkBusinessHours,
  getServiceDuration, findServiceByName, getEmployeesForService,
  checkAppointmentOverlap, getNextAvailableSlots,
  createAppointmentAtomic, getBlocksForDate
} from './availabilityEngine.js';
import {
  getOrCreateSession, updateSession, resetSession,
  BookingState, setWaitingConfirmation, clearSessionCache
} from './bookingState.js';

const BID = '4dbcb542-eeb2-45f0-8174-6da4f0fca741';
const EMP = '2508f1a6-2c61-4f7b-80cd-17dea189d97d';
const S30 = '2c063a4d-f252-4131-9ce2-083186f7801a';
const S20 = '9f143c08-c208-447a-be2d-9710657cc0e3';
const S50 = 'd6353406-7f97-46ff-91da-b9590991b8fa';
const CUST = '0421e5b7-3e18-4757-82fe-21cc99c6d7a9';

let p = 0, f = 0;
const ok = (l: string, c: boolean) => { if (c) p++; else f++; console.log(`  ${c ? '✅' : '❌'} ${l}`); };

const created: { table: string; id: string }[] = [];

async function clean() {
  for (const c of created) {
    try { await supabaseAdmin.from(c.table).delete().eq('id', c.id); } catch {}
  }
}

function nextDow(dow: number): string {
  const d = new Date(); d.setDate(d.getDate() + ((dow + 7 - d.getDay()) % 7 || 7));
  return d.toISOString().split('T')[0];
}

async function createConversation(phone: string): Promise<string> {
  const { data } = await supabaseAdmin.from('conversations').insert({
    business_id: BID, customer_phone: phone,
    status: 'ai_pending', channel: 'WHATSAPP'
  }).select().single();
  if (data) {
    created.push({ table: 'conversations', id: data.id });
    return data.id;
  }
  throw new Error('Failed to create conversation');
}

async function main() {
  console.log('=== AVAILABILITY ENGINE + BOOKING STATE TESTS (real Supabase) ===\n');
  const fri = nextDow(5), sat = nextDow(6), sun = nextDow(0), mon = nextDow(1);

  try {
    // ========== 1. BUSINESS HOURS ==========
    console.log('--- Business Hours ---');
    const fh = await checkBusinessHours(BID, fri);
    ok('Friday (open day): open', fh.open === true);
    ok('Friday: has hours', (fh.hours?.length || 0) > 0);

    const sh = await checkBusinessHours(BID, sun);
    ok('Sunday (closed day): closed', sh.open === false);
    ok('Sunday: has closed message', typeof sh.message === 'string');

    // ========== 2. SERVICE DURATION ==========
    console.log('\n--- Service Duration ---');
    ok('Corte Degradado (30min): 30', await getServiceDuration(S30) === 30);
    ok('Arreglo Barba (20min): 20', await getServiceDuration(S20) === 20);
    ok('Servicio Completo (50min): 50', await getServiceDuration(S50) === 50);

    // ========== 3. FIND SERVICE BY NAME ==========
    console.log('\n--- Find Service By Name ---');
    ok('Exact match: Corte Degradado (Fade)', (await findServiceByName(BID, 'Corte Degradado (Fade)'))?.id === S30);
    ok('Partial match: barba', (await findServiceByName(BID, 'barba'))?.id === S20);
    ok('Partial match: completo', (await findServiceByName(BID, 'completo'))?.id === S50);
    ok('Unknown: returns fallback (first available)', (await findServiceByName(BID, 'xyz')) !== null);

    // ========== 4. EMPLOYEES FOR SERVICE ==========
    console.log('\n--- Employees For Service ---');
    const empsAll = await getEmployeesForService(BID);
    ok('Has employees (no service filter)', empsAll.length >= 1);
    ok('Employee name: Test', empsAll[0]?.full_name === 'Test');

    // 4a. NO mappings exist yet → fallback to all employees
    const empsNoMapping = await getEmployeesForService(BID, S30);
    ok('No mappings yet: fallback to all employees', empsNoMapping.length >= 1);

    // 4b. Add a mapping only for S30 → strict mode activates
    const { data: mp1 } = await supabaseAdmin.from('employee_services')
      .insert({ business_id: BID, employee_id: EMP, service_id: S30 })
      .select().single();
    if (mp1) {
      created.push({ table: 'employee_services', id: mp1.id });
      ok('S30 mapped: returns employee for S30', (await getEmployeesForService(BID, S30)).length >= 1);
      
      // 4c. Strict mode: mappings exist but none for S50 → empty
      const empsStrict = await getEmployeesForService(BID, S50);
      ok('Strict mode: S50 has no mapping → empty', empsStrict.length === 0);
      console.log(`     Strict mode active: mappings exist for S30, S50 has 0 employees`);
      
      // 4d. Add mapping for S50 → now should return employee
      const { data: mp2 } = await supabaseAdmin.from('employee_services')
        .insert({ business_id: BID, employee_id: EMP, service_id: S50 })
        .select().single();
      if (mp2) {
        created.push({ table: 'employee_services', id: mp2.id });
        ok('S50 mapped: returns employee for S50', (await getEmployeesForService(BID, S50)).length >= 1);
        await supabaseAdmin.from('employee_services').delete().eq('id', mp2.id);
      }
      
      // 4e. Clean first mapping
      await supabaseAdmin.from('employee_services').delete().eq('id', mp1.id);
    }

    // 4f. After cleanup, no mappings again → fallback reactivates
    const empsAfterCleanup = await getEmployeesForService(BID, S30);
    ok('No mappings after cleanup: fallback to all', empsAfterCleanup.length >= 1);

    // ========== 5. AVAILABLE SLOTS GENERATION ==========
    console.log('\n--- Available Slots Generation ---');
    const slots30 = await getAvailableSlots(BID, fri, S30);
    ok('Friday 30min: has slots', slots30.slots.length > 0);
    ok('Service name: Corte Degradado (Fade)', slots30.service_name === 'Corte Degradado (Fade)');
    ok('Duration: 30min', slots30.duration_minutes === 30);
    if (slots30.slots.length > 0) {
      const s = slots30.slots[0];
      ok('Slot start: HH:MM format', /^\d{2}:\d{2}$/.test(s.start));
      ok('Slot end: HH:MM format', /^\d{2}:\d{2}$/.test(s.end));
      ok('Slot has employee_id', !!s.employee_id);
      ok('Slot employee: Test', s.employee_name === 'Test');
      const [sh, sm] = s.start.split(':').map(Number), [eh, em] = s.end.split(':').map(Number);
      ok('Slot: 30min duration', (eh * 60 + em) - (sh * 60 + sm) === 30);
    }
    console.log(`     30min slots: ${slots30.slots.length}`);

    const slots50 = await getAvailableSlots(BID, fri, S50);
    ok('Friday 50min: has slots', slots50.slots.length > 0);
    console.log(`     50min slots: ${slots50.slots.length}`);

    const slotsSun = await getAvailableSlots(BID, sun, S30);
    ok('Sunday (closed): 0 slots', slotsSun.slots.length === 0);

    // ========== 6. SLOT AVAILABILITY CHECK ==========
    console.log('\n--- Slot Availability (no appointments yet) ---');
    if (slots30.slots.length > 0) {
      const s = slots30.slots[0];
      // Delete any existing appointment at this time first
      const avail = await isSlotAvailable(BID, fri, s.start, s.end, s.employee_id!, S30);
      ok('First free slot: available', avail.available === true);
    }

    // ========== 7. APPOINTMENT OVERLAP ==========
    console.log('\n--- Appointment Overlap Detection ---');

    // Create a test appointment at 10:00-10:30
    const { data: apt } = await supabaseAdmin.from('appointments').insert({
      business_id: BID, customer_id: CUST, employee_id: EMP,
      servicio_id: S30, fecha: fri, hora: '10:00',
      estado: 'pending', origen: 'IA', notes: 'test overlap', price_charged: 18
    }).select().single();

    if (apt) {
      created.push({ table: 'appointments', id: apt.id });

      // Same time slot
      ok('10:00-10:30 overlaps existing 10:00-10:30', await checkAppointmentOverlap(BID, EMP, fri, '10:00', '10:30'));
      // Partial overlap: starts 15min before, ends 15min after start
      ok('09:45-10:15 overlaps (partial start)', await checkAppointmentOverlap(BID, EMP, fri, '09:45', '10:15'));
      // Partial overlap: starts during, ends after
      ok('10:15-10:45 overlaps (partial end)', await checkAppointmentOverlap(BID, EMP, fri, '10:15', '10:45'));
      // Complete overlap
      ok('09:45-10:45 overlaps (complete)', await checkAppointmentOverlap(BID, EMP, fri, '09:45', '10:45'));
      // Before: no overlap
      ok('09:00-09:30 no overlap (before)', !(await checkAppointmentOverlap(BID, EMP, fri, '09:00', '09:30')));
      // After: no overlap (adjacent is OK)
      ok('10:30-11:00 no overlap (after)', !(await checkAppointmentOverlap(BID, EMP, fri, '10:30', '11:00')));
      // Null employee: no overlap
      ok('null employee: no overlap', !(await checkAppointmentOverlap(BID, null, fri, '10:00', '10:30')));

      await supabaseAdmin.from('appointments').delete().eq('id', apt.id);
    }

    // ========== 8. BLOCKS ==========
    console.log('\n--- Blocks ---');

    // 8a. Global (business-wide) block
    const { data: blk1 } = await supabaseAdmin.from('blocks').insert({
      business_id: BID, employee_id: null, reason: 'break',
      block_date: fri, start_time: '12:00', end_time: '13:00'
    }).select().single();
    if (blk1) {
      created.push({ table: 'blocks', id: blk1.id });

      const afterBlock = await getAvailableSlots(BID, fri, S30);
      const blockedSlots = afterBlock.slots.filter(s => s.start >= '12:00' && s.start < '13:00');
      ok('Global block 12-13: no slots in that window', blockedSlots.length === 0);

      ok('Global block: 12:00 unavailable', !(await isSlotAvailable(BID, fri, '12:00', '12:30', EMP, S30)).available);
      ok('Global block: message returned', typeof (await isSlotAvailable(BID, fri, '12:00', '12:30', EMP, S30)).message === 'string');

      await supabaseAdmin.from('blocks').delete().eq('id', blk1.id);
    }

    // 8b. Employee-specific block
    const { data: blk2 } = await supabaseAdmin.from('blocks').insert({
      business_id: BID, employee_id: EMP, reason: 'training',
      block_date: fri, start_time: '15:00', end_time: '16:00'
    }).select().single();
    if (blk2) {
      created.push({ table: 'blocks', id: blk2.id });

      ok('Emp block 15-16: employee unavailable', !(await isSlotAvailable(BID, fri, '15:00', '15:30', EMP, S30)).available);
      // Null employee should NOT be affected by employee-specific block
      const nullEmpAvail = await isSlotAvailable(BID, fri, '15:00', '15:30', null, S30);
      ok('Emp block: null employee NOT affected', nullEmpAvail.available === true);

      await supabaseAdmin.from('blocks').delete().eq('id', blk2.id);
    }

    // ========== 9. ALTERNATIVE SLOTS ==========
    console.log('\n--- Alternative Slots (Next Available) ---');

    // 9a. Busy time → alternatives returned
    // First create an appointment at 14:00 to make it busy
    const { data: busyApt } = await supabaseAdmin.from('appointments').insert({
      business_id: BID, customer_id: CUST, employee_id: EMP,
      servicio_id: S30, fecha: fri, hora: '14:00',
      estado: 'pending', origen: 'IA', notes: 'busy slot', price_charged: 18
    }).select().single();
    if (busyApt) {
      created.push({ table: 'appointments', id: busyApt.id });
      
      // Now 14:00 should be busy → alternatives near 14:00
      const alt = await getNextAvailableSlots(BID, fri, S30, '14:00', { count: 3 });
      ok('Alternatives: has results', alt.slots.length > 0);
      ok('Alternatives: max 3', alt.slots.length <= 3);
      ok('Alternatives: 14:00 not included', alt.slots.every(s => s.start !== '14:00'));
      console.log(`     Closest 3 to 14:00: ${alt.slots.map(s => s.start).join(', ')}`);

      // 9b. Each alternative is actually available
      for (const s of alt.slots) {
        const chk = await isSlotAvailable(BID, fri, s.start, s.end, s.employee_id!, S30);
        if (!chk.available) {
          console.log(`     WARNING: ${s.start} was offered but not available: ${chk.message}`);
        }
        ok(`Alternative ${s.start}: really available`, chk.available === true);
      }
    }

    // 9c. Alternatives respect duration (30min service → each slot is 30min)
    const altDur = await getNextAvailableSlots(BID, fri, S30, '10:00', { count: 3 });
    for (const s of altDur.slots) {
      const [sh, sm] = s.start.split(':').map(Number), [eh, em] = s.end.split(':').map(Number);
      ok(`Alt slot ${s.start}: 30min duration`, (eh * 60 + em) - (sh * 60 + sm) === 30);
    }

    // 9d. Alternatives respect employee_services (strict mode)
    // Insert a mapping only for S30 (employee can do S30)
    const { data: tmpMapAlt } = await supabaseAdmin.from('employee_services')
      .insert({ business_id: BID, employee_id: EMP, service_id: S30 })
      .select().single();
    if (tmpMapAlt) {
      // Now ask for S50 alternatives — employee has no S50 mapping
      const altS50 = await getNextAvailableSlots(BID, fri, S50, '10:00', { count: 3 });
      ok('Strict: no S50 mapping → 0 alt slots for S50', altS50.slots.length === 0);
      await supabaseAdmin.from('employee_services').delete().eq('id', tmpMapAlt.id);
    }

    // 9e. Alternatives never include blocked hours
    const { data: tmpBlockAlt } = await supabaseAdmin.from('blocks').insert({
      business_id: BID, employee_id: EMP, reason: 'lunch',
      block_date: fri, start_time: '13:00', end_time: '14:00'
    }).select().single();
    if (tmpBlockAlt) {
      created.push({ table: 'blocks', id: tmpBlockAlt.id });
      const altNoBlock = await getNextAvailableSlots(BID, fri, S30, '13:30', { count: 5 });
      const blocked = altNoBlock.slots.filter(s => s.start >= '13:00' && s.start < '14:00');
      ok('Blocked 13-14: no alt slots in that window', blocked.length === 0);
      await supabaseAdmin.from('blocks').delete().eq('id', tmpBlockAlt.id);
    }

    // ========== 10. ATOMIC APPOINTMENT (RPC) ==========
    console.log('\n--- Atomic Appointment (RPC book_appointment) ---');

    // Pick an available slot after 16:00
    const availableSlots = (await getAvailableSlots(BID, fri, S30)).slots.filter(s => s.start >= '16:00');
    if (availableSlots.length > 0) {
      const sl = availableSlots[0];
      const r = await createAppointmentAtomic(BID, CUST, EMP, S30, fri, sl.start, 'IA', 'Test RPC booking');
      ok('RPC: success', r.success === true);
      if (r.success && r.cita?.id) {
        created.push({ table: 'appointments', id: r.cita.id });
        ok('Appointment: estado = pending', r.cita.estado === 'pending');
        ok('Appointment: has employee_name', typeof r.cita.employee_name === 'string');
        console.log(`     Created: ${r.cita.id} at ${r.cita.hora} by ${r.cita.employee_name}`);

        // Duplicate booking → should be rejected
        const r2 = await createAppointmentAtomic(BID, CUST, EMP, S30, fri, sl.start, 'IA', 'Duplicate attempt');
        ok('RPC: duplicate rejected', r2.success === false);
        console.log(`     Duplicate msg: ${r2.message}`);
      }
    }

    // ========== 11. MULTI-TENANT SECURITY (cross-business) ==========
    console.log('\n--- Multi-tenant Security ---');
    const fakeBiz = '00000000-0000-0000-0000-000000000000';
    const cross = await createAppointmentAtomic(fakeBiz, CUST, EMP, S30, fri, '10:00', 'IA', 'Cross-tenant');
    ok('Cross-tenant: rejected', cross.success === false);
    console.log(`     Cross-tenant msg: ${cross.message}`);

    const badCust = await createAppointmentAtomic(BID, fakeBiz, EMP, S30, fri, '10:00', 'IA', 'Bad customer');
    ok('Fake customer: rejected', badCust.success === false);
    console.log(`     Bad customer msg: ${badCust.message}`);

    // ========== 12. EDGE CASES ==========
    console.log('\n--- Edge Cases ---');

    // 12a. 50min service should fit before close (20:30)
    const s50 = await getAvailableSlots(BID, fri, S50);
    if (s50.slots.length > 0) {
      const last = s50.slots[s50.slots.length - 1];
      const [lh, lm] = last.end.split(':').map(Number);
      ok('50min: last slot ends ≤ 20:30', lh * 60 + lm <= 20 * 60 + 30);
      console.log(`     Last 50min slot: ${last.start}-${last.end}`);
    }

    // 12b. 30min service should have more slots than 50min
    ok('30min slots > 50min slots (shorter service)', slots30.slots.length > s50.slots.length);

    // 12c. Employee availability: no employee for nonexistent service (no mappings → fallback)
    const empsNone = await getEmployeesForService(BID, '00000000-0000-0000-0000-000000000000');
    ok('Fake service (no mappings): returns all employees (fallback)', empsNone.length >= 1);

    // 12d. With mappings active, fake service → empty
    const { data: tmpMap } = await supabaseAdmin.from('employee_services')
      .insert({ business_id: BID, employee_id: EMP, service_id: S30 })
      .select().single();
    if (tmpMap) {
      const empsStrictFake = await getEmployeesForService(BID, '00000000-0000-0000-0000-000000000000');
      ok('With mappings: fake service returns empty (strict)', empsStrictFake.length === 0);
      await supabaseAdmin.from('employee_services').delete().eq('id', tmpMap.id);
    }

    // ========== 13. BOOKING SESSION PERSISTENCE ==========
    console.log('\n--- Booking Session Persistence ---');
    const convId1 = await createConversation('34699000001');
    const ph1 = '34699000001';

    // Create session with valid conversation_id
    const s1 = await getOrCreateSession(BID, convId1, ph1);
    ok('Session: state = IDLE', s1.state === BookingState.IDLE);
    ok('Session: has id', typeof s1.id === 'string' && s1.id.length > 0);
    if (s1.id) created.push({ table: 'booking_sessions', id: s1.id });

    // Transition to WAITING_CONFIRMATION
    const w1 = await setWaitingConfirmation(BID, convId1, {
      service_id: S30, employee_id: EMP,
      requested_date: fri, requested_time: '11:00',
      start_time: '11:00', end_time: '11:30',
      customer_id: CUST, phone: ph1
    });
    ok('WAITING_CONFIRMATION: correct state', w1.state === BookingState.WAITING_CONFIRMATION);
    ok('WAITING_CONFIRMATION: has expires_at', typeof w1.expires_at === 'string');
    ok('WAITING_CONFIRMATION: customer_id set', w1.customer_id === CUST);
    ok('WAITING_CONFIRMATION: service_id set', w1.service_id === S30);
    ok('WAITING_CONFIRMATION: date set', w1.requested_date === fri);
    ok('WAITING_CONFIRMATION: time set', w1.requested_time === '11:00');

    // Simulate restart: clear in-memory cache
    clearSessionCache();

    // The session should be recovered from Supabase
    const sRecover = await getOrCreateSession(BID, convId1, ph1);
    ok('Recovered: state = WAITING_CONFIRMATION', sRecover.state === BookingState.WAITING_CONFIRMATION);
    ok('Recovered: service persists', sRecover.service_id === S30);
    ok('Recovered: date persists', sRecover.requested_date === fri);

    // Transition to CONFIRMED
    await updateSession(BID, convId1, { state: BookingState.CONFIRMED } as any);
    clearSessionCache();
    const sConfirmed = await getOrCreateSession(BID, convId1, ph1);
    ok('CONFIRMED: state persists', sConfirmed.state === BookingState.CONFIRMED);

    // Reset
    await resetSession(BID, convId1);
    clearSessionCache();
    const sReset = await getOrCreateSession(BID, convId1, '');
    ok('After reset: state = IDLE', sReset.state === BookingState.IDLE);

    // ========== 14. DOUBLE CONFIRMATION ==========
    console.log('\n--- Double Confirmation ---');
    const convId2 = await createConversation('34699000002');

    // Create session and set WAITING_CONFIRMATION
    await setWaitingConfirmation(BID, convId2, {
      service_id: S30, employee_id: EMP,
      requested_date: sat, requested_time: '10:00',
      start_time: '10:00', end_time: '10:30',
      customer_id: CUST, phone: '34699000002'
    });

    // First confirmation → create appointment
    const dc1 = await createAppointmentAtomic(BID, CUST, EMP, S30, sat, '10:00', 'IA', 'First confirm');
    ok('First confirm: success', dc1.success === true);
    if (dc1.cita?.id) created.push({ table: 'appointments', id: dc1.cita.id });

    // Second confirmation → should fail
    const dc2 = await createAppointmentAtomic(BID, CUST, EMP, S30, sat, '10:00', 'IA', 'Second confirm');
    ok('Second confirm: rejected', dc2.success === false);
    console.log(`     Second confirm msg: ${dc2.message}`);

    // Verify exactly 1 appointment exists for this slot
    const { count: dcCount } = await supabaseAdmin.from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', BID).eq('employee_id', EMP)
      .eq('fecha', sat).eq('hora', '10:00').neq('estado', 'cancelled');
    ok('Double confirm: exactly 1 appointment in DB', dcCount === 1);

    // ========== 15. CONCURRENCY ==========
    console.log('\n--- Concurrency (simultaneous booking) ---');

    // Launch 3 concurrent attempts for same slot on Monday
    const results = await Promise.allSettled([
      createAppointmentAtomic(BID, CUST, EMP, S50, mon, '11:00', 'IA', 'Concurrent-1'),
      createAppointmentAtomic(BID, CUST, EMP, S50, mon, '11:00', 'IA', 'Concurrent-2'),
      createAppointmentAtomic(BID, CUST, EMP, S50, mon, '11:00', 'IA', 'Concurrent-3')
    ]);

    let succ = 0, rej = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.success) { succ++; if (r.value.cita?.id) created.push({ table: 'appointments', id: r.value.cita.id }); }
        else rej++;
      } else rej++;
    }
    ok('Concurrency: exactly 1 success', succ === 1);
    ok('Concurrency: 2 rejected', rej === 2);
    console.log(`     ${succ} success, ${rej} rejected`);

    const { count: concCount } = await supabaseAdmin.from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', BID).eq('employee_id', EMP)
      .eq('fecha', mon).eq('hora', '11:00').neq('estado', 'cancelled');
    ok('Concurrency: exactly 1 in DB', concCount === 1);

  } finally {
    await clean();
  }

  console.log(`\n========================================`);
  console.log(`TESTS: ${p+f} total | ✅ ${p} passed | ❌ ${f} failed`);
  console.log(`========================================\n`);
  process.exit(f > 0 ? 1 : 0);
}

main();
