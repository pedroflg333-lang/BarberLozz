import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { backendFunctions } from './tools.js';
import { OllamaService } from './ollamaService.js';
import { LaboratoryMessageProvider } from './messageProvider.js';

dotenv.config();

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
4. NUNCA inventes horarios de cita ni huecos libres bajo ninguna circunstancia. Confirma una reserva de cita ÚNICAMENTE cuando el sistema te inyecte el mensaje de que la cita ha sido GUARDADA con éxito en la base de datos (success=true).
5. Cuando confirmes una cita, hazlo de forma natural, cercana y usando emojis. Sigue exactamente esta estructura o una muy similar:
   "¡Perfecto! 😊
   Te esperamos [DÍA/MAÑANA] a las [HORA].
   Si finalmente no puedes venir, avísanos por aquí.
   ¡Gracias!"`;

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

// Helper function to resolve target date based on messages context
const resolveConversationDate = (messages: any[]): string => {
  const todayDate = new Date();
  
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = (messages[i].content || '').toLowerCase();
    if (text.includes('mañana')) {
      const tomorrow = new Date();
      tomorrow.setDate(todayDate.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    if (text.includes('hoy')) {
      return todayDate.toISOString().split('T')[0];
    }
  }
  
  const tomorrow = new Date();
  tomorrow.setDate(todayDate.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

// Helper to detect intent to check available hours
const detectSearchHuecosIntent = (userMessage: string): { matches: boolean; fecha: string; label: string } => {
  const msg = userMessage.toLowerCase();
  
  const keywords = ['hueco', 'libre', 'hora', 'cita', 'agenda', 'disponible', 'disponibilidad', 'turnos', 'calendario'];
  const matchesKeyword = keywords.some(k => msg.includes(k));
  
  if (!matchesKeyword) {
    return { matches: false, fecha: '', label: '' };
  }

  const todayDate = new Date();
  
  if (msg.includes('hoy')) {
    const todayStr = todayDate.toISOString().split('T')[0];
    return { matches: true, fecha: todayStr, label: 'hoy' };
  }
  
  if (msg.includes('mañana')) {
    const tomorrowDate = new Date();
    tomorrowDate.setDate(todayDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
    return { matches: true, fecha: tomorrowStr, label: 'mañana' };
  }

  const tomorrowDate = new Date();
  tomorrowDate.setDate(todayDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  return { matches: true, fecha: tomorrowStr, label: 'mañana (por defecto)' };
};

// Helper to detect intent to confirm/book an appointment
const detectCreateAppointmentIntent = (userMessage: string): { matches: boolean; hora: string; servicio: string } => {
  const msg = userMessage.toLowerCase();
  
  const bookKeywords = ['apúntame', 'resérvame', 'confirmo', 'me viene bien', 'me quedo con', 'quiero a las', 'reserva', 'agendar', 'apunta', 'marcar', 'resérvame', 'poner a las', 'está bien a las'];
  const matchesKeyword = bookKeywords.some(k => msg.includes(k)) || msg.includes('a las');
  
  if (!matchesKeyword) {
    return { matches: false, hora: '', servicio: '' };
  }

  const extractedHour = extractTime(msg);
  if (!extractedHour) {
    return { matches: false, hora: '', servicio: '' };
  }

  let extractedService = 'Corte Degradado';
  if (msg.includes('barba')) {
    extractedService = 'Arreglo de Barba Premium';
  } else if (msg.includes('completo')) {
    extractedService = 'Servicio Completo';
  } else if (msg.includes('clásico') || msg.includes('clasico')) {
    extractedService = 'Corte Clásico Tijera';
  }

  return { matches: true, hora: extractedHour, servicio: extractedService };
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
app.post('/api/chat', async (req, res) => {
  try {
    const { phone, name, message, timestamp, source } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'Falta parámetro obligatorio: phone o message.' });
    }

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

    // 2. SAVE INCOMING MESSAGE
    backendFunctions.addMessage(providerResult.phone, 'incoming', providerResult.message);

    // 3. FETCH STATEFUL THREAD HISTORY
    const threadHistory = backendFunctions.getConversationHistoryForOllama(providerResult.phone);
    
    let functionCallsExecuted: { functionName: string; args: any; result: any }[] = [];
    let customSystemPromptAddition = '';

    // 4. ROUTE INTENTS
    const bookingIntent = detectCreateAppointmentIntent(providerResult.message);
    
    if (bookingIntent.matches) {
      const resolvedDate = resolveConversationDate(threadHistory);
      console.log(`[WhatsApp Tool] Crear cita para +${providerResult.phone}: ${resolvedDate} a las ${bookingIntent.hora}`);
      
      const toolResult = backendFunctions.createAppointment({
        nombre: providerResult.name,
        telefono: providerResult.phone,
        fecha: resolvedDate,
        hora: bookingIntent.hora,
        servicio: bookingIntent.servicio
      });

      functionCallsExecuted.push({
        functionName: 'createAppointment',
        args: {
          nombre: providerResult.name,
          telefono: providerResult.phone,
          fecha: resolvedDate,
          hora: bookingIntent.hora,
          servicio: bookingIntent.servicio
        },
        result: toolResult
      });

      if (toolResult.success) {
        customSystemPromptAddition = `\n\n[INFORMACIÓN DE LA BASE DE DATOS]: El sistema ha creado con ÉXITO la cita en la base de datos (success=true) para ${providerResult.name} (${providerResult.phone}) el día ${resolvedDate} a las ${bookingIntent.hora} para el servicio: ${bookingIntent.servicio}. Redacta una respuesta muy alegre y atenta diciendo textualmente que la cita ha quedado confirmada.`;
      } else {
        customSystemPromptAddition = `\n\n[INFORMACIÓN DE LA BASE DE DATOS]: El sistema ha RECHAZADO la cita en la base de datos (success=false) porque la hora ${bookingIntent.hora} el día ${resolvedDate} ya está ocupada por otra reserva. Responde de manera sumamente educada diciendo exactamente: "Lo siento, esa hora acaba de ocuparse. ¿Quieres otra opción?" y ofrécele consultar otros huecos disponibles.`;
      }

    } else {
      const searchIntent = detectSearchHuecosIntent(providerResult.message);
      
      if (searchIntent.matches) {
        console.log(`[WhatsApp Tool] Consultar citas para +${providerResult.phone}: ${searchIntent.fecha}`);
        
        const toolResult = backendFunctions.buscarHuecos({ fecha: searchIntent.fecha });
        
        functionCallsExecuted.push({
          functionName: 'buscarHuecos',
          args: { fecha: searchIntent.fecha },
          result: toolResult
        });

        const huecosListStr = toolResult.huecos.length > 0 
          ? toolResult.huecos.join(', ') 
          : 'NINGUNO (la agenda está completa para este día)';

        customSystemPromptAddition = `\n\n[INFORMACIÓN DE LA BASE DE DATOS]: El cliente está solicitando cita para el día ${searchIntent.fecha}. Los ÚNICOS huecos reales disponibles devueltos por el sistema son: [ ${huecosListStr} ]. Ofrece estas opciones de forma amable y servicial. NUNCA inventes otras horas que no figuren en esta lista de corchetes. Si la lista dice NINGUNO, explícale con tacto que para ese día no quedan citas disponibles y ofrécele consultar otro día.`;
      
      } else if (detectBusinessSettingsIntent(providerResult.message)) {
        // DETECT INTENT: Check business hours or opening days
        console.log(`[WhatsApp Tool] Consultar horarios/configuración del negocio`);
        
        const settings = backendFunctions.getBusinessSettings();
        
        functionCallsExecuted.push({
          functionName: 'getBusinessSettings',
          args: {},
          result: settings
        });

        const daysMap: { [key: number]: string } = {
          1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo'
        };
        const openDaysNames = settings.open_days.map(d => daysMap[d]).join(', ');

        customSystemPromptAddition = `\n\n[INFORMACIÓN DE LA BASE DE DATOS - CONFIGURACIÓN DEL NEGOCIO]:
        - Nombre comercial: ${settings.name}
        - Horario de apertura: ${settings.business_hours.start}
        - Horario de cierre: ${settings.business_hours.end}
        - Días laborales de atención: ${openDaysNames}
        - Duración promedio de servicio: ${settings.default_service_duration} minutos
        - Teléfono de contacto / WhatsApp: ${settings.phone_whatsapp}
        - Dirección: ${settings.direccion}
        Utiliza ESTRICTAMENTE esta información para responder de forma sumamente amable y muy breve a la pregunta del cliente. NUNCA asumas ni inventes otros horarios o ubicaciones.`;
      }
    }

    const activeSystemPrompt = SYSTEM_PROMPT + customSystemPromptAddition;

    const fullMessages = [
      { role: 'system', content: activeSystemPrompt },
      ...threadHistory
    ];

    console.log(`[Ollama Chat] Consultando a Ollama para +${providerResult.phone}...`);

    const response = await OllamaService.chat(fullMessages as any[]);
    const responseMessage = response.choices[0].message;

    // 5. SAVE OUTGOING RESPONSE
    backendFunctions.addMessage(providerResult.phone, 'outgoing', responseMessage.content);

    const finalThreadMessages = backendFunctions.getConversationHistoryForOllama(providerResult.phone);

    res.json({
      messages: finalThreadMessages,
      executedTools: functionCallsExecuted
    });

  } catch (error: any) {
    console.error('Error en /api/chat con Ollama (WhatsApp Simulation):', error);
    res.status(500).json({ error: error.message || 'Error interno al comunicarse con Ollama.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor del Laboratorio IA (Dynamic Business Config RAG) corriendo en http://localhost:${PORT}`);
});
