import { isSupabaseConfigured } from './supabase';

const BACKEND_URL = 'http://localhost:4000';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const backendApi = {
  isAvailable: () => isSupabaseConfigured,

  getAppointments: async (businessId: string) => {
    if (!isUUID(businessId)) return null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/business/${businessId}/appointments`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  getConversations: async (businessId: string) => {
    if (!isUUID(businessId)) return null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/business/${businessId}/conversations`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  getMessages: async (conversationId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations/${conversationId}/messages`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  getCustomers: async (businessId: string) => {
    if (!isUUID(businessId)) return null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/business/${businessId}/customers`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  getServices: async (businessId: string) => {
    if (!isUUID(businessId)) return null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/business/${businessId}/services`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  getEmployees: async (businessId: string) => {
    if (!isUUID(businessId)) return null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/business/${businessId}/employees`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }
};
