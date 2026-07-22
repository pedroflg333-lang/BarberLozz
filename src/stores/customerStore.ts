import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { backendApi } from '../services/backendApi';
import type { Customer } from '../types';
import { useAuthStore } from './authStore';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'business_id' | 'fecha_registro' | 'numero_visitas' | 'gasto_total' | 'servicio_favorito' | 'ultima_visita'> & Partial<Pick<Customer, 'numero_visitas' | 'gasto_total' | 'servicio_favorito' | 'ultima_visita'>>) => Promise<Customer | null>;
  updateCustomer: (id: string, updated: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  loading: false,
  error: null,
  
  fetchCustomers: async () => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return;
    
    set({ loading: true, error: null });
    
    // Use backend proxy (bypasses RLS)
    if (isUUID(businessId) && backendApi.isAvailable()) {
      const data = await backendApi.getCustomers(businessId);
      if (data !== null) {
        set({ customers: data as Customer[], loading: false });
        return;
      }
    }
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('nombre', { ascending: true });
        
      if (error) throw error;
      set({ customers: (data as Customer[]) || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
  
  addCustomer: async (customerData) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return null;
    
    set({ loading: true, error: null });
    
    const defaults = {
      numero_visitas: 0,
      gasto_total: 0,
      servicio_favorito: null,
      ultima_visita: null,
      ...customerData
    };
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...defaults,
          business_id: businessId
        })
        .select()
        .single();
        
      if (error) throw error;
      
      await get().fetchCustomers();
      return data as Customer;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },
  
  updateCustomer: async (id, updated) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    set({ loading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('customers')
        .update(updated)
        .eq('id', id);
        
      if (error) throw error;
      
      await get().fetchCustomers();
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },
  
  deleteCustomer: async (id) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    set({ loading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      await get().fetchCustomers();
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));
