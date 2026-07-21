import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import type { Conversation, WhatsAppMessage } from '../types';
import { mockConversations, mockWhatsAppMessages } from '../services/mockData';
import { useAuthStore } from './authStore';
import { useCustomerStore } from './customerStore';

interface ChatState {
  conversations: Conversation[];
  messages: { [conversationId: string]: WhatsAppMessage[] };
  activeConversationId: string | null;
  whatsappConnected: boolean;
  loading: boolean;
  error: string | null;
  
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<boolean>;
  takeoverConversation: (conversationId: string) => Promise<boolean>;
  resolveConversation: (conversationId: string) => Promise<boolean>;
  setActiveConversationId: (id: string | null) => void;
  toggleWhatsappConnection: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  whatsappConnected: true, // Default active connection status
  loading: false,
  error: null,
  
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  toggleWhatsappConnection: () => set(state => ({ whatsappConnected: !state.whatsappConnected })),
  
  fetchConversations: async () => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return;
    
    set({ loading: true, error: null });
    
    if (!isSupabaseConfigured) {
      const key = `conversations_${businessId}`;
      const cached = localStorage.getItem(key);
      let list: Conversation[] = [];
      
      if (cached) {
        try { list = JSON.parse(cached); } catch (e) {}
      } else {
        list = businessId === 'bs_barberlozz' ? mockConversations : [];
        localStorage.setItem(key, JSON.stringify(list));
      }
      
      // Populate customer info
      const customers = useCustomerStore.getState().customers;
      if (customers.length === 0) await useCustomerStore.getState().fetchCustomers();
      
      const populated = list.map(conv => {
        const custs = useCustomerStore.getState().customers;
        return {
          ...conv,
          customer: custs.find(c => c.id === conv.customer_id)
        };
      });
      
      set({ conversations: populated, loading: false });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, customer:customers(*)')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      set({ conversations: data as Conversation[], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
  
  fetchMessages: async (conversationId) => {
    set({ loading: true, error: null });
    
    if (!isSupabaseConfigured) {
      const key = `messages_${conversationId}`;
      const cached = localStorage.getItem(key);
      let list: WhatsAppMessage[] = [];
      
      if (cached) {
        try { list = JSON.parse(cached); } catch (e) {}
      } else {
        list = mockWhatsAppMessages.filter(m => m.conversation_id === conversationId);
        localStorage.setItem(key, JSON.stringify(list));
      }
      
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        },
        loading: false
      }));
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: data as WhatsAppMessage[]
        },
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
  
  sendMessage: async (conversationId, content) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    if (!isSupabaseConfigured) {
      const newMessage: WhatsAppMessage = {
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: conversationId,
        direction: 'outgoing',
        content,
        type: 'text',
        status: 'sent',
        created_at: new Date().toISOString()
      };
      
      // Update local storage messages
      const key = `messages_${conversationId}`;
      const cached = localStorage.getItem(key);
      let list: WhatsAppMessage[] = [];
      if (cached) {
        try { list = JSON.parse(cached); } catch (e) {}
      }
      const updatedMessages = [...list, newMessage];
      localStorage.setItem(key, JSON.stringify(updatedMessages));
      
      // Update local storage conversations last message and timestamp
      const convKey = `conversations_${businessId}`;
      const cachedConvs = localStorage.getItem(convKey);
      if (cachedConvs) {
        try {
          const convList: Conversation[] = JSON.parse(cachedConvs);
          const updatedConvs = convList.map(c => 
            c.id === conversationId 
              ? { ...c, last_message: content, updated_at: new Date().toISOString() } 
              : c
          );
          localStorage.setItem(convKey, JSON.stringify(updatedConvs));
        } catch (e) {}
      }
      
      // Sync store
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages
        }
      }));
      
      await get().fetchConversations();
      return true;
    }
    
    try {
      // 1. Insert message
      const { error: msgErr } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          direction: 'outgoing',
          content,
          type: 'text',
          status: 'sent'
        });
        
      if (msgErr) throw msgErr;
      
      // 2. Update conversation header
      const { error: convErr } = await supabase
        .from('conversations')
        .update({
          last_message: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
        
      if (convErr) throw convErr;
      
      // Re-fetch
      await get().fetchMessages(conversationId);
      await get().fetchConversations();
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },
  
  takeoverConversation: async (conversationId) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    if (!isSupabaseConfigured) {
      const convKey = `conversations_${businessId}`;
      const cached = localStorage.getItem(convKey);
      if (cached) {
        try {
          const convList: Conversation[] = JSON.parse(cached);
          const updated = convList.map(c => 
            c.id === conversationId 
              ? { ...c, ai_enabled: false, status: 'human_needed' as const, updated_at: new Date().toISOString() } 
              : c
          );
          localStorage.setItem(convKey, JSON.stringify(updated));
        } catch (e) {}
      }
      await get().fetchConversations();
      return true;
    }
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          ai_enabled: false,
          status: 'human_needed',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
        
      if (error) throw error;
      await get().fetchConversations();
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },
  
  resolveConversation: async (conversationId) => {
    const businessId = useAuthStore.getState().businessId;
    if (!businessId) return false;
    
    if (!isSupabaseConfigured) {
      const convKey = `conversations_${businessId}`;
      const cached = localStorage.getItem(convKey);
      if (cached) {
        try {
          const convList: Conversation[] = JSON.parse(cached);
          const updated = convList.map(c => 
            c.id === conversationId 
              ? { ...c, ai_enabled: true, status: 'ai_resolved' as const, updated_at: new Date().toISOString() } 
              : c
          );
          localStorage.setItem(convKey, JSON.stringify(updated));
        } catch (e) {}
      }
      await get().fetchConversations();
      return true;
    }
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          ai_enabled: true,
          status: 'ai_resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
        
      if (error) throw error;
      await get().fetchConversations();
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  }
}));
