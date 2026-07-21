import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import type { Profile } from '../types';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  businessId: string | null;
  loading: boolean;
  error: string | null;
  
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string, businessName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  init: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  businessId: null,
  loading: true,
  error: null,
  
  clearError: () => set({ error: null }),
  
  init: async () => {
    set({ loading: true, error: null });
    
    if (!isSupabaseConfigured) {
      // Offline/Mock mode
      const cachedSession = localStorage.getItem('barber_session');
      if (cachedSession) {
        try {
          const { user, profile } = JSON.parse(cachedSession);
          set({ 
            user, 
            profile, 
            businessId: profile.business_id, 
            loading: false 
          });
          return;
        } catch (e) {
          localStorage.removeItem('barber_session');
        }
      }
      
      // Seed default session if nothing cached for mock mode
      const defaultProfile: Profile = {
        id: 'mock_user_id',
        business_id: 'bs_barberlozz',
        full_name: 'Barber Master',
        role: 'admin',
        created_at: new Date().toISOString()
      };
      
      const defaultUser = {
        id: 'mock_user_id',
        email: 'barber@lozz.com',
        email_confirmed_at: new Date().toISOString()
      };
      
      set({ 
        user: defaultUser, 
        profile: defaultProfile, 
        businessId: 'bs_barberlozz', 
        loading: false 
      });
      return;
    }
    
    try {
      // Real Supabase Auth Initial check
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileErr) throw profileErr;
        
        set({ 
          user: session.user, 
          profile: profileData as Profile, 
          businessId: profileData?.business_id || null,
          loading: false 
        });
      } else {
        set({ user: null, profile: null, businessId: null, loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
  
  signIn: async (email, password) => {
    set({ loading: true, error: null });
    
    if (!isSupabaseConfigured) {
      // Mock sign in
      if (email && password.length >= 4) {
        const mockProfile: Profile = {
          id: 'mock_user_id',
          business_id: 'bs_barberlozz',
          full_name: 'Barber Master',
          role: 'admin',
          created_at: new Date().toISOString()
        };
        const mockUser = { id: 'mock_user_id', email };
        
        localStorage.setItem('barber_session', JSON.stringify({ user: mockUser, profile: mockProfile }));
        set({ user: mockUser, profile: mockProfile, businessId: 'bs_barberlozz', loading: false });
        return true;
      } else {
        set({ error: 'Credenciales inválidas (mínimo 4 caracteres en contraseña)', loading: false });
        return false;
      }
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      if (data.user) {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (profileErr) throw profileErr;
        
        set({ 
          user: data.user, 
          profile: profileData as Profile, 
          businessId: profileData?.business_id || null,
          loading: false 
        });
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },
  
  signUp: async (email, password, fullName, businessName) => {
    set({ loading: true, error: null });
    
    if (!isSupabaseConfigured) {
      // Mock Sign Up
      const businessId = `bs_${Math.random().toString(36).substr(2, 9)}`;
      const userId = `usr_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store new business & profile in localStorage simulated db
      const newBusiness = {
        id: businessId,
        name: businessName,
        logo_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&auto=format&fit=crop&q=80',
        primary_color: '#D4AF37',
        secondary_color: '#111111',
        phone_whatsapp: '',
        default_service_duration: 30,
        open_days: [1,2,3,4,5,6],
        business_hours: { start: '09:00', end: '20:00' },
        created_at: new Date().toISOString()
      };
      
      const newProfile: Profile = {
        id: userId,
        business_id: businessId,
        full_name: fullName,
        role: 'admin',
        created_at: new Date().toISOString()
      };
      
      const newUser = { id: userId, email };
      
      localStorage.setItem(`business_${businessId}`, JSON.stringify(newBusiness));
      localStorage.setItem('barber_session', JSON.stringify({ user: newUser, profile: newProfile }));
      
      set({ user: newUser, profile: newProfile, businessId, loading: false });
      return true;
    }
    
    try {
      // 1. Sign up the user in Supabase Auth
      const { data, error: signUpErr } = await supabase.auth.signUp({ email, password });
      if (signUpErr) throw signUpErr;
      
      if (!data.user) throw new Error('No se pudo crear el usuario.');
      
      // 2. Create the business in businesses
      const { data: businessData, error: bizErr } = await supabase
        .from('businesses')
        .insert({
          nombre: businessName,
          logo_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&auto=format&fit=crop&q=80',
          horarios: {
            start: '09:00',
            end: '20:30',
            open_days: [1, 2, 3, 4, 5, 6]
          },
          configuracion_ia: {
            custom_prompt: 'Eres el recepcionista virtual de la peluquería.',
            greeting: '¡Hola! ¿En qué puedo ayudarte?',
            ai_enabled: true
          }
        })
        .select()
        .single();
        
      if (bizErr) throw bizErr;
      
      // 3. Create the user profile linked to the business
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          business_id: businessData.id,
          full_name: fullName,
          role: 'admin'
        });
        
      if (profileErr) throw profileErr;
      
      // 4. Update store state
      const userProfile: Profile = {
        id: data.user.id,
        business_id: businessData.id,
        full_name: fullName,
        role: 'admin',
        created_at: new Date().toISOString()
      };
      
      set({ 
        user: data.user, 
        profile: userProfile, 
        businessId: businessData.id,
        loading: false 
      });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },
  
  signOut: async () => {
    set({ loading: true });
    if (!isSupabaseConfigured) {
      localStorage.removeItem('barber_session');
      set({ user: null, profile: null, businessId: null, loading: false });
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    set({ user: null, profile: null, businessId: null, loading: false });
  },
  
  resetPassword: async (email) => {
    set({ loading: true, error: null });
    if (!isSupabaseConfigured) {
      // Mock reset password
      await new Promise(r => setTimeout(r, 800));
      set({ loading: false });
      return true;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/recovery`
      });
      if (error) throw error;
      set({ loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  }
}));
