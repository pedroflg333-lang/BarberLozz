import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { backendFunctions } from './tools.js';
import { OllamaService } from './ollamaService.js';
import { LaboratoryMessageProvider } from './messageProvider.js';
import { DEFAULT_BUSINESS_ID } from './config.js';
import { resolveAppointmentDate, validateDayMatch } from './dateResolver.js';
import {
  BookingState, getOrCreateSession, updateSession, resetSession,
  setWaitingConfirmation, getSessionState,
  isConfirmation, isDecline, isNewBookingRequest,
  isCancellationRequest, isRescheduleRequest,
  formatDateNatural
} from './bookingState.js';
import {
  getAvailableSlots, isSlotAvailable, getNextAvailableSlots,
  checkBusinessHours, findServiceByName, getServiceDuration,
  getEmployeesForService, createAppointmentAtomic,
  checkAppointmentOverlap
} from './availabilityEngine.js';
import { supabaseAdmin, isSupabaseConfigured } from './supabase.js';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// System prompt guiding the receptionist's personality
const SYSTEM_PROMPT = `Eres el recepcionista virtual de la peluquería BarberLozz.
Hablas como una persona real, de forma muy cercana, atenta, educada y sobre todo BREVE. Tus respuestas deben ser cortas y al grano, como un chat real de WhatsApp.

REGLAS DE ORO:
1. NUNCA hables de aspectos técnicos, configuraciones, APIs, servidores, bases de datos, simulaciones o de que estás en "fase de pruebas". Háblale al cliente como si fueras un recepcionista de carne y hueso en la barbería física.
2. Habla siempre en español con un tono cálido, amable y muy natural.
3. NUNCA inventes horarios de apertura, días de descanso, teléfonos ni ubicaciones de la peluquería. Si el cliente pregunta por estos temas, el sistema te proveerá la información real de la base de datos para que respondas de forma estricta sobre ella.
4. NUNCA inventes horarios de cita ni huecos libres bajo ninguna circunstancia.
5. NUNCA confirmes una reserva a menos que el sistema te indique explícitamente que la cita se ha creado correctamente en la base de datos. Si solo se te informa de disponibilidad, NO digas que la cita está reservada. Pregunta primero si el cliente quiere confirmar.
6. Cuando tengas disponibilidad, pregunta siempre: "¿Quieres que te reserve la cita?" o similar. Espera a que el cliente confirme.
7. Cuando el cliente confirme y el sistema cree la cita con éxito, responde de forma natural y cercana. Usa lenguaje natural para la fecha (ej: "viernes 24 de julio" en lugar de "2026-07-24"). No uses formato técnico.
8. Ignora completamente fechas, horas o servicios de reservas anteriores en el historial. Céntrate ÚNICAMENTE en la petición actual del cliente.
9. Si el cliente pide "otra cita", "nueva cita" o similar, ignora toda la información de la reserva anterior y empieza de cero.
10. Cuando menciones la fecha de la cita al cliente, hazlo siempre en formato natural: "viernes 24 de julio", "mañana jueves", "el lunes 27", NUNCA "2026-07-24"."`;

// Endpoint: Healthcheck for local Ollama availability
app.get('/api/health', async (req, res) => {
  const check = await OllamaService.isAvailable();
  res.json({ 
    status: (check.connected && check.modelExists) ? 'healthy' : 'unhealthy',
    ollamaConnected: check.connected,
    modelExists: check.modelExists,
    model: process.env.OLLAMA_MODEL || 'qwen3:8b',
    url: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
  });
});

// Endpoint: Test connection to local Ollama (Sends test message and measures latency)
app.post('/api/test-connection', async (req, res) => {
  const startTime = Date.now();
  const model = process.env.OLLAMA_MODEL || 'qwen3:8b';
  try {
    const check = await OllamaService.isAvailable();
    if (!check.connected) {
      return res.status(503).json({ success: false, error: 'No se pudo conectar con el servidor local de Ollama.' });
    }
    
    const response = await OllamaService.chat([
      { role: 'user', content: 'Responde únicamente con OK' }
    ]);
    const latencyMs = Date.now() - startTime;
    
    res.json({
      success: true,
      latencyMs,
      model,
      response: response.choices[0].message.content.trim()
    });
  } catch (error: any) {
    console.error('Error in /api/test-connection:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al comunicarse con Ollama.' });
  }
});

