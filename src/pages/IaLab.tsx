import { useState, useRef, useEffect } from 'react';
import { aiLabService } from '../services/api';
import type { ChatMessage, ExecutedTool } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useCustomerStore } from '../stores/customerStore';
import { useChatStore } from '../stores/chatStore';
import { 
  Send, 
  Bot, 
  Sparkles, 
  AlertCircle, 
  CheckCircle,
  Database,
  Terminal,
  Activity,
  Wifi,
  WifiOff,
  Phone,
  UserCheck,
  Zap,
  Layers,
  Cpu,
  CornerDownRight,
  CheckCheck
} from 'lucide-react';

export const IaLab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // WhatsApp Simulated Client Details
  const [simulatedPhone, setSimulatedPhone] = useState<string>('34611222333');
  const [simulatedName, setSimulatedName] = useState<string>('Carlos García');

  // Ollama Connection State
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [ollamaModel, setOllamaModel] = useState<string>('qwen3:8b');
  const businessId = useAuthStore((s) => s.businessId);

  // Console execution details (Dynamic Metrics!)
  const [processingTime, setProcessingTime] = useState<string>('0.0s');
  const [promptLength, setPromptLength] = useState<number>(0);
  const [executedTools, setExecutedTools] = useState<ExecutedTool[]>([]);
  const [showConsole] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Poll local Ollama status
  useEffect(() => {
    const checkStatus = async () => {
      const res = await aiLabService.checkOllamaHealth();
      setOllamaConnected(res.ollamaConnected);
      setOllamaModel(res.model);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Seed initial greeting message
    setMessages([
      { 
        role: 'assistant', 
        content: '¡Hola! Soy BarberLozz Assistant, tu recepcionista virtual inteligente de WhatsApp. Puedes simular el número de teléfono y nombre del remitente arriba en el panel de simulador. Prueba a preguntar "¿Hay hueco mañana?" o pedir "Apúntame mañana a las 10:00" para simular el flujo real de WhatsApp.' 
      }
    ]);
  }, [simulatedPhone]); // Reset local view greeting when switching simulated numbers

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText;
    setInputText('');
    setError(null);
    setLoading(true);

    const startTime = performance.now();

    // 1. Append user message to local state immediately
    const newUserMessage: ChatMessage = { role: 'user', content: userText };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // 2. Call backend WhatsApp Simulation Endpoint passing phone and name
      const response = await aiLabService.sendWhatsAppMessage({
        phone: simulatedPhone,
        name: simulatedName,
        message: userText,
        source: 'laboratory',
        business_id: businessId,
        channel: 'LABORATORIO'
      });

      // Calculate processing time
      const endTime = performance.now();
      setProcessingTime(((endTime - startTime) / 1000).toFixed(1) + 's');
      
      // Calculate fake/simulated tokens/prompt length
      setPromptLength(userText.length * 4 + 420);

      // 3. Update messages history returned from backend (phone's persistent thread!)
      setMessages(response.messages);
      
      // 4. Update the real-time executed tools console
      if (response.executedTools && response.executedTools.length > 0) {
        setExecutedTools(prev => [...response.executedTools, ...prev]);
      }

      // 5. If a real appointment or conversation was created, refresh stores
      if (response.createdAppointment) {
        useAppointmentStore.getState().fetchAppointments();
        useCustomerStore.getState().fetchCustomers();
      }
      if (response.conversation_id) {
        useChatStore.getState().fetchConversations();
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al procesar el mensaje.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      { 
        role: 'assistant', 
        content: `Chat de WhatsApp para el número +${simulatedPhone} reiniciado. ¿En qué te puedo ayudar hoy?` 
      }
    ]);
    setExecutedTools([]);
    setError(null);
    setProcessingTime('0.0s');
    setPromptLength(0);
  };

  const formatJSON = (val: any) => {
    try {
      return JSON.stringify(val, null, 2);
    } catch (e) {
      return String(val);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col lg:flex-row bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm animate-fade-in w-full max-w-full">
      
      {/* 1. WHATSAPP WEBHOOK SIMULATOR & THREAD (LEFT & CENTER PANELS COMBINED) */}
      <section className="flex-1 flex flex-col min-w-0 bg-[#F5F5F7]">
        
        {/* Header Ribbon */}
        <header className="bg-white border-b border-neutral-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-black m-0">Simulador de WhatsApp</h2>
              <p className="text-xs text-neutral-400 m-0 mt-0.5 font-semibold truncate max-w-full">Integración Nativa por Número de Teléfono (Webhook)</p>
            </div>
          </div>

          {/* Connection Pill */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold shrink-0 ${
              ollamaConnected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {ollamaConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
                  <span className="hidden sm:inline">Ollama conectado ({ollamaModel})</span>
                  <span className="sm:hidden">{ollamaModel}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
                  <span>Desconectado</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* SIMULATOR CONFIGURATION SUB-BAR */}
        <div className="bg-neutral-900 text-white px-3 md:px-6 py-3.5 flex flex-col sm:flex-row items-center gap-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider shrink-0">
            <Terminal className="w-4 h-4 text-emerald-500" />
            <span>Remitente WhatsApp:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto flex-1 min-w-0">
            <div className="relative">
              <Phone className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={simulatedPhone}
                onChange={(e) => setSimulatedPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                placeholder="Teléfono (Ej: +34600111222)"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="relative">
              <UserCheck className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={simulatedName}
                onChange={(e) => setSimulatedName(e.target.value)}
                placeholder="Nombre de contacto (Ej: Pedro)"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleClearChat}
            className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 font-extrabold rounded-lg text-xs cursor-pointer transition-colors border border-red-900/50 whitespace-nowrap self-stretch sm:self-center"
          >
            Vaciar Hilo (+{simulatedPhone})
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#EDE6D9]/40" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/143831828-56ccf6e1-fd54-4aa9-a9a3-5e917d5e46be.png")', backgroundSize: 'contain' }}>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-start gap-3 text-base shadow-sm">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Error de Conexión</span>
                {error}
                <p className="text-xs text-red-500 m-0 mt-1 font-semibold">
                  Comprueba que tienes Ollama levantado con Qwen 3 (<code>ollama run qwen3:8b</code>) y que has iniciado tu servidor local con <code>npm run dev</code> en la carpeta server.
                </p>
              </div>
            </div>
          )}

          {messages
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-1 relative ${
                      isUser 
                        ? 'bg-[#E1F3D4] text-black rounded-tr-none' 
                        : 'bg-white text-black rounded-tl-none'
                    }`}
                  >
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                      {isUser ? simulatedName : 'RECEPCIONISTA IA (WHATSAPP)'}
                    </span>
                    <p className="text-[15px] m-0 leading-normal font-semibold whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-neutral-400 self-end mt-0.5">
                      <span>12:00</span>
                      <CheckCheck className="w-4 h-4 text-[#53bdeb] shrink-0" />
                    </div>
                  </div>
                </div>
              );
            })}

          {loading && (
            <div className="flex w-full justify-start animate-pulse">
              <div className="bg-white text-neutral-500 rounded-2xl rounded-tl-none px-4 py-3.5 shadow-sm text-sm font-bold flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-600 animate-spin" />
                <span>Ollama está respondiendo al WhatsApp de +{simulatedPhone}...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input box form */}
        <footer className="bg-white p-3 md:p-4 border-t border-neutral-200 shrink-0">
          <form onSubmit={handleSend} className="flex gap-2 w-full">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              placeholder={`Mensaje desde +${simulatedPhone}...`}
              className="flex-1 min-w-0 px-4 py-3 md:py-4 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base text-black font-semibold disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 md:p-4 rounded-xl flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-emerald-500 shrink-0"
              title="Enviar mensaje de simulación"
            >
              <Send className="w-5 h-5 md:w-6 md:h-6 stroke-[2]" />
            </button>
          </form>
        </footer>
      </section>

      {/* 2. ADVANCED DEVELOPER CONSOLE & TOOL LOGGER (RIGHT PANEL) */}
      <section className={`w-full lg:w-[450px] shrink-0 bg-[#121212] text-[#e0e0e0] font-mono flex flex-col border-t lg:border-t-0 lg:border-l border-neutral-800 max-h-[40vh] lg:max-h-none ${showConsole ? 'flex' : 'hidden'}`}>
        
        {/* Console Header */}
        <header className="p-4 border-b border-neutral-800 bg-[#1a1a1a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-gold">
            <Terminal className="w-5 h-5" />
            <span className="font-black text-xs uppercase tracking-widest">Raycast AI Console</span>
          </div>
          <span className="text-[10px] bg-neutral-800 text-neutral-400 font-bold px-2 py-1 rounded-md">LOGS EN VIVO</span>
        </header>

        {/* Dynamic Vercel/Raycast Stats ribbon */}
        <div className="grid grid-cols-3 gap-px bg-neutral-800 text-center text-[10px] text-neutral-400 font-bold uppercase tracking-wider shrink-0 border-b border-neutral-800">
          <div className="bg-[#161616] py-3 space-y-1">
            <span className="block text-neutral-500 text-[9px]">Modelo</span>
            <span className="text-white flex items-center justify-center gap-1 font-mono">
              <Cpu className="w-3.5 h-3.5 text-gold" />
              qwen3:8b
            </span>
          </div>
          <div className="bg-[#161616] py-3 space-y-1">
            <span className="block text-neutral-500 text-[9px]">Latencia</span>
            <span className="text-emerald-500 flex items-center justify-center gap-1 font-mono">
              <Zap className="w-3.5 h-3.5" />
              {processingTime}
            </span>
          </div>
          <div className="bg-[#161616] py-3 space-y-1">
            <span className="block text-neutral-500 text-[9px]">Prompt</span>
            <span className="text-white flex items-center justify-center gap-1 font-mono">
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              {promptLength} tok
            </span>
          </div>
        </div>

        {/* Terminal logs feed with beautiful custom check tools */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          <div className="text-neutral-500 border-b border-neutral-800 pb-2 mb-2">
            # Logs de Function Calling y respuestas JSON generados por el webhook en Ollama:
          </div>

          {executedTools.length === 0 ? (
            <div className="text-center py-24 text-neutral-600 space-y-2">
              <Activity className="w-8 h-8 mx-auto opacity-20 animate-pulse" />
              <div className="font-semibold text-xs uppercase tracking-wider">Esperando transacciones...</div>
            </div>
          ) : (
            executedTools.map((tool, idx) => (
              <div key={idx} className="bg-[#1a1a1a] rounded-xl border border-neutral-800 overflow-hidden shadow-sm">
                
                {/* Tool call header */}
                <div className="bg-[#222] px-4 py-2.5 flex items-center justify-between text-[11px] font-bold border-b border-neutral-800">
                  <div className="flex items-center gap-1.5 text-gold-dark font-mono">
                    <Database className="w-4 h-4 text-gold shrink-0" />
                    <span>🟢 {tool.functionName}()</span>
                  </div>
                  <span className="text-emerald-500 font-mono flex items-center gap-0.5 text-[10px]">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    Success
                  </span>
                </div>

                {/* Tool arguments and returned value */}
                <div className="p-4 space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[#85c1e9] font-black block flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                      {"// Parámetros JSON:"}
                    </span>
                    <pre className="bg-[#121212] p-3 rounded-lg overflow-x-auto text-[#e5c07b] font-mono leading-relaxed border border-neutral-900 shadow-inner">
                      {formatJSON(tool.args)}
                    </pre>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#82e0aa] font-black block flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                      {"// Resultado de Base de Datos:"}
                    </span>
                    <pre className="bg-[#121212] p-3 rounded-lg overflow-x-auto text-[#98c379] font-mono leading-relaxed border border-neutral-900 shadow-inner">
                      {formatJSON(tool.result)}
                    </pre>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
