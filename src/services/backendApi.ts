import { isSupabaseConfigured } from './supabase';
import { BACKEND_URL } from '../config/backend';

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
  },

  updateService: async (id: string, data: Record<string, any>) => {
    if (!isUUID(id)) return null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  createService: async (data: Record<string, any>) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  deleteService: async (id: string) => {
    if (!isUUID(id)) return null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/services/${id}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch { return false; }
  }
};