// Endpoint: Update Business Settings from Frontend Settings page
app.post('/api/settings', (req, res) => {
  try {
    const updatedSettings = req.body;
    const result = backendFunctions.updateBusinessSettings(updatedSettings);
    res.json({ success: true, settings: result.configuracion });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar ajustes.' });
  }
});

// Helper to extract hour strings like "10:00", "09:30" or simple numbers "las 10" from text
const extractTime = (text: string): string => {
  const match = text.match(/\b(\d{2}:\d{2})\b/);
  if (match) return match[1];
  
  const matchNum = text.match(/las\s*(\d{1,2})/i) || text.match(/a las\s*(\d{1,2})/i);
  if (matchNum) {
    const h = parseInt(matchNum[1]);
    if (h >= 9 && h <= 20) {
      return `${String(h).padStart(2, '0')}:00`;
    }
  }
  return '';
};

// Helper to extract service name from user message (improved)
const extractService = (text: string, services?: any[]): string => {
  const msg = text.toLowerCase();
  
  if (services && services.length > 0) {
    for (const s of services) {
      if (msg.includes(s.nombre.toLowerCase())) {
        return s.nombre;
      }
    }
  }
  
  if (msg.includes('cortar') || msg.includes('corte') || msg.includes('pelo') || msg.includes('fade') || msg.includes('degradado')) {
    return 'Corte Degradado (Fade)';
  }
  if (msg.includes('barba')) {
    return 'Arreglo de Barba Premium';
  }
  if (msg.includes('completo') || msg.includes('completo')) {
    return 'Servicio Completo (Corte + Barba + Lavado)';
  }
  if (msg.includes('clásico') || msg.includes('clasico') || msg.includes('tijera')) {
    return 'Corte Clásico Tijera';
  }
  return 'Corte Degradado (Fade)';
};

// Helper to resolve date across user messages only (fallback chain)
const resolveDateFromUserMessages = (messages: any[]): { dateStr: string; dayLabel: string } | null => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'user') continue;
    const text = messages[i].content || '';
    const resolved = resolveAppointmentDate(text);
    if (resolved) return { dateStr: resolved.dateStr, dayLabel: resolved.dayName };
  }
  return null;
};

