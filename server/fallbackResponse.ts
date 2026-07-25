import { BookingState, formatDateNatural } from './bookingState.js';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

function getDayLabel(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  return DAY_NAMES[d.getDay()];
}

/**
 * Build a deterministic fallback response when Qwen returns empty content.
 * Uses ONLY real data from tool execution history + session state.
 * Never invents prices, durations, availability, services, or employees.
 */
export function buildFallbackFromToolCalls(
  calls: { functionName: string; args: any; result: any }[],
  session: { state?: BookingState; service_name?: string; requested_date?: string; requested_time?: string; dayLabel?: string },
  _userMessage: string
): string {
  // 1. Appointment was confirmed in this request (crear_cita succeeded)
  const confirmedCall = calls.find(f => f.functionName === 'crear_cita' && f.result?.success && f.result?.cita?.id);
  if (confirmedCall) {
    return '¡Perfecto! Tu cita ha quedado confirmada. ¿Necesitas algo más?';
  }

  // 2. Appointment creation failed
  const failedCreation = calls.find(f => f.functionName === 'crear_cita' && !f.result?.success);
  if (failedCreation) {
    return `Lo siento, no pude crear la cita. ${failedCreation.result?.message || 'Inténtalo de nuevo.'}`;
  }

  // 3. suggestBooking called but session was already CONFIRMED
  const alreadyConfirmed = calls.find(f => f.functionName === 'suggestBooking' && f.result?.alreadyConfirmed);
  if (alreadyConfirmed) {
    return 'Tu cita ya está confirmada. ¿Necesitas algo más?';
  }

  // 4. suggestBooking failed (slot taken, service not found, etc.)
  const failedSuggest = calls.filter(f => f.functionName === 'suggestBooking' && f.result?.success === false).pop();
  if (failedSuggest) {
    const msg = failedSuggest.result?.message || 'ese horario ya no está disponible.';
    return `Lo siento, ${msg.toLowerCase()} ¿Quieres buscar otra opción?`;
  }

  // 5. suggestBooking proposed (WAITING_CONFIRMATION)
  const proposedCall = calls.find(f => f.functionName === 'suggestBooking' && f.result?.success);
  if (proposedCall) {
    const { date, time, serviceName } = proposedCall.args;
    return `Tengo disponible el ${date} a las ${time}${serviceName ? ` para ${serviceName}` : ''}. ¿Quieres que te reserve la cita?`;
  }

  // 6. checkAvailability found a specific time available
  const availTime = calls.find(f => f.functionName === 'checkAvailability' && f.result?.available === true);
  if (availTime) {
    return `Sí, hay disponibilidad el ${availTime.result.date} a las ${availTime.result.time}. ¿Quieres que te reserve la cita?`;
  }

  // 7. checkAvailability returned alternatives (not available at requested time)
  const withAlts = calls.find(f => f.functionName === 'checkAvailability' && f.result?.available === false && f.result?.alternatives?.length > 0);
  if (withAlts) {
    const times = withAlts.result.alternatives.map((a: any) => a.time).join(', ');
    return `A las ${withAlts.result.time} no tengo disponibilidad. Tengo libre a las ${times}. ¿Qué hora te viene mejor?`;
  }

  // 8. checkAvailability returned a list of slots (no specific time)
  const slotsList = calls.find(f => f.functionName === 'checkAvailability' && f.result?.availableSlots?.length > 0);
  if (slotsList) {
    const times = slotsList.result.availableSlots.join(', ');
    return `Sí, tengo disponibilidad el ${slotsList.result.date}. Las horas libres son: ${times}. ¿Cuál te viene mejor?`;
  }

  // 9. getServiceInfo returned service data
  const svcInfo = calls.find(f => f.functionName === 'getServiceInfo' && f.result?.found);
  if (svcInfo) {
    return `El ${svcInfo.result.nombre} cuesta ${svcInfo.result.precio} y dura ${svcInfo.result.duracion}.`;
  }

  // 10. getBusinessHours returned data
  const hoursInfo = calls.find(f => f.functionName === 'getBusinessHours');
  if (hoursInfo) {
    const r = hoursInfo.result;
    return `${r.name} abre ${r.openDays} de ${r.businessHours}. Dirección: ${r.address}. Teléfono: ${r.phone}.`;
  }

  // 11. Session-based fallback (no tools were called in this request)
  if (session?.state === BookingState.CONFIRMED) {
    return 'Tu cita ya está confirmada. ¿Necesitas algo más?';
  }
  if (session?.state === BookingState.WAITING_CONFIRMATION) {
    const parts: string[] = [];
    if (session.service_name) parts.push(`para ${session.service_name}`);
    if (session.requested_date && session.requested_time) {
      parts.push(`el ${formatDateNatural(session.requested_date, session.dayLabel || getDayLabel(session.requested_date))} a las ${session.requested_time}`);
    } else if (session.requested_date) {
      parts.push(`el ${formatDateNatural(session.requested_date, session.dayLabel || getDayLabel(session.requested_date))}`);
    }
    return `Perfecto${parts.length > 0 ? ', ' + parts.join(' ') : ''}. ¿Quieres que te confirme la cita?`;
  }
  if (session?.service_name && session?.requested_date && !session?.requested_time) {
    return `Perfecto, ¿sobre qué hora te gustaría venir el ${formatDateNatural(session.requested_date, session.dayLabel || getDayLabel(session.requested_date))} para ${session.service_name}?`;
  }
  if (session?.service_name && !session?.requested_date) {
    return `Perfecto, ¿qué día te gustaría venir para el ${session.service_name}?`;
  }

  // 12. Ultimate generic fallback — never return empty string
  return '¿En qué puedo ayudarte?';
}
