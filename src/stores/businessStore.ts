import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { BACKEND_URL } from '../config/backend';
import type { Business } from '../types';
import { useAuthStore } from './authStore';

interface BusinessState {
  business: Business | null;
  loading: boolean;
  error: string | null;
  
  fetchBusiness: () => Promise<void>;
  updateBusiness: (updated: Partial<Business>) => Promise<boolean>;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  business: null,
  loading: false,
  error: null,
  
  fetchBusiness: async () => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return;
    
    set({ loading: true, error: null });
    
    try {
      // 1. Fetch from businesses with settings join
      const { data, error } = await supabase
        .from('businesses')
        .select('*, settings(*)')
        .eq('id', businessId)
        .single();
        
      if (error) throw error;
      
      const settingsRow = Array.isArray(data.settings) ? data.settings[0] : data.settings;

      const mapped: Business = {
        id: data.id,
        nombre: data.nombre,
        logo_url: data.logo_url,
        telefono: data.telefono,
        email: data.email,
        direccion: data.direccion,
        horarios: settingsRow?.horarios || {
          start: '09:00',
          end: '20:30',
          open_days: [1, 2, 3, 4, 5, 6]
        },
        configuracion_ia: settingsRow?.configuracion_ia || {
          custom_prompt: 'Eres el recepcionista virtual. Hablas muy cercano y breve.',
          greeting: '¡Hola! ¿En qué puedo ayudarte?',
          ai_enabled: true
        },
        created_at: data.created_at
      };

      set({ business: mapped, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
  
  updateBusiness: async (updated) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    set({ loading: true, error: null });
    
    try {
      // 1. Update businesses table fields
      const bizFields = {
        nombre: updated.nombre,
        logo_url: updated.logo_url,
        telefono: updated.telefono,
        email: updated.email,
        direccion: updated.direccion
      };
      
      // Filter out undefined keys
      const cleanBizFields = Object.fromEntries(
        Object.entries(bizFields).filter(([_, v]) => v !== undefined)
      );

      if (Object.keys(cleanBizFields).length > 0) {
        const { error: bizErr } = await supabase
          .from('businesses')
          .update(cleanBizFields)
          .eq('id', businessId);
          
        if (bizErr) throw bizErr;
      }

      // 2. Update settings table fields (upsert)
      const settingsFields: any = {};
      if (updated.horarios) settingsFields.horarios = updated.horarios;
      if (updated.configuracion_ia) settingsFields.configuracion_ia = updated.configuracion_ia;

      if (Object.keys(settingsFields).length > 0) {
        const { error: settingsErr } = await supabase
          .from('settings')
          .upsert({
            business_id: businessId,
            ...settingsFields
          }, { onConflict: 'business_id' });
          
        if (settingsErr) throw settingsErr;
      }

      // Sync settings to the local Ollama backend on port 4000
      try {
        const current = get().business;
        const merged = { ...current, ...updated };
        await fetch(`${BACKEND_URL}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: merged.nombre,
            phone_whatsapp: merged.telefono,
            default_service_duration: 30,
            open_days: merged.horarios?.open_days || [1,2,3,4,5,6],
            business_hours: { start: merged.horarios?.start || '09:00', end: merged.horarios?.end || '20:30' }
          })
        });
      } catch (e) {}

      await get().fetchBusiness();
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));
