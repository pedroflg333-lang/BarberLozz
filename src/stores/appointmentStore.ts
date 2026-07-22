import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { backendApi } from '../services/backendApi';
import type { Appointment } from '../types';
import { useAuthStore } from './authStore';
import { useCustomerStore } from './customerStore';
import { useServiceStore } from './serviceStore';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  
  fetchAppointments: () => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'business_id' | 'created_at'>) => Promise<boolean>;
  updateAppointment: (id: string, updated: Partial<Appointment>) => Promise<boolean>;
  cancelAppointment: (id: string) => Promise<boolean>;
  completeAppointment: (id: string) => Promise<boolean>;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  loading: false,
  error: null,
  
  fetchAppointments: async () => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return;
    
    set({ loading: true, error: null });
    
    // Use backend proxy when businessId is a real UUID (bypasses RLS)
    if (isUUID(businessId) && backendApi.isAvailable()) {
      const data = await backendApi.getAppointments(businessId);
      if (data !== null) {
        set({ appointments: data as Appointment[], loading: false });
        return;
      }
      // If backend proxy fails, try direct Supabase
    }
    
    if (!isSupabaseConfigured) {
      const key = `appointments_${businessId}`;
      const cached = localStorage.getItem(key);
      let list: Appointment[] = [];
      
      if (cached) {
        try { list = JSON.parse(cached); } catch (e) {}
      } else {
        const getTodayDateStr = () => new Date().toISOString().split('T')[0];
        list = [
          {
            id: 'apt_1',
            business_id: businessId,
            customer_id: 'cust_1',
            employee_id: 'emp_1',
            fecha: getTodayDateStr(),
            hora: '10:00',
            servicio_id: 'srv_1',
            estado: 'completed',
            origen: 'WHATSAPP',
            price_charged: 18.00,
            notes: 'Degradado clásico.',
            created_at: new Date().toISOString()
          },
          {
            id: 'apt_2',
            business_id: businessId,
            customer_id: 'cust_2',
            employee_id: 'emp_1',
            fecha: getTodayDateStr(),
            hora: '11:30',
            servicio_id: 'srv_2',
            estado: 'pending',
            origen: 'MANUAL',
            price_charged: 12.00,
            notes: 'Recorte de barba.',
            created_at: new Date().toISOString()
          }
        ];
        localStorage.setItem(key, JSON.stringify(list));
      }
      
      const customers = useCustomerStore.getState().customers;
      const services = useServiceStore.getState().services;
      
      if (customers.length === 0) await useCustomerStore.getState().fetchCustomers();
      if (services.length === 0) await useServiceStore.getState().fetchServices();
      
      const populated = list.map(apt => {
        const custs = useCustomerStore.getState().customers;
        const srvs = useServiceStore.getState().services;
        return {
          ...apt,
          customer: custs.find(c => c.id === apt.customer_id),
          service: srvs.find(s => s.id === apt.servicio_id)
        };
      });
      
      set({ appointments: populated, loading: false });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, customer:customers(*), service:services(*)')
        .eq('business_id', businessId)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });
        
      if (error) throw error;
      set({ appointments: (data as any[]) || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
  
  addAppointment: async (appointmentData) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    set({ loading: true, error: null });
    
    if (!isSupabaseConfigured) {
      const newApt: Appointment = {
        ...appointmentData,
        id: `apt_${Math.random().toString(36).substr(2, 9)}`,
        business_id: businessId,
        created_at: new Date().toISOString()
      };
      
      const key = `appointments_${businessId}`;
      const cached = localStorage.getItem(key);
      let list: Appointment[] = [];
      if (cached) {
        try { list = JSON.parse(cached); } catch (e) {}
      }
      
      const updatedList = [...list, newApt];
      localStorage.setItem(key, JSON.stringify(updatedList));
      
      await get().fetchAppointments();
      return true;
    }
    
    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          business_id: businessId
        });
        
      if (error) throw error;
      
      await get().fetchAppointments();
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },
  
  updateAppointment: async (id, updated) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    set({ loading: true, error: null });
    
    // Use backend proxy (bypasses RLS)
    if (isUUID(businessId) && backendApi.isAvailable()) {
      try {
        const res = await fetch(`http://localhost:4000/api/appointments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
        if (res.ok) {
          await get().fetchAppointments();
          return true;
        }
      } catch {}
    }
    
    if (!isSupabaseConfigured) {
      const key = `appointments_${businessId}`;
      const cached = localStorage.getItem(key);
      let list: Appointment[] = [];
      if (cached) {
        try { list = JSON.parse(cached); } catch (e) {}
      }
      
      const updatedList = list.map(apt => 
        apt.id === id ? { ...apt, ...updated } : apt
      );
      localStorage.setItem(key, JSON.stringify(updatedList));
      
      await get().fetchAppointments();
      return true;
    }
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update(updated)
        .eq('id', id);
        
      if (error) throw error;
      
      await get().fetchAppointments();
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },
  
  cancelAppointment: async (id) => {
    return get().updateAppointment(id, { estado: 'cancelled' });
  },
  
  completeAppointment: async (id) => {
    return get().updateAppointment(id, { estado: 'completed' });
  }
}));
