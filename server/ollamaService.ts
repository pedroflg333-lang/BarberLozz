// Ollama Integration Service for BarberLozz Manager (qwen3:8b Local Migration)
import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_HOST = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export const OllamaService = {
  /**
   * Verifies if the local Ollama service is reachable and the model exists
   */
  isAvailable: async (): Promise<{ connected: boolean; modelExists: boolean }> => {
    const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    const host = process.env.OLLAMA_BASE_URL || OLLAMA_HOST;
    try {
      const response = await fetch(`${host}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // Timeout after 2s
      });
      if (!response.ok) return { connected: false, modelExists: false };
      const data = await response.json();
      const modelExists = data.models?.some((m: any) => m.name === model || m.name.startsWith(model));
      return { connected: true, modelExists: !!modelExists };
    } catch (e) {
      return { connected: false, modelExists: false };
    }
  },

  /**
   * Sends chat message list to Ollama's local endpoint
   */
  chat: async (messages: ChatMessage[], tools?: any[]): Promise<any> => {
    const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    const host = process.env.OLLAMA_BASE_URL || OLLAMA_HOST;
    
    const body: any = {
      model,
      messages: messages.map(msg => {
        const m: any = { role: msg.role, content: msg.content };
        if (msg.tool_calls) m.tool_calls = msg.tool_calls;
        if (msg.tool_call_id) m.tool_call_id = msg.tool_call_id;
        if (msg.name) m.name = msg.name;
        return m;
      }),
      stream: false
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    try {
      const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama Server Error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      
      const message = data.message;
      
      if (message && message.tool_calls) {
        message.tool_calls = message.tool_calls.map((tc: any) => {
          const id = tc.id || `call_${Math.random().toString(36).substr(2, 9)}`;
          return {
            id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: typeof tc.function.arguments === 'string' 
                ? tc.function.arguments 
                : JSON.stringify(tc.function.arguments)
            }
          };
        });
      }

      return {
        choices: [
          {
            message: {
              role: message.role,
              content: message.content || '',
              tool_calls: message.tool_calls || null
            }
          }
        ]
      };
    } catch (e: any) {
      console.error('Error in OllamaService.chat:', e);
      throw e;
    }
  }
};
export { OLLAMA_HOST, DEFAULT_MODEL };
