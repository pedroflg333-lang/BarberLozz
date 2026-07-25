/**
 * Date Resolver Tests — validates resolveAppointmentDate with a fixed reference date.
 *
 * Reference date: Thursday, July 23, 2026 (Europe/Madrid)
 *
 * Run: npx tsx server/dateResolver.test.ts
 */
import { resolveAppointmentDate } from './dateResolver.js';

const TZ = 'Europe/Madrid';

// Thursday July 23, 2026 at 10:00 Madrid time
const REF = new Date('2026-07-23T10:00:00+02:00');

function test(label: string, input: string, expectedDate: string | null, expectedDay?: string, now?: Date) {
  const result = resolveAppointmentDate(input, TZ, now || REF);
  const ok = result
    ? result.dateStr === expectedDate && (!expectedDay || result.dayName === expectedDay)
    : expectedDate === null;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: "${input}" → ${result ? result.dateStr + ' (' + result.dayName + ')' : 'null'} ${ok ? '' : `(expected ${expectedDate}${expectedDay ? ', ' + expectedDay : ''})`}`);
  if (!ok) process.exitCode = 1;
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

let p = 0, f = 0;
function assert(label: string, cond: boolean) {
  (cond ? p++ : f++);
  console.log(`  ${cond ? '✅' : '❌'} ${label}`);
}

// ────────────────────────────────────────────────────────────────────
// Reference date verification
// ────────────────────────────────────────────────────────────────────
assert('Jul 23, 2026 is Thursday', new Date('2026-07-23T10:00:00+02:00').getDay() === 4);

// ────────────────────────────────────────────────────────────────────
// Today / tomorrow / yesterday
// ────────────────────────────────────────────────────────────────────
section('Absolute & near references');
test('hoy', 'hoy', '2026-07-23', 'jueves');
test('hoy (full)', 'hoy es jueves', '2026-07-23', 'jueves');
test('mañana', 'mañana', '2026-07-24', 'viernes');
test('mañana (accentless)', 'manana', '2026-07-24', 'viernes');
test('pasado mañana', 'pasado mañana', '2026-07-25', 'sábado');

// ────────────────────────────────────────────────────────────────────
// Explicit dates
// ────────────────────────────────────────────────────────────────────
section('Explicit dates');
test('24 de julio', '24 de julio', '2026-07-24', 'viernes');
test('24 de julio de 2026', '24 de julio de 2026', '2026-07-24', 'viernes');
test('31 de julio', '31 de julio', '2026-07-31', 'viernes');
test('31/07/2026', '31/07/2026', '2026-07-31', 'viernes');
test('31/07', '31/07', '2026-07-31', 'viernes');
test('ISO 2026-07-24', '2026-07-24', '2026-07-24', 'viernes');

section('Month boundary');
test('1 de agosto', '1 de agosto', '2026-08-01', 'sábado');
test('01/08', '01/08', '2026-08-01', 'sábado');
test('31 de diciembre', '31 de diciembre', '2026-12-31', 'jueves');
test('1 de enero de 2027', '1 de enero de 2027', '2027-01-01', 'viernes');

// ────────────────────────────────────────────────────────────────────
// Bare day names — next occurrence from Thursday
// ────────────────────────────────────────────────────────────────────
section('Bare day names (next occurrence from Thu Jul 23)');
test('lunes', 'lunes', '2026-07-27', 'lunes');       // +4 days
test('martes', 'martes', '2026-07-28', 'martes');     // +5
test('miércoles', 'miércoles', '2026-07-29', 'miércoles'); // +6
test('miercoles (no accent)', 'miercoles', '2026-07-29', 'miércoles');
test('jueves (next week, not today)', 'jueves', '2026-07-30', 'jueves'); // +7 (next week)
test('viernes', 'viernes', '2026-07-24', 'viernes');  // +1 (tomorrow)
test('sábado', 'sábado', '2026-07-25', 'sábado');     // +2
test('sabado (no accent)', 'sabado', '2026-07-25', 'sábado');
test('domingo', 'domingo', '2026-07-26', 'domingo');  // +3

// ────────────────────────────────────────────────────────────────────
// "el [day]" — same as bare day
// ────────────────────────────────────────────────────────────────────
section('"el [day]" — same as bare');
test('el lunes', 'el lunes', '2026-07-27', 'lunes');
test('el viernes', 'el viernes', '2026-07-24', 'viernes');

// ────────────────────────────────────────────────────────────────────
// "[day] que viene" — same as bare (after fix)
// ────────────────────────────────────────────────────────────────────
section('"[day] que viene" — immediate next occurrence');
test('lunes que viene', 'lunes que viene', '2026-07-27', 'lunes');
test('martes que viene', 'martes que viene', '2026-07-28', 'martes');
test('miércoles que viene', 'miércoles que viene', '2026-07-29', 'miércoles');
test('jueves que viene', 'jueves que viene', '2026-07-30', 'jueves');
test('viernes que viene', 'viernes que viene', '2026-07-24', 'viernes');
test('sábado que viene', 'sábado que viene', '2026-07-25', 'sábado');
test('domingo que viene', 'domingo que viene', '2026-07-26', 'domingo');

// ────────────────────────────────────────────────────────────────────
// "el próximo [day]" — same as bare (after fix)
// ────────────────────────────────────────────────────────────────────
section('"próximo [day]" — immediate next occurrence');
test('el próximo lunes', 'el próximo lunes', '2026-07-27', 'lunes');
test('el próximo martes', 'el próximo martes', '2026-07-28', 'martes');
test('próximo miércoles', 'próximo miércoles', '2026-07-29', 'miércoles');
test('próximo jueves', 'próximo jueves', '2026-07-30', 'jueves');
test('el próximo viernes', 'el próximo viernes', '2026-07-24', 'viernes');
test('próximo sábado', 'próximo sábado', '2026-07-25', 'sábado');

// ────────────────────────────────────────────────────────────────────
// "el [day] que viene" — same as bare
// ────────────────────────────────────────────────────────────────────
section('"el [day] que viene" — same as bare');
test('el lunes que viene', 'el lunes que viene', '2026-07-27', 'lunes');
test('el viernes que viene', 'el viernes que viene', '2026-07-24', 'viernes');

// ────────────────────────────────────────────────────────────────────
// "este [day]" — current week
// ────────────────────────────────────────────────────────────────────
section('"este [day]" — current week');
test('este lunes (past, should reject)', 'este lunes', null);  // Mon Jul 20 is past
test('este jueves (today)', 'este jueves', '2026-07-23', 'jueves');
test('este viernes (tomorrow)', 'este viernes', '2026-07-24', 'viernes');
test('este sábado', 'este sábado', '2026-07-25', 'sábado');
test('este domingo', 'este domingo', '2026-07-26', 'domingo');

// ────────────────────────────────────────────────────────────────────
// Mixed booking phrases (real user messages)
// ────────────────────────────────────────────────────────────────────
section('Mixed booking phrases');
test('quiero cita el lunes', 'quiero cita el lunes', '2026-07-27', 'lunes');
test('quiero cita el viernes', 'quiero cita el viernes', '2026-07-24', 'viernes');
test('el lunes que viene por la mañana', 'el lunes que viene por la mañana', '2026-07-27', 'lunes');

// ────────────────────────────────────────────────────────────────────
// Correction phrases (should still resolve date)
// ────────────────────────────────────────────────────────────────────
section('Correction phrases');
test('pero te dije lunes que viene', 'pero te dije lunes que viene', '2026-07-27', 'lunes');
test('no, el miércoles que viene', 'no, el miércoles que viene', '2026-07-29', 'miércoles');

// ────────────────────────────────────────────────────────────────────
// Edge cases
// ────────────────────────────────────────────────────────────────────
section('Edge cases');
test('empty string', '', null);
test('no date info', 'hola qué tal', null);
test('just greeting', 'buenos días', null);
test('only time', 'a las 11:00', null);
test('only service', 'un degradado', null);
test('question about price', 'cuánto cuesta el degradado', null);

// ────────────────────────────────────────────────────────────────────
// Year boundary — from December 30
// ────────────────────────────────────────────────────────────────────
section('Year boundary (ref = Wed Dec 30, 2026)');
const DEC30 = new Date('2026-12-30T10:00:00+01:00');
assert('Dec 30 is Wednesday', DEC30.getDay() === 3);
test('jueves', 'jueves', '2026-12-31', 'jueves', DEC30);
test('viernes', 'viernes', '2027-01-01', 'viernes', DEC30);
test('sábado', 'sábado', '2027-01-02', 'sábado', DEC30);
test('lunes que viene', 'lunes que viene', '2027-01-04', 'lunes', DEC30);
test('el próximo martes', 'el próximo martes', '2027-01-05', 'martes', DEC30);
test('año nuevo 1 de enero', '1 de enero', '2027-01-01', 'viernes', DEC30);

// ────────────────────────────────────────────────────────────────────
// Month boundary — from July 30
// ────────────────────────────────────────────────────────────────────
section('Month boundary (ref = Thu Jul 30, 2026)');
const JUL30 = new Date('2026-07-30T10:00:00+02:00');
assert('Jul 30 is Thursday', JUL30.getDay() === 4);
test('viernes que viene', 'viernes que viene', '2026-07-31', 'viernes', JUL30);
test('sábado', 'sábado', '2026-08-01', 'sábado', JUL30);
test('lunes que viene', 'lunes que viene', '2026-08-03', 'lunes', JUL30);
test('mañana', 'mañana', '2026-07-31', 'viernes', JUL30);
test('pasado mañana', 'pasado mañana', '2026-08-01', 'sábado', JUL30);
test('1 de agosto', '1 de agosto', '2026-08-01', 'sábado', JUL30);

// ────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────
console.log(`\n\n=== ${p} passed, ${f} failed ===`);
if (f > 0) process.exit(1);
