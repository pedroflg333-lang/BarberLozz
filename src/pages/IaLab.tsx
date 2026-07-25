import { useState, useRef, useEffect } from 'react';
import { aiLabService } from '../services/api';
import type { ChatMessage, ExecutedTool } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useCustomerStore } from '../stores/customerStore';
import { useChatStore } from '../stores/chatStore';
import { Button, Badge } from '../ui';
import {
  Send, Bot, Sparkles, AlertCircle, CheckCircle,
  Database, Terminal, Activity, Wifi, WifiOff,
  Phone, UserCheck, Zap, Layers, Cpu,
  CheckCheck, ChevronDown, ChevronUp
} from 'lucide-react';

export const IaLab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [simulatedPhone, setSimulatedPhone] = useState<string>('34611222333');
  const [simulatedName, setSimulatedName] = useState<string>('Carlos García');

  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [ollamaModel, setOllamaModel] = useState<string>('qwen3:8b');
  const businessId = useAuthStore((s) => s.businessId);

  const [processingTime, setProcessingTime] = useState<string>('0.0s');
  const [promptLength, setPromptLength] = useState<number>(0);
  const [executedTools, setExecutedTools] = useState<ExecutedTool[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const res = await aiLabService.checkOllamaHealth();
      setOllamaConnected(res.ollamaConnected);
      setOllamaModel(res.model);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: '¡Hola! Soy BarberLozz Assistant, tu recepcionista virtual inteligente de WhatsApp. Puedes simular el número de teléfono y nombre del remitente arriba en el panel de simulador. Prueba a preguntar "¿Hay hueco mañana?" o pedir "Apúntame mañana a las 10:00" para simular el flujo real de WhatsApp.'
      }
    ]);
  }, [simulatedPhone]);

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

    const newUserMessage: ChatMessage = { role: 'user', content: userText };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await aiLabService.sendWhatsAppMessage({
        phone: simulatedPhone,
        name: simulatedName,
        message: userText,
        source: 'laboratory',
        business_id: businessId,
        channel: 'LABORATORIO'
      });

      const endTime = performance.now();
      setProcessingTime(((endTime - startTime) / 1000).toFixed(1) + 's');
      setPromptLength(userText.length * 4 + 420);

      setMessages(response.messages);

      if (response.executedTools && response.executedTools.length > 0) {
        setExecutedTools(prev => [...response.executedTools, ...prev]);
      }

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
      { role: 'assistant', content: `Chat de WhatsApp para el número +${simulatedPhone} reiniciado. ¿En qué te puedo ayudar hoy?` }
    ]);
    setExecutedTools([]);
    setError(null);
    setProcessingTime('0.0s');
    setPromptLength(0);
  };

  const formatJSON = (val: any) => {
    try { return JSON.stringify(val, null, 2); } catch (e) { return String(val); }
  };

  return (
    <div className="h-[calc(100dvh-140px)] md:h-[calc(100vh-100px)] flex flex-col lg:flex-row bg-surface border border-border rounded-2xl md:rounded-3xl overflow-hidden shadow-sm animate-fade-in">

      <section className="flex-1 flex flex-col min-w-0 bg-platinum">

        <header className="bg-surface border-b border-border px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="p-2 md:p-3 bg-emerald-600 text-white rounded-xl md:rounded-2xl shrink-0">
              <Sparkles className="w-4 h-5 md:w-6 md:h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm md:text-xl font-black text-text-primary m-0 truncate">WhatsApp Lab</h2>
              <p className="text-[10px] md:text-xs text-text-secondary m-0 mt-0.5 font-semibold truncate">Simulador de recepcionista IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={ollamaConnected ? 'success' : 'error'} size="sm" icon={ollamaConnected ? <Wifi className="w-3 h-4 animate-pulse" /> : <WifiOff className="w-3 h-4" />}>
              {ollamaConnected ? `Ollama (${ollamaModel})` : 'Off'}
            </Badge>
            <button onClick={() => setShowConsole(!showConsole)} className="p-1.5 md:p-2 hover:bg-neutral-100 rounded-lg cursor-pointer hidden lg:block">
              {showConsole ? <ChevronDown className="w-4 h-5" /> : <ChevronUp className="w-4 h-5" />}
            </button>
          </div>
        </header>

        <div className="bg-neutral-900 text-white px-3 md:px-6 py-2.5 md:py-3.5 flex flex-wrap items-center gap-2 border-b border-neutral-800 shrink-0">
          <span className="text-[10px] md:text-xs font-bold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Terminal className="w-3 h-4 text-emerald-500" />Simular:
          </span>
          <div className="relative flex-1 min-w-0 max-w-[140px] md:max-w-[200px]">
            <Phone className="w-3 h-4 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={simulatedPhone} onChange={e => setSimulatedPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="Teléfono"
              className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="relative flex-1 min-w-0 max-w-[120px] md:max-w-[180px]">
            <UserCheck className="w-3 h-4 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={simulatedName} onChange={e => setSimulatedName(e.target.value)} placeholder="Nombre"
              className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearChat} className="text-red-400 hover:bg-red-900/40 hover:text-red-400 border border-red-900/50 bg-red-950/40">
            Vaciar
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 bg-[#EDE6D9]/40" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/143831828-56ccf6e1-fd54-4aa9-a9a3-5e917d5e46be.png")', backgroundSize: 'contain' }}>

          {error && (
            <div className="bg-error-bg border border-error-border text-error p-3 md:p-4 rounded-xl md:rounded-2xl flex items-start gap-2 md:gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-xs md:text-sm">Error</span>
                <span className="text-xs">{error}</span>
              </div>
            </div>
          )}

          {messages.filter(msg => msg.role === 'user' || msg.role === 'assistant').map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div key={index} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] md:max-w-[70%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 shadow-sm flex flex-col gap-1 relative ${
                  isUser ? 'bg-[#E1F3D4] text-text-primary rounded-tr-none' : 'bg-surface text-text-primary rounded-tl-none'
                }`}>
                  <span className="block text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
                    {isUser ? simulatedName : 'RECEPCIONISTA IA'}
                  </span>
                  <p className="text-sm md:text-[15px] m-0 leading-normal font-semibold whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center justify-end gap-1 text-[8px] md:text-[9px] text-text-tertiary self-end mt-0.5">
                    <CheckCheck className="w-3 h-4 text-[#53bdeb] shrink-0" />
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex w-full justify-start animate-pulse">
              <div className="bg-surface text-text-secondary rounded-2xl rounded-tl-none px-3 md:px-4 py-3 shadow-sm text-xs md:text-sm font-bold flex items-center gap-2">
                <Bot className="w-4 h-5 text-emerald-600 animate-spin" />Respondiendo...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <footer className="bg-surface p-3 md:p-4 border-t border-border shrink-0">
          <form onSubmit={handleSend} className="flex gap-2">
            <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} disabled={loading}
              placeholder={`Mensaje desde +${simulatedPhone}...`}
              className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-text-primary font-semibold disabled:opacity-50" />
            <Button type="submit" variant="primary" disabled={loading || !inputText.trim()} className="bg-emerald-600 hover:bg-emerald-700 p-3" icon={<Send className="w-5 h-5" />} />
          </form>
        </footer>
      </section>

      <section className={`w-full lg:w-[400px] shrink-0 bg-[#121212] text-[#e0e0e0] font-mono flex flex-col border-t lg:border-t-0 lg:border-l border-neutral-800 ${showConsole ? 'max-h-[50vh] lg:max-h-none' : 'hidden'} lg:flex`}>

        <header className="p-3 md:p-4 border-b border-neutral-800 bg-[#1a1a1a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-gold">
            <Terminal className="w-4 h-5" />
            <span className="font-black text-[10px] md:text-xs uppercase tracking-widest">Console</span>
          </div>
          <button onClick={() => setShowConsole(false)} className="text-neutral-500 hover:text-white cursor-pointer lg:hidden"><ChevronDown className="w-4 h-5" /></button>
        </header>

        <div className="grid grid-cols-3 gap-px bg-neutral-800 text-center text-[9px] md:text-[10px] text-neutral-400 font-bold uppercase tracking-wider shrink-0 border-b border-neutral-800">
          <div className="bg-[#161616] py-2 md:py-3 space-y-1">
            <span className="block text-neutral-500">Modelo</span>
            <span className="text-white flex items-center justify-center gap-1 font-mono"><Cpu className="w-3 h-4 text-gold" />{ollamaModel}</span>
          </div>
          <div className="bg-[#161616] py-2 md:py-3 space-y-1">
            <span className="block text-neutral-500">Latencia</span>
            <span className="text-emerald-500 flex items-center justify-center gap-1 font-mono"><Zap className="w-3 h-4" />{processingTime}</span>
          </div>
          <div className="bg-[#161616] py-2 md:py-3 space-y-1">
            <span className="block text-neutral-500">Prompt</span>
            <span className="text-white flex items-center justify-center gap-1 font-mono"><Layers className="w-3 h-4 text-neutral-500" />{promptLength} tok</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3 md:space-y-4 text-xs">
          <div className="text-neutral-500 border-b border-neutral-800 pb-2 mb-2 text-[10px] md:text-xs"># Function Calls:</div>

          {executedTools.length === 0 ? (
            <div className="text-center py-12 md:py-24 text-neutral-600 space-y-2">
              <Activity className="w-6 h-7 md:w-8 md:h-8 mx-auto opacity-20 animate-pulse" />
              <div className="font-semibold text-[10px] md:text-xs uppercase tracking-wider">Waiting...</div>
            </div>
          ) : (
            executedTools.map((tool, idx) => (
              <div key={idx} className="bg-[#1a1a1a] rounded-xl border border-neutral-800 overflow-hidden">
                <div className="bg-[#222] px-3 md:px-4 py-2 flex items-center justify-between text-[10px] md:text-[11px] font-bold border-b border-neutral-800">
                  <div className="flex items-center gap-1.5 text-gold-dark font-mono">
                    <Database className="w-3 h-4 text-gold shrink-0" />
                    <span className="truncate">{tool.functionName}()</span>
                  </div>
                  <span className="text-emerald-500 font-mono flex items-center gap-0.5 shrink-0">
                    <CheckCircle className="w-3 h-4 shrink-0" />OK
                  </span>
                </div>
                <div className="p-2 md:p-4 space-y-2 md:space-y-3.5">
                  <pre className="bg-[#121212] p-2 md:p-3 rounded-lg overflow-x-auto text-[10px] md:text-xs text-[#e5c07b] font-mono leading-relaxed border border-neutral-900 shadow-inner max-h-[120px] overflow-y-auto">{formatJSON(tool.args)}</pre>
                  <pre className="bg-[#121212] p-2 md:p-3 rounded-lg overflow-x-auto text-[10px] md:text-xs text-[#98c379] font-mono leading-relaxed border border-neutral-900 shadow-inner max-h-[120px] overflow-y-auto">{formatJSON(tool.result)}</pre>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
