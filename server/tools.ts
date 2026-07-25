// In-memory Database & Tool Execution for BarberLozz Manager (Laboratorio IA Backend)

import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase.js';
import { DEFAULT_BUSINESS_ID } from './config.js';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const isPersistentMode = () => isSupabaseConfigured && isUUID(DEFAULT_BUSINESS_ID);

export interface Customer {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
  numero_visitas: number;
  gasto_total: number;
  servicio_favorito: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  color: string;
  descripcion: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  service_id: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  price_charged: number;
  created_at: string;
}

export interface BusinessSettings {
  name: string;
  phone_whatsapp: string;
  default_service_duration: number;
  open_days: number[];
  business_hours: {
    start: string;
    end: string;
  };
}

export interface Conversation {
  id: string;
  customer_phone: string;
  status: 'ai_pending' | 'ai_resolved' | 'human_needed';
  last_message: string | null;
  updated_at: string;
  created_at: string;
  customer_id?: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  direction: 'incoming' | 'outgoing';
  content: string;
  created_at: string;
}

// Stateful In-Memory Database
let dbCustomers: Customer[] = [
  {
    id: 'cust_1',
    first_name: 'Carlos',
    last_name: 'García',
    phone: '611222333',
    email: 'carlos.garcia@example.com',
    notes: 'Suele pedir degradado a navaja. Pelo muy denso.',
    numero_visitas: 12,
    gasto_total: 216.00,
    servicio_favorito: 'srv_1',
    created_at: new Date().toISOString()
  },
  {
    id: 'cust_2',
    first_name: 'Manuel',
    last_name: 'Rodríguez',
    phone: '622333444',
    email: 'manuel.rod@example.com',
    notes: 'Le gusta el café con leche. Recorte de barba corto.',
    numero_visitas: 8,
    gasto_total: 96.00,
    servicio_favorito: 'srv_2',
    created_at: new Date().toISOString()
  },
  {
    id: 'cust_3',
    first_name: 'Alejandro',
    last_name: 'Martínez',
    phone: '633444555',
    email: null,
    notes: 'Sufre de piel sensible, usar loción aloe vera.',
    numero_visitas: 4,
    gasto_total: 112.00,
    servicio_favorito: 'srv_3',
    created_at: new Date().toISOString()
  }
];

