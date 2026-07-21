import { useAppointmentStore } from '../stores/appointmentStore';
import { useCustomerStore } from '../stores/customerStore';
import { useServiceStore } from '../stores/serviceStore';
import { useBusinessStore } from '../stores/businessStore';
import type { Customer, Service, Appointment } from '../types';

/**
 * 1. OPENAI FUNCTION CALLING SCHEMAS DEFINITION
 * (Preserved for compatibility and future expansions)
 */
export const aiFunctionSchemas = [
  {
    name: 'buscarHuecos',
    description: 'Busca huecos libres para citas en una fecha determinada.',
    parameters: {
      type: 'object',
      properties: {
        fecha: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD (Ej: 2026-07-16).'
        }
      },
      required: ['fecha']
    }
  },
  {
    name: 'crearCita',
    description: 'Crea una nueva cita para un cliente con un servicio determinado en una fecha y hora específicas.',
    parameters: {
      type: 'object',
      properties: {
        cliente_id: { type: 'string', description: 'ID del cliente.' },
        servicio_id: { type: 'string', description: 'ID del servicio.' },
        fecha: { type: 'string', description: 'Fecha YYYY-MM-DD' },
        hora: { type: 'string', description: 'Hora HH:MM' },
        notas: { type: 'string', description: 'Notas opcionales.' }
      },
      required: ['cliente_id', 'servicio_id', 'fecha', 'hora']
    }
  }
];

/**
 * 2. TS HANDLERS & OPERATIONS CONTROLLER
 */
export const aiFunctionsController = {
  // 1. buscarHuecos(fecha)
  buscarHuecos: async (fecha: string): Promise<string[]> => {
    const { appointments, fetchAppointments } = useAppointmentStore.getState();
    const { business, fetchBusiness } = useBusinessStore.getState();
    
    if (appointments.length === 0) await fetchAppointments();
    if (!business) await fetchBusiness();
    
    const startStr = business?.horarios?.start || '09:00';
    const endStr = business?.horarios?.end || '20:30';
    const duration = 30; // standard default duration

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

    // Filter out already booked slots
    const bookedTimes = appointments
      .filter(apt => {
        if (apt.estado === 'cancelled') return false;
        return apt.fecha === fecha;
      })
      .map(apt => apt.hora);

    return allSlots.filter(slot => !bookedTimes.includes(slot));
  },

  // 2. crearCita(cliente_id, servicio_id, fecha, hora, notas)
  crearCita: async (
    cliente_id: string, 
    servicio_id: string, 
    fecha: string, 
    hora: string,
    notas?: string
  ): Promise<boolean> => {
    const { addAppointment } = useAppointmentStore.getState();
    const { services, fetchServices } = useServiceStore.getState();
    
    if (services.length === 0) await fetchServices();
    const service = services.find(s => s.id === servicio_id);
    if (!service) return false;

    return addAppointment({
      customer_id: cliente_id,
      servicio_id: servicio_id,
      employee_id: null,
      fecha,
      hora,
      estado: 'pending',
      origen: 'MANUAL',
      notes: notas || null,
      price_charged: service.precio
    });
  },

  // 3. cancelarCita(cita_id)
  cancelarCita: async (cita_id: string): Promise<boolean> => {
    const { cancelAppointment } = useAppointmentStore.getState();
    return cancelAppointment(cita_id);
  },

  // 4. editarCita(cita_id, ...)
  editarCita: async (
    cita_id: string, 
    servicio_id?: string, 
    fecha?: string, 
    hora?: string,
    notas?: string
  ): Promise<boolean> => {
    const { updateAppointment, appointments } = useAppointmentStore.getState();
    const apt = appointments.find(a => a.id === cita_id);
    if (!apt) return false;

    const updated: any = {};
    if (notas !== undefined) updated.notes = notas;

    if (servicio_id && servicio_id !== apt.servicio_id) {
      const { services } = useServiceStore.getState();
      const service = services.find(s => s.id === servicio_id);
      if (service) {
        updated.servicio_id = servicio_id;
        updated.price_charged = service.precio;
      }
    }

    if (fecha) updated.fecha = fecha;
    if (hora) updated.hora = hora;

    return updateAppointment(cita_id, updated);
  },

  // 5. buscarCliente(termino)
  buscarCliente: async (termino: string): Promise<Customer[]> => {
    const { customers, fetchCustomers } = useCustomerStore.getState();
    if (customers.length === 0) await fetchCustomers();
    
    return customers.filter(c => {
      const full = `${c.nombre} ${c.telefono}`.toLowerCase();
      return full.includes(termino.toLowerCase());
    });
  },

  // 6. crearCliente(nombre, telefono, email, notas)
  crearCliente: async (
    nombre: string, 
    telefono: string, 
    email?: string, 
    notas?: string
  ): Promise<Customer | null> => {
    const { addCustomer } = useCustomerStore.getState();
    return addCustomer({
      nombre,
      telefono,
      email: email || null,
      notas: notas || null
    });
  },

  // 7. obtenerServicios()
  obtenerServicios: async (): Promise<Service[]> => {
    const { services, fetchServices } = useServiceStore.getState();
    if (services.length === 0) await fetchServices();
    return services.filter(s => s.is_active);
  },

  // 8. obtenerHorario()
  obtenerHorario: async (): Promise<any> => {
    const { business, fetchBusiness } = useBusinessStore.getState();
    if (!business) await fetchBusiness();
    return {
      open_days: business?.horarios?.open_days,
      business_hours: {
        start: business?.horarios?.start,
        end: business?.horarios?.end
      }
    };
  },

  // 9. obtenerPrecios()
  obtenerPrecios: async (): Promise<{ name: string, price: number }[]> => {
    const { services, fetchServices } = useServiceStore.getState();
    if (services.length === 0) await fetchServices();
    return services
      .filter(s => s.is_active)
      .map(s => ({ name: s.nombre, price: s.precio }));
  },

  // 10. obtenerConfiguracion()
  obtenerConfiguracion: async (): Promise<any> => {
    const { business, fetchBusiness } = useBusinessStore.getState();
    if (!business) await fetchBusiness();
    return business;
  }
};
export type { Appointment };