// Helper to detect intent to check available hours
const detectSearchHuecosIntent = (userMessage: string, threadHistory?: any[]): { matches: boolean; fecha: string; label: string } => {
  const msg = userMessage.toLowerCase();
  
  const keywords = ['hueco', 'libre', 'hora', 'cita', 'agenda', 'disponible', 'disponibilidad', 'turnos', 'calendario'];
  const matchesKeyword = keywords.some(k => msg.includes(k));
  
  if (!matchesKeyword) {
    return { matches: false, fecha: '', label: '' };
  }

  const resolved = resolveAppointmentDate(userMessage);
  if (resolved) {
    return { matches: true, fecha: resolved.dateStr, label: resolved.dayName };
  }

  // Fallback: look for date in user messages from thread history
  const fromHistory = resolveDateFromUserMessages(threadHistory || []);
  if (fromHistory) {
    return { matches: true, fecha: fromHistory.dateStr, label: fromHistory.dayLabel };
  }

  const todayDate = new Date();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(todayDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  return { matches: true, fecha: tomorrowStr, label: 'mañana (por defecto)' };
};

// Extract booking components (date, time, service) from a message
const extractBookingComponents = (userMessage: string, threadHistory?: any[]): {
  date: string | null;
  dayLabel: string | null;
  time: string | null;
  service: string | null;
} => {
  const msg = userMessage.toLowerCase();
  
  // Date: resolve from current message first
  const dateResolved = resolveAppointmentDate(userMessage);
  let date = dateResolved?.dateStr || null;
  let dayLabel = dateResolved?.dayName || null;

  // Time
  const time = extractTime(msg) || null;

  // Service
  const service = extractService(msg) || null;

  return { date, dayLabel, time, service };
};

// Helper to detect intent to check business hours or settings
const detectBusinessSettingsIntent = (userMessage: string): boolean => {
  const msg = userMessage.toLowerCase();
  const keywords = [
    'horario', 'abre', 'abierto', 'cerrar', 'cerrado', 'domingo', 'sábado', 'sabado', 'lunes',
    'dirección', 'direccion', 'dónde está', 'donde esta', 'dónde queda', 'ubicación', 'ubicacion',
    'teléfono', 'telefono', 'contacto', 'llamar', 'abris', 'abrís', 'cerrais', 'cerráis',
    'duración', 'duracion', 'cuánto tarda', 'cuanto tarda'
  ];
  return keywords.some(k => msg.includes(k));
};

// Endpoint: Chat completion representing incoming WhatsApp Message Provider Payload
// ---- WRITE API (bypasses RLS) ----
app.post('/api/conversations/:convId/messages', async (req, res) => {
  const { convId } = req.params;
  const { direction, content } = req.body;
  if (!isSupabaseConfigured) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert({ conversation_id: convId, direction, content, type: 'text', status: direction === 'incoming' ? 'received' : 'sent' })
      .select()
      .single();
    if (error) throw error;
    // Update conversation header
    await supabaseAdmin
      .from('conversations')
      .update({ last_message: content, updated_at: new Date().toISOString() })
      .eq('id', convId);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/conversations/:convId', async (req, res) => {
  const { convId } = req.params;
  if (!isSupabaseConfigured) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', convId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/business/:id/appointments', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert({ ...req.body, business_id: id })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
// ---- END WRITE API ----

app.post('/api/chat', async (req, res) => {
  try {
    const { phone, name, message, timestamp, source, business_id, channel } = req.body;
    const bid = business_id || DEFAULT_BUSINESS_ID;
    const msgChannel = channel || 'LABORATORIO';
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'Falta parámetro obligatorio: phone o message.' });
    }
    
    console.log(`[chat] phone=${phone} name=${name} business_id=${bid} channel=${msgChannel}`);

    // 1. Process payload through Message Provider
    const providerResult = await LaboratoryMessageProvider.processIncomingMessage({
      phone,
      name: name || 'Cliente de WhatsApp',
      message,
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'laboratory'
    });

    // Check if Ollama is running
    const connected = await OllamaService.isAvailable();
    if (!connected) {
      return res.status(503).json({ 
        error: 'El servicio local de Ollama no está disponible. Asegúrate de tener Ollama abierto en tu ordenador.' 
      });
    }

    // 2. GET OR CREATE CONVERSATION + CONVERSATION ID (before any message save)
    const conv = await backendFunctions.getOrCreateConversation(providerResult.phone, providerResult.name, bid, msgChannel);
    const conversationId = conv.id;

    // 3. SAVE INCOMING MESSAGE TO SUPABASE (with conversation_id)
    await backendFunctions.addMessage(providerResult.phone, 'incoming', providerResult.message, bid, msgChannel, conversationId);

    // 4. FETCH STATEFUL THREAD HISTORY FROM SUPABASE
    const threadHistory = await backendFunctions.getConversationHistoryForOllama(providerResult.phone, bid);

    let functionCallsExecuted: { functionName: string; args: any; result: any }[] = [];
    let customSystemPromptAddition = '';
    let deterministicResponse: string | null = null;

    // 5. BOOKING STATE MACHINE (persistent via Supabase booking_sessions)
    let session = await getOrCreateSession(bid, conversationId, providerResult.phone);
    let pending = session;

    // 5z. Cancellation request
    if (isCancellationRequest(providerResult.message)) {
      const { data: futureAppointments } = await supabaseAdmin
        .from('appointments')
        .select('*, service:services(*)')
        .eq('business_id', bid)
        .eq('customer_id', conv.customer_id)
        .in('estado', ['pending'])
        .gte('fecha', new Date().toISOString().split('T')[0])
        .order('fecha', { ascending: true });

      if (futureAppointments && futureAppointments.length > 0) {
        const citasStr = futureAppointments.map((a: any, i: number) =>
          `${i + 1}. ${a.fecha} a las ${a.hora} - ${a.service?.nombre || 'servicio'}`
        ).join('\n');

        customSystemPromptAddition = `\n\n[CANCELACIÓN SOLICITADA]: El cliente quiere cancelar una cita. Sus citas futuras son:\n${citasStr}\nPregunta cuál desea cancelar.`;
      } else {
        customSystemPromptAddition = `\n\n[CANCELACIÓN]: El cliente quiere cancelar pero no tiene citas futuras. Infórmale amablemente.`;
      }
    } else if (isRescheduleRequest(providerResult.message)) {
      customSystemPromptAddition = `\n\n[REPROGRAMACIÓN SOLICITADA]: El cliente quiere cambiar una cita existente. Pregunta qué cita desea modificar y qué nuevo día/hora prefiere.`;

    // 5a. Check if user wants a new/another booking → reset state
    } else if (pending && isNewBookingRequest(providerResult.message)) {
      await resetSession(bid, conversationId);
      pending = await getOrCreateSession(bid, conversationId, providerResult.phone);

    // 5b. Handle confirmation of a pending WAITING_CONFIRMATION booking
    } else if (pending?.state === BookingState.WAITING_CONFIRMATION && isConfirmation(providerResult.message)) {
      // Re-validate availability before creating
      if (pending.start_time && pending.end_time && pending.employee_id && pending.service_id) {
        const recheck = await isSlotAvailable(
          bid, pending.requested_date!, pending.start_time, pending.end_time,
          pending.employee_id, pending.service_id
        );

        if (!recheck.available) {
          await resetSession(bid, conversationId);
          // Find alternatives
          const nearby = await getNextAvailableSlots(
            bid, pending.requested_date!, pending.service_id, pending.requested_time!,
            { employee_id: pending.employee_id, count: 5 }
          );
          if (nearby.slots.length > 0) {
            const altStr = nearby.slots.map(s => s.start).join(', ');
            deterministicResponse = `Lo siento, justo ese horario acaba de ocuparse. Tengo libre a las ${altStr}. ¿Qué hora te viene mejor?`;
          } else {
            deterministicResponse = `Lo siento, ese horario acaba de ocuparse y no tengo más disponibilidad. ¿Quieres que busque otro día?`;
          }
        } else {
          const toolResult = await createAppointmentAtomic(
            bid, pending.customer_id!, pending.employee_id, pending.service_id,
            pending.requested_date!, pending.requested_time!,
            msgChannel === 'WHATSAPP' ? 'WHATSAPP' : 'IA',
            'Creado por Asistente IA.'
          );

          functionCallsExecuted.push({
            functionName: 'crear_cita',
            args: {
              nombre: providerResult.name,
              telefono: providerResult.phone,
              servicio: pending.service_name,
              fecha: pending.requested_date,
              hora: pending.requested_time,
              business_id: bid
            },
            result: toolResult
          });

          if (toolResult.success) {
            await updateSession(bid, conversationId, { state: BookingState.CONFIRMED });
            const cita = toolResult.cita;
            const aptId = cita?.id ? `#AP-${cita.id.toString().substring(0, 6).toUpperCase()}` : '#AP-000000';
            const serviceName = cita?.service?.nombre || pending.service_name;
            const employeeName = cita?.employee_name || pending.employee_name || 'BarberLozz';
            const fechaNatural = formatDateNatural(pending.requested_date!, pending.dayLabel);

            deterministicResponse = `¡Perfecto! Te he reservado la cita para el ${fechaNatural} a las ${pending.requested_time} en BarberLozz con ${employeeName} para ${serviceName}. Tu referencia es ${aptId}. ¡Te esperamos!`;
          } else {
            await resetSession(bid, conversationId);
            customSystemPromptAddition = `\n\n[ERROR AL CREAR CITA]: No se pudo crear la cita. Motivo: "${toolResult.message}". Informa al cliente amablemente y ofrécele ayuda.`;
          }
        }
      } else {
        await resetSession(bid, conversationId);
        customSystemPromptAddition = `\n\n[ERROR]: Datos de reserva incompletos. Pregunta al cliente qué día y hora prefiere.`;
      }

    // 5c. Handle decline of a pending WAITING_CONFIRMATION
    } else if (pending?.state === BookingState.WAITING_CONFIRMATION && isDecline(providerResult.message)) {
      await resetSession(bid, conversationId);
      customSystemPromptAddition = `\n\n[PROPUESTA RECHAZADA]: El cliente ha rechazado la propuesta de cita. Responde amablemente y pregúntale si quiere buscar otra opción.`;

    // 5d. Extract booking components from current message and route
    } else {
      const components = extractBookingComponents(providerResult.message, threadHistory);

      const effectiveDate = components.date || pending?.requested_date || null;
      const effectiveDayLabel = components.dayLabel || pending?.dayLabel || null;
      const effectiveTime = components.time || pending?.requested_time || null;
      const effectiveService = components.service || pending?.service_name || null;

      const hasTime = effectiveTime !== null;
      const hasDate = effectiveDate !== null;
      const hasService = effectiveService !== null;
      const hasBookingIntent = hasTime || hasDate || hasService ||
        /\b(cita|reserva|turno|agendar|reservar)\b/i.test(providerResult.message);

      if (hasBookingIntent) {
        if (hasDate && hasTime) {
          console.log(`[Booking] Checking availability for ${conversationId}: ${effectiveDate} at ${effectiveTime}`);

          // Find service
          let serviceId: string | null = null;
          let serviceDuration = 30;
          if (effectiveService) {
            const svc = await findServiceByName(bid, effectiveService);
            if (svc) {
              serviceId = svc.id;
              serviceDuration = svc.duracion;
            }
          }
          if (!serviceId) {
            // Get first available service
            const { data: services } = await supabaseAdmin
              .from('services')
              .select('id, duracion')
              .eq('business_id', bid)
              .eq('is_active', true)
              .limit(1);
            if (services && services.length > 0) {
              serviceId = services[0].id;
              serviceDuration = services[0].duracion;
            }
          }

          if (serviceId) {
            // Use Availability Engine
            const availResult = await getAvailableSlots(bid, effectiveDate, serviceId, {
              preferred_time: effectiveTime
            });

            console.log(`[AVAILABILITY] requested_time: ${effectiveTime}`);
            console.log(`[AVAILABILITY] requested_date: ${effectiveDate}`);
            console.log(`[AVAILABILITY] service: ${effectiveService || availResult.service_name}`);

            const slotAvailable = availResult.slots.some(
              s => s.start === effectiveTime
            );

            if (slotAvailable) {
              const slot = availResult.slots.find(s => s.start === effectiveTime)!;
              const endTime = slot.end;

              // Store in persistent session
              await setWaitingConfirmation(bid, conversationId, {
                service_id: serviceId,
                employee_id: slot.employee_id!,
                requested_date: effectiveDate,
                requested_time: effectiveTime,
                start_time: effectiveTime,
                end_time: endTime,
                customer_id: conv.customer_id || '',
                phone: providerResult.phone
              });
              // Also store service name + employee name + dayLabel
              await updateSession(bid, conversationId, {
                service_name: effectiveService || availResult.service_name,
                employee_name: slot.employee_name,
                dayLabel: effectiveDayLabel
              });

              const fechaNatural = formatDateNatural(effectiveDate, effectiveDayLabel);
              const empName = slot.employee_name ? ` con ${slot.employee_name}` : '';
              deterministicResponse = `Perfecto, tengo disponible el ${fechaNatural} a las ${effectiveTime}${empName} para ${effectiveService || availResult.service_name}. ¿Quieres que te reserve la cita?`;
            } else {
              // Not available → offer up to 3 real alternatives from Availability Engine
              const nearby = await getNextAvailableSlots(bid, effectiveDate, serviceId, effectiveTime, { count: 3 });
              console.log(`[AVAILABILITY] alternatives: ${JSON.stringify(nearby.slots.map(s => s.start))}`);
              const fechaNatural = formatDateNatural(effectiveDate, effectiveDayLabel);

              if (nearby.slots.length > 0) {
                const uniqueTimes = [...new Set(nearby.slots.map(s => s.start))];
                const altStr = uniqueTimes.join(', ');

                // Store context in session so the next turn preserves date/service
                await updateSession(bid, conversationId, {
                  state: BookingState.IDLE,
                  service_id: serviceId,
                  service_name: effectiveService || availResult.service_name,
                  requested_date: effectiveDate,
                  dayLabel: effectiveDayLabel
                });

                deterministicResponse = `Lo siento, a las ${effectiveTime} del ${fechaNatural} no tenemos disponibilidad. Tengo libre a las ${altStr}. ¿Qué hora te viene mejor?`;
              } else {
                // Check if business is open that day
                const bizHours = await checkBusinessHours(bid, effectiveDate);
                if (!bizHours.open) {
                  deterministicResponse = `Lo siento, ${bizHours.message} ¿Quieres que busque otro día?`;
                } else {
                  deterministicResponse = `Lo siento, no tengo más disponibilidad para el ${fechaNatural}. ¿Quieres que busque otro día?`;
                }
              }
            }
          } else {
            customSystemPromptAddition = `\n\n[ERROR]: No se encontraron servicios activos. Informa al cliente.`;
          }
        } else {
          // Partial info → ask for what's missing
          if (!hasDate) {
            customSystemPromptAddition = `\n\n[SOLICITAR FECHA]: El cliente quiere agendar una cita pero no ha especificado el día. Pregunta de forma amable qué día le gustaría venir.`;
          } else if (!hasTime) {
            customSystemPromptAddition = `\n\n[SOLICITAR HORA]: El cliente quiere cita pero no ha especificado la hora. Pregunta de forma amable a qué hora le gustaría.`;
          }
          // Store partial info
          if (effectiveDate || effectiveTime || effectiveService) {
            await updateSession(bid, conversationId, {
              state: BookingState.IDLE,
              requested_date: effectiveDate,
              requested_time: effectiveTime,
              service_name: effectiveService,
              dayLabel: effectiveDayLabel
            });
          }
        }
      } else {
        // 5e. OTHER INTENTS
        const searchIntent = detectSearchHuecosIntent(providerResult.message, threadHistory);
        
        if (searchIntent.matches) {
          console.log(`[Booking] Search huecos para ${conversationId}: ${searchIntent.fecha}`);

          // Use availability engine for slot search
          const { data: services } = await supabaseAdmin
            .from('services')
            .select('id, nombre, duracion')
            .eq('business_id', bid)
            .eq('is_active', true);

          let huecosListStr = 'NINGUNO (la agenda está completa para este día)';
          if (services && services.length > 0) {
            const allSlots = await getAvailableSlots(bid, searchIntent.fecha, services[0].id);
            if (allSlots.slots.length > 0) {
              const uniqueTimes = [...new Set(allSlots.slots.map(s => s.start))];
              huecosListStr = uniqueTimes.join(', ');
            }
          }

          functionCallsExecuted.push({
            functionName: 'buscarHuecos',
            args: { fecha: searchIntent.fecha },
            result: { success: true, huecos: huecosListStr.split(', ').filter(Boolean) }
          });

          if (huecosListStr !== 'NINGUNO (la agenda está completa para este día)') {
            deterministicResponse = `Para el ${searchIntent.fecha} tengo disponibles los siguientes horarios: ${huecosListStr}. ¿Qué hora te viene mejor?`;
          } else {
            deterministicResponse = `Lo siento, para el ${searchIntent.fecha} no me quedan citas disponibles. ¿Quieres que busque otro día?`;
          }
        
        } else if (detectBusinessSettingsIntent(providerResult.message)) {
          console.log(`[Booking] Consultar horarios/configuración del negocio`);
          
          const settings = await backendFunctions.getBusinessSettings({ business_id: bid });
          
          functionCallsExecuted.push({
            functionName: 'getBusinessSettings',
            args: {},
            result: settings
          });

          const daysMap: { [key: number]: string } = {
            1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo'
          };
          const openDaysNames = settings.open_days.map(d => daysMap[d]).join(', ');

          customSystemPromptAddition = `\n\n[INFORMACIÓN DE LA BASE DE DATOS - CONFIGURACIÓN DEL NEGOCIO]:\n- Nombre comercial: ${settings.name}\n- Horario de apertura: ${settings.business_hours.start}\n- Horario de cierre: ${settings.business_hours.end}\n- Días laborales de atención: ${openDaysNames}\n- Duración promedio de servicio: ${settings.default_service_duration} minutos\n- Teléfono de contacto / WhatsApp: ${settings.phone_whatsapp}\n- Dirección: ${settings.direccion}\nUtiliza ESTRICTAMENTE esta información para responder de forma sumamente amable y muy breve. NUNCA asumas ni inventes otros horarios o ubicaciones.`;
        }
      }
    }

    // 5e. If a deterministic booking response is set, bypass Ollama entirely
    if (deterministicResponse) {
      console.log(`[BOOKING] response_source: BACKEND`);
      console.log(`[BOOKING] Response: ${deterministicResponse}`);
      await backendFunctions.addMessage(providerResult.phone, 'outgoing', deterministicResponse, bid, msgChannel);
    } else {
      console.log(`[BOOKING] response_source: OLLAMA`);
      const activeSystemPrompt = SYSTEM_PROMPT + customSystemPromptAddition;

      const fullMessages = [
        { role: 'system', content: activeSystemPrompt },
        ...threadHistory
      ];

      console.log(`[Ollama Chat] Consultando a Ollama para +${providerResult.phone}...`);

      const response = await OllamaService.chat(fullMessages as any[]);
      const responseMessage = response.choices[0].message;
      // 5. SAVE OUTGOING RESPONSE TO SUPABASE
      await backendFunctions.addMessage(providerResult.phone, 'outgoing', responseMessage.content, bid, msgChannel);
    }

    const finalThreadMessages = await backendFunctions.getConversationHistoryForOllama(providerResult.phone, bid);
    const createdAppointment = functionCallsExecuted
      .find(t => (t.functionName === 'crear_cita' || t.functionName === 'createAppointment') && t.result?.success)
      ?.result?.cita || null;

    res.json({
      messages: finalThreadMessages,
      executedTools: functionCallsExecuted,
      createdAppointment,
      conversation_id: conversationId
    });

  } catch (error: any) {
    console.error('Error en /api/chat con Ollama (WhatsApp Simulation):', error);
    res.status(500).json({ error: error.message || 'Error interno al comunicarse con Ollama.' });
  }
});

// ---- DATA API PROXY (bypasses RLS using service_role key) ----
// These endpoints are used by the frontend stores to read data from Supabase
// when the backend is running, avoiding RLS issues with anon key.

app.get('/api/business/:id/appointments', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.json([]);
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*, customer:customers(*), service:services(*)')
      .eq('business_id', id)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/business/:id/conversations', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.json([]);
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*, customer:customers(*)')
      .eq('business_id', id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/conversations/:convId/messages', async (req, res) => {
  const { convId } = req.params;
  if (!isSupabaseConfigured) return res.json([]);
  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/business/:id/customers', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.json([]);
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('business_id', id)
      .order('fecha_registro', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/business/:id/services', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.json([]);
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('business_id', id)
      .eq('is_active', true);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/business/:id/employees', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.json([]);
  try {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('business_id', id);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/business/:id/settings', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.json(null);
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('business_id', id)
      .maybeSingle();
    if (error) throw error;
    res.json(data || null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---- END DATA API PROXY ----

app.listen(PORT, () => {
  console.log(`🚀 Servidor del Laboratorio IA (Dynamic Business Config RAG) corriendo en http://localhost:${PORT}`);
});