let dbServices: Service[] = [
  {
    id: 'srv_1',
    name: 'Corte Degradado (Fade)',
    price: 18.00,
    duration: 30,
    color: '#D4AF37',
    descripcion: 'Corte moderno con degradado suave en los laterales usando máquina y navaja, acabado premium con pomada.',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'srv_2',
    name: 'Arreglo de Barba Premium',
    price: 12.00,
    duration: 20,
    color: '#4B5563',
    descripcion: 'Perfilado y recorte de barba con toalla caliente, aceites esenciales para la hidratación y masaje relajante.',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'srv_3',
    name: 'Servicio Completo (Corte + Barba + Lavado)',
    price: 28.00,
    duration: 50,
    color: '#111111',
    descripcion: 'El servicio estrella de BarberLozz. Corte degradado o clásico, arreglo de barba completo con toalla caliente y lavado capilar final.',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

const getTodayWithTime = (hours: number, minutes: number): string => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

let dbAppointments: Appointment[] = [
  {
    id: 'apt_1',
    customer_id: 'cust_1',
    service_id: 'srv_1',
    start_time: getTodayWithTime(10, 0),
    end_time: getTodayWithTime(10, 30),
    status: 'completed',
    notes: 'Degradado clásico medio.',
    price_charged: 18.00,
    created_at: new Date().toISOString()
  },
  {
    id: 'apt_2',
    customer_id: 'cust_2',
    service_id: 'srv_2',
    start_time: getTodayWithTime(11, 30),
    end_time: getTodayWithTime(11, 50),
    status: 'pending',
    notes: 'Arreglo con toalla caliente.',
    price_charged: 12.00,
    created_at: new Date().toISOString()
  }
];

let dbBusinessSettings: BusinessSettings = {
  name: 'BarberLozz',
  phone_whatsapp: '+34600111222',
  default_service_duration: 30,
  open_days: [1, 2, 3, 4, 5, 6],
  business_hours: {
    start: '09:00',
    end: '20:30'
  }
};

let dbConversations: Conversation[] = [];
let dbWhatsAppMessages: WhatsAppMessage[] = [];

// 10 core receptionist functions
export const backendFunctions = {
  // Get or Create Conversation thread for a phone number (persisted in Supabase)
  getOrCreateConversation: async (phone: string, name: string, businessId: string, channel: string): Promise<Conversation & { customer_id?: string }> => {
    const bid = businessId || DEFAULT_BUSINESS_ID;
    if (isPersistentMode()) {
      const { data: existingConv } = await supabaseAdmin
        .from('conversations')
        .select('*, customer:customers(*)')
        .eq('business_id', bid)
        .eq('customer_phone', phone)
        .maybeSingle();

      if (existingConv) {
        // Update customer name if it changed
        if (existingConv.customer && existingConv.customer.nombre !== name) {
          console.log(`[FLOW] UPDATING customer name: "${existingConv.customer.nombre}" → "${name}" (customer_id=${existingConv.customer_id})`);
          await supabaseAdmin
            .from('customers')
            .update({ nombre: name })
            .eq('id', existingConv.customer_id);
        }
        return {
          id: existingConv.id,
          customer_phone: existingConv.customer_phone,
          status: existingConv.status,
          last_message: existingConv.last_message,
          updated_at: existingConv.updated_at,
          created_at: existingConv.created_at,
          customer_id: existingConv.customer_id
        };
      }

      // Find or create customer in Supabase
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('id, nombre')
        .eq('business_id', bid)
        .eq('telefono', phone)
        .maybeSingle();

      let customerId: string | null = existingCustomer?.id || null;
      if (existingCustomer && existingCustomer.nombre !== name) {
        console.log(`[FLOW] UPDATING existing customer name: "${existingCustomer.nombre}" → "${name}" (id=${existingCustomer.id})`);
        await supabaseAdmin
          .from('customers')
          .update({ nombre: name })
          .eq('id', existingCustomer.id);
      }
      if (!customerId) {
        console.log(`[FLOW] CREATING new customer: name="${name}" phone="${phone}"`);
        const { data: newCustomer, error: createErr } = await supabaseAdmin
          .from('customers')
          .insert({
            business_id: bid,
            nombre: name,
            telefono: phone,
            notas: 'Registrado automáticamente vía ' + (channel === 'WHATSAPP' ? 'WhatsApp' : 'Laboratorio IA') + '.'
          })
          .select('id')
          .single();

        if (createErr || !newCustomer) {
          throw new Error('Error creating customer in Supabase: ' + (createErr?.message || 'unknown'));
        }
        customerId = newCustomer.id;
      }

      // Create new conversation in Supabase
      const { data: newConv, error: convErr } = await supabaseAdmin
        .from('conversations')
        .insert({
          business_id: bid,
          customer_id: customerId,
          customer_phone: phone,
          status: 'ai_pending',
          ai_enabled: true,
          last_message: null
        })
        .select()
        .single();

      if (convErr || !newConv) {
        throw new Error('Error creating conversation in Supabase: ' + (convErr?.message || 'unknown'));
      }

      return {
        id: newConv.id,
        customer_phone: newConv.customer_phone,
        status: newConv.status,
        last_message: newConv.last_message,
        updated_at: newConv.updated_at,
        created_at: newConv.created_at,
        customer_id: newConv.customer_id
      };
    }

    // Non-persistent mode: in-memory fallback
    let conv = dbConversations.find(c => c.customer_phone === phone);
    if (!conv) {
      conv = {
        id: `conv_${Math.random().toString(36).substr(2, 9)}`,
        customer_phone: phone,
        status: 'ai_pending',
        last_message: null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      dbConversations.push(conv);

      let client = dbCustomers.find(c => c.phone === phone);
      if (!client) {
        dbCustomers.push({
          id: `cust_${Math.random().toString(36).substr(2, 9)}`,
          first_name: name,
          last_name: '',
          phone: phone,
          email: null,
          notes: 'Registrado automáticamente vía Laboratorio IA WhatsApp.',
          numero_visitas: 0,
          gasto_total: 0.00,
          servicio_favorito: null,
          created_at: new Date().toISOString()
        });
      }
    }
    return conv;
  },

  // Save Message in Supabase (persisted)
  addMessage: async (phone: string, direction: 'incoming' | 'outgoing', content: string, businessId?: string, channel?: string, existingConversationId?: string): Promise<WhatsAppMessage & { conversation_id: string }> => {
    const conv = existingConversationId
      ? { id: existingConversationId, customer_phone: phone }
      : await backendFunctions.getOrCreateConversation(
          phone,
          direction === 'incoming' ? 'Cliente' : 'Asistente',
          businessId || DEFAULT_BUSINESS_ID,
          channel || 'WHATSAPP'
        );
    if (!existingConversationId) {
      console.warn(`[FLOW] addMessage(${direction}) WITHOUT conversationId! getOrCreateConversation called with name="${direction === 'incoming' ? 'Cliente' : 'Asistente'}" — this may overwrite customer name!`);
    }

    const now = new Date().toISOString();

    if (isPersistentMode()) {
      const { error: msgErr } = await supabaseAdmin
        .from('whatsapp_messages')
        .insert({
          conversation_id: conv.id,
          direction,
          content,
          type: 'text',
          status: direction === 'incoming' ? 'received' : 'sent'
        });

      if (msgErr) {
        throw new Error('Error saving message to Supabase: ' + msgErr.message);
      }

      const { error: convErr } = await supabaseAdmin
        .from('conversations')
        .update({
          last_message: content,
          updated_at: now
        })
        .eq('id', conv.id);

      if (convErr) {
        throw new Error('Error updating conversation in Supabase: ' + convErr.message);
      }

      return {
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: conv.id,
        direction,
        content,
        created_at: now
      };
    }

    // In-memory fallback
    const newMsg: any = {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      conversation_id: conv.id,
      direction,
      content,
      created_at: now
    };
    dbWhatsAppMessages.push(newMsg);
    const dbConv = dbConversations.find(c => c.customer_phone === phone);
    if (dbConv) {
      dbConv.last_message = content;
      dbConv.updated_at = now;
    }
    return newMsg;
  },

  // Retrieve Thread message history formatted for Ollama (reads from Supabase)
  getConversationHistoryForOllama: async (phone: string, businessId?: string): Promise<{ role: 'user' | 'assistant'; content: string }[]> => {
    if (isPersistentMode()) {
      const { data: conv, error: convErr } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('business_id', businessId || DEFAULT_BUSINESS_ID)
        .eq('customer_phone', phone)
        .maybeSingle();

      if (convErr) {
        throw new Error('Error fetching conversation from Supabase: ' + convErr.message);
      }
      if (!conv) return [];

      const { data: messages, error: msgErr } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('direction, content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (msgErr) {
        throw new Error('Error fetching messages from Supabase: ' + msgErr.message);
      }
      if (!messages) return [];

      return messages.map((m: any) => ({
        role: m.direction === 'incoming' ? 'user' : 'assistant',
        content: m.content
      }));
    }

    // In-memory fallback
    const conv = dbConversations.find(c => c.customer_phone === phone);
    if (!conv) return [];

    return dbWhatsAppMessages
      .filter(m => m.conversation_id === conv.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(m => ({
        role: m.direction === 'incoming' ? 'user' : 'assistant',
        content: m.content
      }));
  },

  // 1. buscarHuecos(fecha, business_id)
  buscarHuecos: async (args: { fecha: string; business_id?: string }): Promise<{ success: boolean; huecos: string[] }> => {
    try {
      let startStr = dbBusinessSettings.business_hours.start;
      let endStr = dbBusinessSettings.business_hours.end;
      let duration = dbBusinessSettings.default_service_duration;

      if (isSupabaseConfigured && args.business_id) {
        const { data: settings } = await supabaseAdmin
          .from('settings')
          .select('horarios')
          .eq('business_id', args.business_id)
          .maybeSingle();

        if (settings?.horarios) {
          startStr = settings.horarios.start || startStr;
          endStr = settings.horarios.end || endStr;
          duration = 30;
        }
      }

      const [startH, startM] = startStr.split(':').map(Number);
      const [endH, endM] = endStr.split(':').map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const allSlots: string[] = [];
      for (let m = startMinutes; m < endMinutes; m += duration) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        allSlots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
      }

      let bookedTimes: string[] = [];

      if (isSupabaseConfigured && args.business_id) {
        const { data: appointments } = await supabaseAdmin
          .from('appointments')
          .select('hora')
          .eq('business_id', args.business_id)
          .eq('fecha', args.fecha)
          .neq('estado', 'cancelled');

        if (appointments) {
          bookedTimes = appointments.map(a => a.hora);
        }
      } else {
        bookedTimes = dbAppointments
          .filter(apt => {
            if (apt.status === 'cancelled') return false;
            const aptDateStr = new Date(apt.start_time).toISOString().split('T')[0];
            return aptDateStr === args.fecha;
          })
          .map(apt => {
            const d = new Date(apt.start_time);
            const h = d.getHours();
            const m = d.getMinutes();
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          });
      }

      const freeSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
      return { success: true, huecos: freeSlots };
    } catch (e: any) {
      return { success: false, huecos: [] };
    }
  },

  // 2. crearCita(cliente_id, servicio_id, fecha_hora_inicio, notas)
  crearCita: (args: { cliente_id: string; servicio_id: string; fecha_hora_inicio: string; notas?: string }): { success: boolean; appointment?: Appointment; message?: string } => {
    try {
      const service = dbServices.find(s => s.id === args.servicio_id);
      if (!service) return { success: false, message: 'Servicio no encontrado.' };

      const client = dbCustomers.find(c => c.id === args.cliente_id);
      if (!client) return { success: false, message: 'Cliente no encontrado.' };

      const startDate = new Date(args.fecha_hora_inicio);
      if (isNaN(startDate.getTime())) return { success: false, message: 'Fecha/hora de inicio inválida.' };

      const endDate = new Date(startDate.getTime() + service.duration * 60 * 1000);

      const newApt: Appointment = {
        id: `apt_${Math.random().toString(36).substr(2, 9)}`,
        customer_id: args.cliente_id,
        service_id: args.servicio_id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'pending',
        notes: args.notes || null,
        price_charged: service.price,
        created_at: new Date().toISOString()
      };

      dbAppointments.push(newApt);
      return { success: true, appointment: newApt };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  // 3. cancelarCita(cita_id)
  cancelarCita: (args: { cita_id: string }): { success: boolean; message?: string } => {
    const aptIndex = dbAppointments.findIndex(a => a.id === args.cita_id);
    if (aptIndex === -1) return { success: false, message: 'Cita no encontrada.' };
    dbAppointments[aptIndex].status = 'cancelled';
    return { success: true };
  },

  // 4. editarCita(cita_id, ...)
  editarCita: (args: { cita_id: string; servicio_id?: string; fecha_hora_inicio?: string; notas?: string }): { success: boolean; appointment?: Appointment; message?: string } => {
    const apt = dbAppointments.find(a => a.id === args.cita_id);
    if (!apt) return { success: false, message: 'Cita no encontrada.' };

    if (args.notes !== undefined) apt.notes = args.notes;

    if (args.servicio_id) {
      const srv = dbServices.find(s => s.id === args.servicio_id);
      if (srv) {
        apt.service_id = args.servicio_id;
        apt.price_charged = srv.price;
      }
    }

    if (args.fecha_hora_inicio) {
      const startDate = new Date(args.fecha_hora_inicio);
      const srv = dbServices.find(s => s.id === apt.service_id);
      const dur = srv ? srv.duration : 30;

      apt.start_time = startDate.toISOString();
      apt.end_time = new Date(startDate.getTime() + dur * 60 * 1000).toISOString();
    }

    return { success: true, appointment: apt };
  },

  // 5. buscarCliente(termino)
  buscarCliente: (args: { termino: string }): { success: boolean; clientes: Customer[] } => {
    const term = args.termino.toLowerCase();
    const matches = dbCustomers.filter(c => {
      const full = `${c.first_name} ${c.last_name || ''} ${c.phone}`.toLowerCase();
      return full.includes(term);
    });
    return { success: true, clientes: matches };
  },

  // 6. crearCliente(nombre, telefono, apellido, email, notas)
  crearCliente: (args: { nombre: string; telefono: string; apellido?: string; email?: string; notas?: string }): { success: boolean; cliente?: Customer } => {
    const newCustomer: Customer = {
      id: `cust_${Math.random().toString(36).substr(2, 9)}`,
      first_name: args.nombre,
      last_name: args.apellido || null,
      phone: args.telefono,
      email: args.email || null,
      notes: args.notes || null,
      numero_visitas: 0,
      gasto_total: 0.00,
      servicio_favorito: null,
      created_at: new Date().toISOString()
    };
    dbCustomers.push(newCustomer);
    return { success: true, cliente: newCustomer };
  },

  // 7. obtenerServicios()
  obtenerServicios: (): { success: boolean; servicios: Service[] } => {
    return { success: true, servicios: dbServices.filter(s => s.is_active) };
  },

  // 8. obtenerHorario()
  obtenerHorario: (): { success: boolean; horario: any } => {
    return { 
      success: true, 
      horario: {
        open_days: dbBusinessSettings.open_days,
        business_hours: dbBusinessSettings.business_hours
      }
    };
  },

  // 9. obtenerPrecios()
  obtenerPrecios: (): { success: boolean; precios: { name: string; price: number; id: string }[] } => {
    return {
      success: true,
      precios: dbServices.filter(s => s.is_active).map(s => ({ id: s.id, name: s.name, price: s.price }))
    };
  },

  // 10. obtenerConfiguracion()
  obtenerConfiguracion: (): { success: boolean; configuracion: BusinessSettings } => {
    return { success: true, configuracion: dbBusinessSettings };
  },

  // 12. getBusinessSettings(business_id)
  getBusinessSettings: async (args?: { business_id?: string }): Promise<{ success: boolean; name: string; phone_whatsapp: string; default_service_duration: number; open_days: number[]; business_hours: { start: string; end: string }; direccion: string }> => {
    if (isSupabaseConfigured && args?.business_id) {
      const { data: biz } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('id', args.business_id)
        .maybeSingle();

      const { data: settings } = await supabaseAdmin
        .from('settings')
        .select('horarios')
        .eq('business_id', args.business_id)
        .maybeSingle();

      const horarios = settings?.horarios || { start: '09:00', end: '20:30', open_days: [1, 2, 3, 4, 5, 6] };

      return {
        success: true,
        name: biz?.nombre || dbBusinessSettings.name,
        phone_whatsapp: biz?.telefono || dbBusinessSettings.phone_whatsapp,
        default_service_duration: 30,
        open_days: horarios.open_days || dbBusinessSettings.open_days,
        business_hours: { start: horarios.start || dbBusinessSettings.business_hours.start, end: horarios.end || dbBusinessSettings.business_hours.end },
        direccion: biz?.direccion || 'Calle Gran Vía 45, Madrid'
      };
    }

    return {
      success: true,
      name: dbBusinessSettings.name,
      phone_whatsapp: dbBusinessSettings.phone_whatsapp,
      default_service_duration: dbBusinessSettings.default_service_duration,
      open_days: dbBusinessSettings.open_days,
      business_hours: dbBusinessSettings.business_hours,
      direccion: 'Calle Gran Vía 45, Madrid'
    };
  },

  // 13. updateBusinessSettings()
  updateBusinessSettings: (updated: Partial<BusinessSettings>): { success: boolean; configuracion: BusinessSettings } => {
    dbBusinessSettings = {
      ...dbBusinessSettings,
      ...updated
    };
    return { success: true, configuracion: dbBusinessSettings };
  },

  // 14. consultar_disponibilidad() — check if a date+time slot is free in Supabase
  consultar_disponibilidad: async (args: { business_id: string; fecha: string; hora: string }): Promise<{ success: boolean; disponible: boolean; message?: string }> => {
    try {
      if (isSupabaseConfigured) {
        const { data: existing } = await supabaseAdmin
          .from('appointments')
          .select('id')
          .eq('business_id', args.business_id)
          .eq('fecha', args.fecha)
          .eq('hora', args.hora)
          .neq('estado', 'cancelled')
          .maybeSingle();

        if (existing) {
          return { success: true, disponible: false, message: 'La hora seleccionada ya está ocupada.' };
        }
        return { success: true, disponible: true, message: 'Horario disponible.' };
      }

      // Fallback in-memory
      const startIso = `${args.fecha}T${args.hora}:00`;
      const startDate = new Date(startIso);
      const alreadyBooked = dbAppointments.some(apt => {
        if (apt.status === 'cancelled') return false;
        return new Date(apt.start_time).getTime() === startDate.getTime();
      });
      return {
        success: true,
        disponible: !alreadyBooked,
        message: alreadyBooked ? 'La hora seleccionada ya está ocupada.' : 'Horario disponible.'
      };
    } catch (e: any) {
      return { success: false, disponible: false, message: e.message };
    }
  },

  // 15. crear_cita() — creates a real appointment in Supabase
  crear_cita: async (args: { nombre: string; telefono: string; servicio: string; fecha: string; hora: string; business_id: string; origen?: string }): Promise<{ success: boolean; cita?: any; message?: string }> => {
    try {
      if (isSupabaseConfigured) {
        // 1. Find or create customer
        const { data: existingCustomer } = await supabaseAdmin
          .from('customers')
          .select('*')
          .eq('business_id', args.business_id)
          .eq('telefono', args.telefono)
          .maybeSingle();

        let customer = existingCustomer;
        if (!customer) {
          const { data: newCustomer, error: createErr } = await supabaseAdmin
            .from('customers')
            .insert({
              business_id: args.business_id,
              nombre: args.nombre,
              telefono: args.telefono,
              notas: 'Registrado automáticamente al agendar cita por WhatsApp.'
            })
            .select()
            .single();

          if (createErr) throw createErr;
          customer = newCustomer;
        }

        // 2. Get first employee (if any)
        const { data: employees } = await supabaseAdmin
          .from('employees')
          .select('id, full_name')
          .eq('business_id', args.business_id)
          .limit(1);

        const employeeId = employees?.[0]?.id || null;
        const employeeName = employees?.[0]?.full_name || null;

        // 3. Find service by name
        const term = args.servicio.toLowerCase();
        const { data: services } = await supabaseAdmin
          .from('services')
          .select('*')
          .eq('business_id', args.business_id)
          .eq('is_active', true);

        let service = services?.find((s: any) => s.nombre.toLowerCase().includes(term));
        if (!service) {
          service = services?.[0];
        }
        if (!service) {
          return { success: false, message: 'No hay servicios activos disponibles.' };
        }

        // 4. Check double-booking
        const { data: existingApt } = await supabaseAdmin
          .from('appointments')
          .select('id')
          .eq('business_id', args.business_id)
          .eq('fecha', args.fecha)
          .eq('hora', args.hora)
          .neq('estado', 'cancelled')
          .maybeSingle();

        if (existingApt) {
          return { success: false, message: 'La hora seleccionada ya está ocupada.' };
        }

        // 5. Create appointment
        const { data: cita, error: aptErr } = await supabaseAdmin
          .from('appointments')
          .insert({
            business_id: args.business_id,
            customer_id: customer.id,
            employee_id: employeeId,
            servicio_id: service.id,
            fecha: args.fecha,
            hora: args.hora,
            estado: 'pending',
            origen: args.origen || 'IA',
            notes: 'Creado por Asistente IA WhatsApp.',
            price_charged: service.precio
          })
          .select(`
            *,
            customer:customers(*),
            service:services(*)
          `)
          .single();

        if (aptErr) throw aptErr;
        return { success: true, cita: { ...cita, employee_name: employeeName } };
      }

      // Fallback in-memory
      const startIso = `${args.fecha}T${args.hora}:00`;
      const startDate = new Date(startIso);
      if (isNaN(startDate.getTime())) {
        return { success: false, message: 'La fecha u hora de la cita son inválidas.' };
      }

      const alreadyBooked = dbAppointments.some(apt => {
        if (apt.status === 'cancelled') return false;
        return new Date(apt.start_time).getTime() === startDate.getTime();
      });
      if (alreadyBooked) {
        return { success: false, message: 'La hora seleccionada ya está ocupada.' };
      }

      let client = dbCustomers.find(c => c.phone === args.telefono);
      if (!client) {
        client = {
          id: `cust_${Math.random().toString(36).substr(2, 9)}`,
          first_name: args.nombre,
          last_name: '',
          phone: args.telefono,
          email: null,
          notes: 'Registrado automáticamente al agendar cita por WhatsApp.',
          numero_visitas: 0,
          gasto_total: 0.00,
          servicio_favorito: null,
          created_at: new Date().toISOString()
        };
        dbCustomers.push(client);
      }

      const term = args.servicio.toLowerCase();
      let service = dbServices.find(s => s.name.toLowerCase().includes(term));
      if (!service) {
        service = dbServices[0];
      }

      const endDate = new Date(startDate.getTime() + service.duration * 60 * 1000);
      const newApt: Appointment = {
        id: `apt_${Math.random().toString(36).substr(2, 9)}`,
        customer_id: client.id,
        service_id: service.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'pending',
        notes: 'Creado por Asistente IA WhatsApp.',
        price_charged: service.price,
        created_at: new Date().toISOString()
      };

      dbAppointments.push(newApt);
      return { success: true, cita: newApt };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  // 11. createAppointment() with Supabase persistence (real appointments)
  createAppointment: async (args: { business_id: string; nombre: string; telefono: string; fecha: string; hora: string; servicio: string }): Promise<{ success: boolean; appointment?: any; message?: string }> => {
    try {
      if (isSupabaseConfigured) {
        // 1. Find or create customer
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', args.business_id)
          .eq('telefono', args.telefono)
          .maybeSingle();

        let customer = existingCustomer;
        if (!customer) {
          const { data: newCustomer, error: createErr } = await supabase
            .from('customers')
            .insert({
              business_id: args.business_id,
              nombre: args.nombre,
              telefono: args.telefono,
              notas: 'Registrado automáticamente al agendar cita por WhatsApp.'
            })
            .select()
            .single();

          if (createErr) throw createErr;
          customer = newCustomer;
        }

        // 2. Get first employee for the business (if any)
        const { data: employees } = await supabase
          .from('employees')
          .select('id')
          .eq('business_id', args.business_id)
          .limit(1);

        const employeeId = employees?.[0]?.id || null;

        // 3. Find service by name
        const term = args.servicio.toLowerCase();
        const { data: services } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', args.business_id)
          .eq('is_active', true);

        let service = services?.find((s: any) => s.nombre.toLowerCase().includes(term));
        if (!service) {
          service = services?.[0];
        }
        if (!service) {
          return { success: false, message: 'No hay servicios activos disponibles.' };
        }

        // 4. Check double-booking
        const { data: existingApt } = await supabase
          .from('appointments')
          .select('id')
          .eq('business_id', args.business_id)
          .eq('fecha', args.fecha)
          .eq('hora', args.hora)
          .neq('estado', 'cancelled')
          .maybeSingle();

        if (existingApt) {
          return { success: false, message: 'La hora seleccionada ya está ocupada.' };
        }

        // 5. Create real appointment in Supabase
        const { data: appointment, error: aptErr } = await supabase
          .from('appointments')
          .insert({
            business_id: args.business_id,
            customer_id: customer.id,
            employee_id: employeeId,
            servicio_id: service.id,
            fecha: args.fecha,
            hora: args.hora,
            estado: 'pending',
            origen: 'WHATSAPP',
            notes: 'Creado por Asistente IA WhatsApp.',
            price_charged: service.precio
          })
          .select(`
            *,
            customer:customers(*),
            service:services(*)
          `)
          .single();

        if (aptErr) throw aptErr;
        return { success: true, appointment };
      }

      // Fallback: in-memory mode (when Supabase is not configured)
      const startIso = `${args.fecha}T${args.hora}:00`;
      const startDate = new Date(startIso);
      if (isNaN(startDate.getTime())) {
        return { success: false, message: 'La fecha u hora de la cita son inválidas.' };
      }

      const alreadyBooked = dbAppointments.some(apt => {
        if (apt.status === 'cancelled') return false;
        return new Date(apt.start_time).getTime() === startDate.getTime();
      });

      if (alreadyBooked) {
        return { success: false, message: 'La hora seleccionada ya está ocupada.' };
      }

      let client = dbCustomers.find(c => c.phone === args.telefono);
      if (!client) {
        client = {
          id: `cust_${Math.random().toString(36).substr(2, 9)}`,
          first_name: args.nombre,
          last_name: '',
          phone: args.telefono,
          email: null,
          notes: 'Registrado automáticamente al agendar cita por WhatsApp.',
          numero_visitas: 0,
          gasto_total: 0.00,
          servicio_favorito: null,
          created_at: new Date().toISOString()
        };
        dbCustomers.push(client);
      }

      const term = args.servicio.toLowerCase();
      let service = dbServices.find(s => s.name.toLowerCase().includes(term));
      if (!service) {
        service = dbServices[0];
      }

      const endDate = new Date(startDate.getTime() + service.duration * 60 * 1000);
      const newApt: Appointment = {
        id: `apt_${Math.random().toString(36).substr(2, 9)}`,
        customer_id: client.id,
        service_id: service.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'pending',
        notes: 'Creado por Asistente IA WhatsApp.',
        price_charged: service.price,
        created_at: new Date().toISOString()
      };

      dbAppointments.push(newApt);
      return { success: true, appointment: newApt };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
};
