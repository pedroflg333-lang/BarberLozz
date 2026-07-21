import type { Business, Customer, Service, Appointment, Conversation, WhatsAppMessage } from '../types';

export const mockBusiness: Business = {
  id: 'bs_barberlozz',
  nombre: 'BarberLozz',
  logo_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&auto=format&fit=crop&q=80',
  telefono: '+34600111222',
  email: 'contacto@barberlozz.com',
  direccion: 'Calle Gran Vía 45, Madrid',
  horarios: {
    start: '09:00',
    end: '20:30',
    open_days: [1, 2, 3, 4, 5, 6]
  },
  configuracion_ia: {
    custom_prompt: 'Eres el recepcionista virtual. Hablas cercano y breve.',
    greeting: '¡Hola! Bienvenido. ¿Quieres reservar una cita?',
    ai_enabled: true
  },
  created_at: new Date().toISOString()
};

export const mockCustomers: Customer[] = [
  {
    id: 'cust_1',
    business_id: 'bs_barberlozz',
    nombre: 'Carlos García',
    telefono: '34611222333',
    email: 'carlos.garcia@example.com',
    notas: 'Suele pedir degradado a navaja. Pelo muy denso.',
    numero_visitas: 12,
    gasto_total: 216.00,
    servicio_favorito: 'srv_1',
    fecha_registro: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    ultima_visita: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cust_2',
    business_id: 'bs_barberlozz',
    nombre: 'Manuel Rodríguez',
    telefono: '34622333444',
    email: 'manuel.rod@example.com',
    notas: 'Le gusta el café con leche. Recorte de barba corto.',
    numero_visitas: 8,
    gasto_total: 96.00,
    servicio_favorito: 'srv_2',
    fecha_registro: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    ultima_visita: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cust_3',
    business_id: 'bs_barberlozz',
    nombre: 'Alejandro Martínez',
    telefono: '34633444555',
    email: null,
    notas: 'Sufre de piel sensible, usar loción aloe vera.',
    numero_visitas: 4,
    gasto_total: 112.00,
    servicio_favorito: 'srv_3',
    fecha_registro: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    ultima_visita: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const mockServices: Service[] = [
  {
    id: 'srv_1',
    business_id: 'bs_barberlozz',
    nombre: 'Corte Degradado (Fade)',
    precio: 18.00,
    duracion: 30,
    color: '#D4AF37',
    descripcion: 'Corte moderno con degradado suave en los laterales usando máquina y navaja.',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'srv_2',
    business_id: 'bs_barberlozz',
    nombre: 'Arreglo de Barba Premium',
    precio: 12.00,
    duracion: 20,
    color: '#4B5563',
    descripcion: 'Perfilado y recorte de barba con toalla caliente y aceites esenciales.',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'srv_3',
    business_id: 'bs_barberlozz',
    nombre: 'Servicio Completo',
    precio: 28.00,
    duracion: 50,
    color: '#111111',
    descripcion: 'Corte de cabello, arreglo de barba y lavado capilar final.',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

const getTodayDateStr = () => new Date().toISOString().split('T')[0];

export const mockAppointments: Appointment[] = [
  {
    id: 'apt_1',
    business_id: 'bs_barberlozz',
    customer_id: 'cust_1',
    employee_id: 'emp_1',
    fecha: getTodayDateStr(),
    hora: '10:00',
    servicio_id: 'srv_1',
    estado: 'completed',
    origen: 'WHATSAPP',
    notes: 'Degradado clásico medio.',
    price_charged: 18.00,
    created_at: new Date().toISOString()
  },
  {
    id: 'apt_2',
    business_id: 'bs_barberlozz',
    customer_id: 'cust_2',
    employee_id: 'emp_1',
    fecha: getTodayDateStr(),
    hora: '11:30',
    servicio_id: 'srv_2',
    estado: 'pending',
    origen: 'MANUAL',
    notes: 'Arreglo con toalla caliente.',
    price_charged: 12.00,
    created_at: new Date().toISOString()
  }
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv_1',
    business_id: 'bs_barberlozz',
    customer_id: 'cust_1',
    customer_phone: '34611222333',
    status: 'ai_resolved',
    last_message: '¡Perfecto! Apúntamelo mañana a las 18:30 entonces. ¡Gracias!',
    ai_enabled: true,
    updated_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'conv_2',
    business_id: 'bs_barberlozz',
    customer_id: 'cust_2',
    customer_phone: '34622333444',
    status: 'ai_pending',
    last_message: '¿Teneis hueco hoy sobre las 17:00 para arreglo de barba?',
    ai_enabled: true,
    updated_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

export const mockWhatsAppMessages: WhatsAppMessage[] = [
  {
    id: 'msg_1_1',
    conversation_id: 'conv_1',
    direction: 'incoming',
    content: 'Hola! Buenas tardes.',
    type: 'text',
    status: 'read',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 'msg_1_2',
    conversation_id: 'conv_1',
    direction: 'outgoing',
    content: '¡Hola Carlos! Bienvenido a BarberLozz. ¿En qué te puedo ayudar hoy?',
    type: 'text',
    status: 'read',
    created_at: new Date(Date.now() - 24 * 60 * 1000).toISOString()
  }
];
