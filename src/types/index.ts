export interface Business {
  id: string;
  nombre: string;
  logo_url: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  horarios: {
    start: string; // "09:00"
    end: string;   // "20:30"
    open_days: number[]; // [1,2,3,4,5,6]
  };
  configuracion_ia: {
    custom_prompt: string;
    greeting: string;
    ai_enabled: boolean;
  };
  created_at: string;
}

export interface Profile {
  id: string;
  business_id: string | null;
  full_name: string;
  role: 'admin' | 'employee';
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  nombre: string;
  telefono: string; // WhatsApp number
  email: string | null;
  notas: string | null;
  fecha_registro: string;
  ultima_visita: string | null;
  numero_visitas: number;
  gasto_total: number;
  servicio_favorito: string | null; // Service ID
}

export interface Service {
  id: string;
  business_id: string;
  nombre: string;
  precio: number;
  duracion: number; // in minutes
  color: string; // hex color
  descripcion: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  customer_id: string;
  employee_id: string | null; // Nullable
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
  servicio_id: string;
  estado: 'pending' | 'completed' | 'cancelled';
  origen: 'MANUAL' | 'IA' | 'WHATSAPP' | 'WEB';
  notes: string | null;
  price_charged: number;
  created_at: string;
  
  // Populated fields
  customer?: Customer;
  service?: Service;
  employee?: Profile;
}

export interface Conversation {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_phone: string;
  status: 'ai_pending' | 'ai_resolved' | 'human_needed';
  last_message: string | null;
  ai_enabled: boolean;
  updated_at: string;
  created_at: string;
  
  customer?: Customer;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  direction: 'incoming' | 'outgoing';
  content: string;
  type: 'text' | 'image' | 'location';
  status: 'received' | 'sent' | 'delivered' | 'read';
  created_at: string;
}
