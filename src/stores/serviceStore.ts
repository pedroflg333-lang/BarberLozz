import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { backendApi } from '../services/backendApi';
import type { Service } from '../types';
import { useAuthStore } from './authStore';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

interface ServiceState {
  services: Service[];
  loading: boolean;
  error: string | null;
  
  fetchServices: () => Promise<void>;
  addService: (service: Omit<Service, 'id' | 'business_id' | 'created_at'>) => Promise<boolean>;
  updateService: (id: string, updated: Partial<Service>) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: [],
  loading: false,
  error: null,
  
  fetchServices: async () => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return;
    
    set({ loading: true, error: null });
    
    // Use backend proxy (bypasses RLS)
    if (isUUID(businessId) && backendApi.isAvailable()) {
      const data = await backendApi.getServices(businessId);
      if (data !== null) {
        set({ services: data as Service[], loading: false });
        return;
      }
    }
    
    if (!isSupabaseConfigured) {
      const key = `services_${businessId}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          set({ services: JSON.parse(cached), loading: false });
          return;
        } catch (e) {}
      }
      
      // Default Mock Services Seed
      const seeded: Service[] = [
        {
          id: 'srv_1',
          business_id: businessId,
          nombre: 'Corte Degradado (Fade)',
          precio: 18.00,
          duracion: 30,
          color: '#D4AF37',
          descripcion: 'Corte moderno con degradado suave en los laterales.',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'srv_2',
          business_id: businessId,
          nombre: 'Arreglo de Barba Premium',
          precio: 12.00,
          duracion: 20,
          color: '#4B5563',
          descripcion: 'Recorte de barba con toalla caliente y aceites.',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'srv_3',
          business_id: businessId,
          nombre: 'Servicio Completo',
          precio: 28.00,
          duracion: 50,
          color: '#111111',
          descripcion: 'Corte de cabello, arreglo de barba y lavado capilar.',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem(key, JSON.stringify(seeded));
      set({ services: seeded, loading: false });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .order('nombre', { ascending: true });
        
      if (error) throw error;
      set({ services: (data as Service[]) || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
  
  addService: async (serviceData) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    set({ loading: true, error: null });
    
    if (!isSupabaseConfigured) {
      const newService: Service = {
        ...serviceData,
        id: `srv_${Math.random().toString(36).substr(2, 9)}`,
        business_id: businessId,
        created_at: new Date().toISOString()
      };
      
      const currentList = get().services;
      const updatedList = [...currentList, newService].sort((a, b) => 
        a.nombre.localeCompare(b.nombre)
      );
      
      localStorage.setItem(`services_${businessId}`, JSON.stringify(updatedList));
      set({ services: updatedList, loading: false });
      return true;
    }
    
    try {
      const { data, error } = await supabase
        .from('services')
        .insert({
          ...serviceData,
          business_id: businessId
        })
        .select()
        .single();
        
      if (error) throw error;
      
      const currentList = get().services;
      const updatedList = [...currentList, data as Service].sort((a, b) => 
        a.nombre.localeCompare(b.nombre)
      );
      
      set({ services: updatedList, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },
  
  updateService: async (id, updated) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    set({ loading: true, error: null });
    
    if (!isSupabaseConfigured) {
      const updatedList = get().services.map(s => 
        s.id === id ? { ...s, ...updated } : s
      ).sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      localStorage.setItem(`services_${businessId}`, JSON.stringify(updatedList));
      set({ services: updatedList, loading: false });
      return true;
    }
    
    try {
      const { error } = await supabase
        .from('services')
        .update(updated)
        .eq('id', id);
        
      if (error) throw error;
      
      const updatedList = get().services.map(s => 
        s.id === id ? { ...s, ...updated } : s
      ).sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      set({ services: updatedList, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },
  
  deleteService: async (id) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    set({ loading: true, error: null });
    
    if (!isSupabaseConfigured) {
      const updatedList = get().services.filter(s => s.id !== id);
      localStorage.setItem(`services_${businessId}`, JSON.stringify(updatedList));
      set({ services: updatedList, loading: false });
      return true;
    }
    
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      const updatedList = get().services.filter(s => s.id !== id);
      set({ services: updatedList, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));
