// In-memory Database & Tool Execution for BarberLozz Manager (Laboratorio IA Backend)

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
  // Get or Create Conversation thread for a phone number
  getOrCreateConversation: (phone: string, name: string): Conversation => {
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

      // Auto-register customer if not exists
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

  // Save Message in persistent memory thread
  addMessage: (phone: string, direction: 'incoming' | 'outgoing', content: string): WhatsAppMessage => {
    const conv = backendFunctions.getOrCreateConversation(phone, direction === 'incoming' ? 'Cliente de WhatsApp' : 'Asistente');
    
    const newMsg: WhatsAppMessage = {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      conversation_id: conv.id,
      direction,
      content,
      created_at: new Date().toISOString()
    };
    
    dbWhatsAppMessages.push(newMsg);
    
    // Update conversation header
    conv.last_message = content;
    conv.updated_at = new Date().toISOString();
    
    return newMsg;
  },

  // Retrieve Thread message history formatted for Ollama
  getConversationHistoryForOllama: (phone: string): { role: 'user' | 'assistant'; content: string }[] => {
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

  // 1. buscarHuecos(fecha)
  buscarHuecos: (args: { fecha: string }): { success: boolean; huecos: string[] } => {
    try {
      const startStr = dbBusinessSettings.business_hours.start;
      const endStr = dbBusinessSettings.business_hours.end;
      const duration = dbBusinessSettings.default_service_duration;

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

      const bookedTimes = dbAppointments
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

  // 12. getBusinessSettings()
  getBusinessSettings: (): { success: boolean; name: string; phone_whatsapp: string; default_service_duration: number; open_days: number[]; business_hours: { start: string; end: string }; direccion: string } => {
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

  // 11. createAppointment() with strict double-booking prevention keyed by phone
  createAppointment: (args: { nombre: string; telefono: string; fecha: string; hora: string; servicio: string }): { success: boolean; appointment?: Appointment; message?: string } => {
    try {
      const startIso = `${args.fecha}T${args.hora}:00`;
      const startDate = new Date(startIso);
      if (isNaN(startDate.getTime())) {
        return { success: false, message: 'La fecha u hora de la cita son inválidas.' };
      }

      // 1. Enforce double-booking check
      const alreadyBooked = dbAppointments.some(apt => {
        if (apt.status === 'cancelled') return false;
        return new Date(apt.start_time).getTime() === startDate.getTime();
      });

      if (alreadyBooked) {
        return { success: false, message: 'La hora seleccionada ya está ocupada.' };
      }

      // 2. Find or register customer by phone
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

      // 3. Find service match
      const term = args.servicio.toLowerCase();
      let service = dbServices.find(s => s.name.toLowerCase().includes(term));
      if (!service) {
        service = dbServices[0]; // fallback
      }

      // 4. Record appointment
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
