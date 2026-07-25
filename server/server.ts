import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { backendFunctions } from './tools.js';
import { OllamaService } from './ollamaService.js';
import { LaboratoryMessageProvider } from './messageProvider.js';
import { DEFAULT_BUSINESS_ID } from './config.js';
import { BookingState, getOrCreateSession } from './bookingState.js';
import { orchestrate, BookingAction } from './bookingOrchestrator.js';
import { supabaseAdmin, isSupabaseConfigured } from './supabase.js';
import publicBookingRouter from './routes/publicBooking.js';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Public booking routes (no auth required)
app.use('/api/public', publicBookingRouter);

// System prompt guiding the receptionist's personality
const SYSTEM_PROMPT = `Eres el recepcionista virtual de la peluquería BarberLozz.
Hablas como una persona real, de forma muy cercana, atenta, educada y sobre todo BREVE. Tus respuestas deben ser cortas y al grano, como un chat real de WhatsApp.

REGLAS DE ORO:
1. NUNCA hables de aspectos técnicos, configuraciones, APIs, servidores, bases de datos, simulaciones o de que estás en "fase de pruebas". Háblale al cliente como si fueras un recepcionista de carne y hueso en la barbería física.
2. Habla siempre en español con un tono cálido, amable y muy natural.
3. NUNCA inventes horarios de apertura, días de descanso, teléfonos ni ubicaciones de la peluquería. Si el cliente pregunta por estos temas, usa getBusinessHours para obtener los datos reales.
4. NUNCA inventes horarios de cita ni huecos libres bajo ninguna circunstancia. Usa SIEMPRE checkAvailability.
5. NUNCA confirmes una reserva a menos que el sistema te indique explícitamente que la cita se ha creado correctamente en la base de datos con un ID real. Si solo se te informa de disponibilidad, NO digas que la cita está reservada o confirmada. Pregunta primero si el cliente quiere confirmar.
6. Cuando tengas disponibilidad, pregunta siempre: "¿Quieres que te reserve la cita?" o similar. Espera a que el cliente confirme.
7. Cuando el cliente confirme y el sistema cree la cita con éxito (te devuelva cita.id), responde de forma natural y cercana. Usa lenguaje natural para la fecha (ej: "viernes 24 de julio" en lugar de "2026-07-24"). No uses formato técnico.
8. Ignora completamente fechas, horas o servicios de reservas anteriores en el historial. Céntrate ÚNICAMENTE en la petición actual del cliente.
9. Si el cliente pide "otra cita", "nueva cita" o similar, ignora toda la información de la reserva anterior y empieza de cero.
10. Cuando menciones la fecha de la cita al cliente, hazlo siempre en formato natural: "viernes 24 de julio", "mañana jueves", "el lunes 27", NUNCA "2026-07-24".
11. NUNCA asumas qué servicio quiere el cliente. Si dice "cortarme el pelo" o similar ambiguo, pregúntale cuál de los servicios disponibles prefiere o preséntale las opciones reales. Solo debes dar por identificado el servicio cuando el cliente lo nombre explícitamente.
12. NUNCA respondas precios, duración, horarios ni disponibilidad usando tu conocimiento o entrenamiento. Si el cliente pregunta precio o duración de un servicio, usa SIEMPRE getServiceInfo para obtener el dato real de la base de datos. Ejemplo: "cuánto tarda un corte degradado" → getServiceInfo("Corte Degradado") → respondes exactamente "30 minutos", no inventas rangos.
13. NUNCA digas que una cita está reservada o confirmada a menos que hayas llamado a suggestBooking y el sistema te haya devuelto success:true con cita.id. Si suggestBooking devuelve 'Cita propuesta, esperando confirmación', NO digas que está confirmada. Espera a que el cliente confirme explícitamente.`;

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
    console.log(`[FLOW] getOrCreateConversation(phone=${providerResult.phone}, name="${providerResult.name}", bid=${bid}, channel=${msgChannel})`);
    const conv = await backendFunctions.getOrCreateConversation(providerResult.phone, providerResult.name, bid, msgChannel);
    const conversationId = conv.id;
    console.log(`[FLOW] conv.id=${conversationId} conv.customer_id=${conv.customer_id}`);

    // 3. SAVE INCOMING MESSAGE TO SUPABASE (with conversation_id)
    await backendFunctions.addMessage(providerResult.phone, 'incoming', providerResult.message, bid, msgChannel, conversationId);

    // 4. FETCH STATEFUL THREAD HISTORY FROM SUPABASE
    const threadHistory = await backendFunctions.getConversationHistoryForOllama(providerResult.phone, bid);

    // 5. BOOKING ORCHESTRATOR — single entry point for all booking logic
    let session = await getOrCreateSession(bid, conversationId, providerResult.phone);
    const orchestratorResult = await orchestrate(
      providerResult.message,
      session,
      bid,
      conv.customer_id,
      conversationId,
      providerResult.phone
    );

    // Read fresh session after orchestrator may have updated it
    session = await getOrCreateSession(bid, conversationId, providerResult.phone);

    // 6. Generate natural response via Qwen for non-deterministic actions
    let responseToSend: string;
    if (orchestratorResult.needsQwen) {
      // Build context for Qwen based on action
      let actionContext = '';
      switch (orchestratorResult.action) {
        case BookingAction.CANCEL:
          actionContext = orchestratorResult.response
            ? `\n\n[ACCIÓN]: El cliente quiere cancelar una cita.\n[DATOS]: ${orchestratorResult.response}\n\nResponde de forma natural y ayuda al cliente a gestionar la cancelación.`
            : '\n\n[ACCIÓN]: El cliente quiere cancelar una cita pero no tiene citas pendientes. Infórmale amablemente.';
          break;
        case BookingAction.RESCHEDULE:
          actionContext = '\n\n[ACCIÓN]: El cliente quiere reprogramar una cita. Pregunta qué cita desea modificar y qué nuevo día/hora prefiere.';
          break;
        case BookingAction.GENERAL_CONVERSATION:
        case BookingAction.INFORMATION:
          if (session && session.state !== BookingState.CONFIRMED && session.state !== BookingState.CANCELLED && session.state !== BookingState.EXPIRED && session.service_name) {
            actionContext = `\n\n[CONTEXTO]: El cliente tiene una reserva en proceso:\n- Servicio: ${session.service_name}\n- Fecha: ${session.requested_date || 'No especificada'}\n- Hora: ${session.requested_time || 'No especificada'}\nNo menciones esto a menos que el cliente se refiera a ello.`;
          }
          if (orchestratorResult.response) {
            actionContext += `\n\n[INFORMACIÓN PARA EL CLIENTE]: ${orchestratorResult.response}\n\nTransmite esta información al cliente de forma natural y breve.`;
          }
          break;
        default:
          actionContext = orchestratorResult.response ? `\n\n[RESPUESTA]: ${orchestratorResult.response}` : '';
      }

      const qwenResp = await OllamaService.chat([
        { role: 'system', content: SYSTEM_PROMPT + actionContext },
        ...threadHistory
      ] as any[]);
      responseToSend = (qwenResp.choices[0].message.content || '').trim();

      // Fallback if Qwen returns empty
      if (!responseToSend) {
        responseToSend = orchestratorResult.response || '¿En qué puedo ayudarte?';
      }
    } else {
      responseToSend = orchestratorResult.response;
    }

    // 7. Determine created appointment from session state
    const createdAppointment = session?.state === BookingState.CONFIRMED ? { id: session.id, service_name: session.service_name, requested_date: session.requested_date, requested_time: session.requested_time } : null;

    console.log(`[BOOKING] action=${BookingAction[orchestratorResult.action]} response=${responseToSend.substring(0, 200)}`);
    await backendFunctions.addMessage(providerResult.phone, 'outgoing', responseToSend, bid, msgChannel, conversationId);

    const finalThreadMessages = await backendFunctions.getConversationHistoryForOllama(providerResult.phone, bid);

    res.json({
      messages: finalThreadMessages,
      executedTools: [],
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

app.put('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.status(400).json({ error: 'Invalid service id' });
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
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

app.post('/api/services', async (req, res) => {
  if (!isSupabaseConfigured) return res.status(400).json({ error: 'Supabase not configured' });
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.status(400).json({ error: 'Invalid service id' });
  try {
    const { error } = await supabaseAdmin
      .from('services')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor del Laboratorio IA (Dynamic Business Config RAG) corriendo en http://localhost:${PORT}`);
  });
}
