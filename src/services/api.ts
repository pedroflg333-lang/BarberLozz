const BACKEND_URL = 'http://localhost:4000';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ExecutedTool {
  functionName: string;
  args: any;
  result: any;
}

export interface ChatResponse {
  messages: ChatMessage[];
  executedTools: ExecutedTool[];
}

export const aiLabService = {
  /**
   * Sends the simulated WhatsApp message to our Node.js AI webhook server
   */
  sendWhatsAppMessage: async (payload: { phone: string; name: string; message: string; source: 'laboratory' }): Promise<ChatResponse> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: payload.phone,
          name: payload.name,
          message: payload.message,
          timestamp: new Date().toISOString(),
          source: payload.source
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor (${response.status})`);
      }

      return await response.json();
    } catch (e: any) {
      console.error('Error in aiLabService.sendWhatsAppMessage:', e);
      throw new Error(e.message || 'No se pudo conectar con el servidor del Laboratorio IA. Asegúrate de iniciar el servidor en el puerto 4000.');
    }
  },

  /**
   * Checks the health check status of the local Ollama connection
   */
  checkOllamaHealth: async (): Promise<{ ollamaConnected: boolean; model: string }> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      return { 
        ollamaConnected: data.ollamaConnected, 
        model: data.model 
      };
    } catch (e) {
      return { ollamaConnected: false, model: 'qwen3:8b' };
    }
  }
};
