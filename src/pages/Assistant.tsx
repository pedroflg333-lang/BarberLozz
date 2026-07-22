import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../stores/chatStore';
import { useBusinessStore } from '../stores/businessStore';
import { 
  Send, 
  MessageSquare, 
  Bot, 
  ShieldAlert, 
  AlertCircle, 
  Sparkles, 
  CheckCheck,
  Terminal,
  TrendingUp,
  Save,
  ShieldCheck,
  Database,
  X,
  Clock,
  Scissors
} from 'lucide-react';

export const Assistant: React.FC = () => {
  const navigate = useNavigate();
  const { 
    conversations, 
    messages, 
    activeConversationId, 
    fetchConversations, 
    fetchMessages, 
    sendMessage, 
    takeoverConversation, 
    resolveConversation,
    setActiveConversationId 
  } = useChatStore();

  const { business, fetchBusiness, updateBusiness } = useBusinessStore();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<'conversaciones' | 'config' | 'historial' | 'stats'>('conversaciones');

  // Local Form states for AI Config
  const [greeting, setGreeting] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Connection Test States
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; model?: string } | null>(null);

  const handleTestConnection = async () => {
    setTestingConn(true);
    setTestResult(null);
    try {
      const response = await fetch('http://localhost:4000/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTestResult({
        success: data.success,
        latencyMs: data.latencyMs,
        model: data.model
      });
    } catch (e) {
      setTestResult({ success: false });
    } finally {
      setTestingConn(false);
    }
  };

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchBusiness();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchBusiness]);

  useEffect(() => {
    if (business) {
      setGreeting(business.configuracion_ia?.greeting || '');
      setCustomPrompt(business.configuracion_ia?.custom_prompt || '');
      setAiEnabled(business.configuracion_ia?.ai_enabled !== false);
    }
  }, [business]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  const handleSelectConv = (convId: string) => {
    setActiveConversationId(convId);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversationId) return;

    const text = inputText;
    setInputText('');
    await sendMessage(activeConversationId, text);
  };

  const handleTakeover = async (convId: string) => {
    await takeoverConversation(convId);
  };

  const handleResolve = async (convId: string) => {
    await resolveConversation(convId);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const success = await updateBusiness({
      configuracion_ia: {
        custom_prompt: customPrompt,
        greeting,
        ai_enabled: aiEnabled
      }
    });

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Find currently active conversation
  const safeConversations = conversations ?? [];
  const activeConv = safeConversations.find(c => c.id === activeConversationId);
  const activeConvMessages = activeConversationId ? ((messages ?? {})[activeConversationId] || []) : [];

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'human_needed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-extrabold border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Intervención humana
          </span>
        );
      case 'ai_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 animate-pulse">
            <Bot className="w-3.5 h-3.5 text-amber-500" />
            Atendiendo por IA...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Resuelto por IA
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header and Category Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-2 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-black m-0">Recepcionista IA</h1>
          <p className="text-neutral-500 m-0 mt-1 font-semibold text-sm">Gestiona conversaciones, configura la personalidad y analiza el rendimiento de tu asistente.</p>
        </div>

        {/* Sub-Tabs ribbon */}
        <div className="flex bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200 gap-1 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('conversaciones'); setActiveConversationId(null); }}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'conversaciones' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Conversaciones
          </button>
          
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'config' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Configuración IA
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'historial' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Historial / Estado
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'stats' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Estadísticas
          </button>
        </div>
      </div>

      {/* SUB-TAB CONTENTS */}
      
      {/* TAB 1: CONVERSACIONES (WHATSAPP CHAT TAKE-OVER PANEL) */}
      {activeTab === 'conversaciones' && (
        <div className="h-[calc(100vh-220px)] md:h-[calc(100vh-180px)] flex bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Chats Sidebar */}
          <aside className={`w-full md:w-96 flex flex-col border-r border-neutral-200 shrink-0 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between shrink-0">
              <span className="font-extrabold text-sm text-neutral-400 uppercase tracking-wider">Hilos Activos</span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Ollama local
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {safeConversations.length === 0 ? (
                <p className="text-neutral-400 text-center py-10">No hay chats abiertos.</p>
              ) : (
                safeConversations.map(conv => {
                  const clientName = conv.customer?.nombre || `Cliente +${conv.customer_phone}`;
                  const isActive = conv.id === activeConversationId;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id)}
                      className={`w-full text-left p-4 rounded-2xl flex gap-3 transition-all cursor-pointer relative group ${
                        isActive ? 'bg-neutral-950 text-white shadow-md' : 'hover:bg-neutral-50 text-black'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-neutral-900 border border-gold flex items-center justify-center font-black text-white shrink-0">
                        {(clientName || '').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-extrabold text-base truncate pr-1">{clientName}</span>
                          <span className="text-[10px] shrink-0 font-bold text-neutral-400">
                            {formatTime(conv.updated_at)}
                          </span>
                        </div>
                        <p className={`text-sm truncate m-0 mt-1 ${isActive ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {conv.last_message || 'Iniciando conversación...'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Chat Window Panel */}
          <section className={`flex-1 flex flex-col min-w-0 bg-[#F5F5F7] ${!activeConversationId ? 'hidden md:flex items-center justify-center p-8 text-center bg-neutral-50' : 'flex'}`}>
            {activeConv ? (
              <div className="flex-1 flex overflow-hidden">
                {/* 2-column inner chat panel (Main chat + Right dossier) */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Header */}
                  <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => setActiveConversationId(null)} className="p-1 hover:bg-neutral-100 rounded-lg mr-1 md:hidden cursor-pointer text-black">
                        <X className="w-6 h-6" />
                      </button>
                      <div className="w-12 h-12 rounded-full bg-neutral-900 border border-gold flex items-center justify-center font-black text-white shrink-0">
                        {(activeConv?.customer?.nombre || 'C').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-lg text-black m-0 truncate">
                          {activeConv.customer?.nombre || `Cliente +${activeConv.customer_phone}`}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {getStatusBadge(activeConv.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeConv.ai_enabled ? (
                        <button
                          onClick={() => handleTakeover(activeConv.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-extrabold px-4 py-2.5 rounded-xl text-sm border border-red-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          Tomar conversación
                        </button>
                      ) : (
                        <button
                          onClick={() => handleResolve(activeConv.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Sparkles className="w-4 h-4 text-gold" />
                          Reactivar Asistente IA
                        </button>
                      )}
                    </div>
                  </header>

                  {/* Message logs */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#EDE6D9]/50" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/143831828-56ccf6e1-fd54-4aa9-a9a3-5e917d5e46be.png")', backgroundSize: 'contain' }}>
                    {activeConvMessages.map(msg => {
                      const isIncoming = msg.direction === 'incoming';
                      return (
                        <div key={msg.id} className={`flex w-full ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-1 relative ${
                            isIncoming ? 'bg-white text-black rounded-tl-none' : 'bg-[#E1F3D4] text-black rounded-tr-none'
                          }`}>
                            <p className="text-[15px] m-0 leading-normal font-semibold whitespace-pre-wrap">{msg.content}</p>
                            <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-400 self-end mt-0.5">
                              <span>{formatTime(msg.created_at)}</span>
                              {!isIncoming && <CheckCheck className="w-4 h-4 text-[#53bdeb] shrink-0" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {activeConv.status === 'ai_pending' && (
                      <div className="flex w-full justify-start animate-pulse">
                        <div className="bg-white text-neutral-500 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm text-sm font-bold flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-gold animate-spin" />
                          <span>Asistente IA está escribiendo...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input form */}
                  <footer className="bg-white p-4 border-t border-neutral-200 shrink-0">
                    {activeConv.ai_enabled ? (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-center flex items-center justify-center gap-2 text-sm text-amber-900 font-semibold">
                        <Bot className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>El Asistente IA está respondiendo automáticamente. Haz clic en "Tomar conversación" arriba para escribir de forma manual.</span>
                      </div>
                    ) : (
                      <form onSubmit={handleSend} className="flex gap-2">
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Escribe un mensaje de respuesta manual..."
                          className="flex-1 px-4 py-4 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-gold text-base text-black font-semibold focus-gold"
                        />
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-sm">
                          <Send className="w-6 h-6 stroke-[2]" />
                        </button>
                      </form>
                    )}
                  </footer>
                </div>

                {/* Column 3: Contact Dossier (Ficha Cliente) */}
                <aside className="hidden lg:flex w-80 flex-col bg-white border-l border-neutral-200 shrink-0 p-6 space-y-6 overflow-y-auto">
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 rounded-2xl bg-neutral-900 border-2 border-gold flex items-center justify-center font-black text-white text-3xl mx-auto shadow-sm">
                      {(activeConv.customer?.nombre || 'C').slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-black m-0 truncate">
                        {activeConv.customer?.nombre || 'Contacto Desconocido'}
                      </h3>
                      <p className="text-sm text-neutral-400 font-semibold m-0 mt-0.5">
                        +{activeConv.customer_phone}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-neutral-100 pt-5 space-y-4">
                    <span className="block text-xs font-black text-neutral-400 uppercase tracking-wider">Historial del Cliente</span>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
                        <span className="text-[10px] text-neutral-400 uppercase font-black block">Visitas</span>
                        <span className="text-base font-extrabold text-black block mt-0.5">
                          {activeConv.customer?.numero_visitas ?? 0} veces
                        </span>
                      </div>

                      <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
                        <span className="text-[10px] text-neutral-400 uppercase font-black block">Total Gastado</span>
                        <span className="text-base font-extrabold text-emerald-600 block mt-0.5">
                          {activeConv.customer?.gasto_total ?? 0}€
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {activeConv.customer?.ultima_visita && (
                        <div>
                          <span className="text-[10px] text-neutral-400 uppercase font-black block">Última Visita</span>
                          <span className="text-sm font-bold text-neutral-700 block mt-0.5">
                            {new Date(activeConv.customer.ultima_visita).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-black block">Servicios Favoritos</span>
                        <span className="text-sm font-bold text-neutral-700 block mt-0.5 flex items-center gap-1">
                          <Scissors className="w-3.5 h-3.5 text-gold shrink-0" />
                          Corte Degradado (Fade)
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-black block">Próxima Cita</span>
                        <span className="text-sm font-bold text-neutral-700 block mt-0.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          Sin citas pendientes
                        </span>
                      </div>
                    </div>

                    {activeConv.customer?.notas && (
                      <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                        <span className="text-[10px] text-neutral-400 uppercase font-black block">Notas Técnicas</span>
                        <p className="text-xs text-neutral-600 m-0 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                          {activeConv.customer.notas}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Action buttons */}
                  <div className="space-y-2 pt-4 border-t border-neutral-100">
                    <button
                      onClick={() => navigate('/customers')}
                      className="w-full bg-neutral-900 hover:bg-black text-white font-extrabold py-3 px-4 rounded-xl text-xs cursor-pointer shadow-sm text-center"
                    >
                      Abrir Ficha de Cliente
                    </button>
                    <button
                      onClick={() => navigate('/calendar')}
                      className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 px-4 rounded-xl text-xs cursor-pointer text-center"
                    >
                      Abrir Agenda
                    </button>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-neutral-50 border-2 border-dashed border-neutral-200 flex items-center justify-center mx-auto text-neutral-400">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-black m-0">Ningún chat seleccionado</h3>
                <p className="text-neutral-400 m-0 max-w-sm mx-auto text-lg font-semibold">
                  Selecciona una conversación de WhatsApp de la lista lateral para ver la interacción con el Asistente IA.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: CONFIGURACIÓN IA */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-black m-0 flex items-center gap-2">
              <Bot className="w-5 h-5 text-gold-dark" />
              Instrucciones de Personalidad del Recepcionista
            </h2>

            <button
              type="button"
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`px-4 py-2 font-bold text-xs rounded-xl border transition-all cursor-pointer ${
                aiEnabled 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {aiEnabled ? '🟢 Recepcionista IA: Activo' : '🔴 Recepcionista IA: Inactivo'}
            </button>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            {saveSuccess && (
              <div className="bg-emerald-600 text-white font-bold p-4 rounded-2xl text-center flex items-center justify-center gap-2 animate-bounce">
                <ShieldCheck className="w-6 h-6 stroke-[3]" />
                ¡Configuración del asistente guardada con éxito!
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700">Mensaje de Bienvenida de WhatsApp</label>
                <input
                  type="text"
                  required
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="¡Hola! Bienvenido a BarberLozz. ¿En qué te puedo ayudar hoy?"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700">Prompt / Directrices del Asistente</label>
                <textarea
                  rows={6}
                  required
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ej: Hablas en español, de manera cercana y muy breve..."
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gold hover:bg-gold-dark text-black font-black py-4 px-6 rounded-2xl text-base flex items-center justify-center gap-2 border border-gold cursor-pointer shadow-sm"
            >
              <Save className="w-5 h-5 stroke-[2.5]" />
              Guardar Configuración IA
            </button>
          </form>

          {/* New Section: Proveedor IA */}
          <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="text-lg font-black text-black m-0 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-gold-dark" />
                Proveedor IA (Ollama Local)
              </h3>
              <p className="text-xs text-neutral-400 m-0 mt-1">Configuración actual del motor local del asistente.</p>
              
              <div className="space-y-2 mt-4 text-sm font-semibold text-neutral-800">
                <div className="flex justify-between border-b border-neutral-150 pb-1.5">
                  <span className="text-neutral-400">Proveedor</span>
                  <span className="font-extrabold text-black">Ollama</span>
                </div>
                <div className="flex justify-between border-b border-neutral-150 pb-1.5">
                  <span className="text-neutral-400">Modelo Activo</span>
                  <span className="font-extrabold text-black">qwen3:8b</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">URL del Servidor</span>
                  <span className="font-mono text-xs font-bold text-black">http://127.0.0.1:11434</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center p-4 border border-dashed border-neutral-200 rounded-xl space-y-4 bg-white">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConn}
                className="bg-black hover:bg-neutral-900 text-white font-black px-6 py-3.5 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {testingConn ? 'Probando...' : 'Probar conexión'}
              </button>

              {testResult && (
                <div className="text-center space-y-1">
                  <span className={`text-base font-extrabold block ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                    {testResult.success ? '✅ Conexión correcta' : '❌ Error de conexión'}
                  </span>
                  {testResult.success && (
                    <span className="text-xs text-neutral-400 font-bold block">
                      Tiempo: {testResult.latencyMs} ms • Modelo: {testResult.model}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HISTORIAL / ESTADO */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200 shadow-sm space-y-6">
          <h2 className="text-xl font-black text-black m-0 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-gold-dark" />
            Consola de Sincronización y Estado
          </h2>

          <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100">
            <div className="p-4 bg-neutral-50/50 flex justify-between items-center text-xs font-black text-neutral-400 uppercase tracking-wider">
              <span>Módulo del Sistema</span>
              <span>Estado</span>
            </div>

            <div className="p-4 flex justify-between items-center text-sm font-semibold text-neutral-800">
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4 text-gold-dark" />
                Base de Datos (Supabase local fallback)
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
                Conectado
              </span>
            </div>

            <div className="p-4 flex justify-between items-center text-sm font-semibold text-neutral-800">
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-gold-dark" />
                Motor de IA (Ollama qwen3:8b)
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
                Disponible
              </span>
            </div>

            <div className="p-4 flex justify-between items-center text-sm font-semibold text-neutral-800">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gold-dark" />
                WhatsApp Cloud Webhook Listener
              </span>
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1 animate-pulse">
                Escuchando eventos...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ESTADÍSTICAS */}
      {activeTab === 'stats' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200 shadow-sm space-y-6">
          <h2 className="text-xl font-black text-black m-0 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold-dark" />
            Rendimiento de Mensajería IA
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100 flex flex-col justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Conversaciones hoy</span>
              <div className="mt-4">
                <span className="text-4xl font-black text-black block">{safeConversations.length}</span>
                <span className="text-xs text-neutral-400 mt-1 block font-semibold">Mensajeros atendidos</span>
              </div>
            </div>

            <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100 flex flex-col justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Tasa de Resolución</span>
              <div className="mt-4">
                <span className="text-4xl font-black text-emerald-600 block">90%</span>
                <span className="text-xs text-neutral-400 mt-1 block font-semibold">Atendido desasistido</span>
              </div>
            </div>

            <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100 flex flex-col justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Tiempo Respuesta</span>
              <div className="mt-4">
                <span className="text-4xl font-black text-black block">1.8s</span>
                <span className="text-xs text-neutral-400 mt-1 block font-semibold">Velocidad de generación</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
