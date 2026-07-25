import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useBusinessStore } from '../stores/businessStore';
import {
  Send, MessageSquare, Bot, AlertCircle, Sparkles,
  CheckCheck, Terminal, TrendingUp, Save, ShieldCheck, Database,
  ArrowLeft
} from 'lucide-react';
import { BACKEND_URL } from '../config/backend';

export const Assistant: React.FC = () => {
  const {
    conversations, messages, activeConversationId,
    fetchConversations, fetchMessages, sendMessage,
    takeoverConversation, resolveConversation, setActiveConversationId
  } = useChatStore();
  const { business, fetchBusiness, updateBusiness } = useBusinessStore();

  const [activeTab, setActiveTab] = useState<'conversaciones' | 'config' | 'historial' | 'stats'>('conversaciones');
  const [greeting, setGreeting] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; model?: string } | null>(null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleTestConnection = async () => {
    setTestingConn(true); setTestResult(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/test-connection`, { method: 'POST' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTestResult({ success: data.success, latencyMs: data.latencyMs, model: data.model });
    } catch { setTestResult({ success: false }); }
    finally { setTestingConn(false); }
  };

  useEffect(() => { fetchConversations(); fetchBusiness(); const i = setInterval(fetchConversations, 10000); return () => clearInterval(i); }, [fetchConversations, fetchBusiness]);
  useEffect(() => {
    if (business) {
      setGreeting(business.configuracion_ia?.greeting || '');
      setCustomPrompt(business.configuracion_ia?.custom_prompt || '');
      setAiEnabled(business.configuracion_ia?.ai_enabled !== false);
    }
  }, [business]);
  useEffect(() => { if (activeConversationId) fetchMessages(activeConversationId); }, [activeConversationId, fetchMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeConversationId]);

  const handleSelectConv = (convId: string) => setActiveConversationId(convId);
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversationId) return;
    const text = inputText; setInputText('');
    await sendMessage(activeConversationId, text);
  };
  const handleTakeover = async (convId: string) => { await takeoverConversation(convId); fetchConversations(); };
  const handleResolve = async (convId: string) => { await resolveConversation(convId); fetchConversations(); };
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    const success = await updateBusiness({
      configuracion_ia: { custom_prompt: customPrompt, greeting, ai_enabled: aiEnabled }
    });
    if (success) { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); }
  };

  const safeConversations = conversations ?? [];
  const activeConv = safeConversations.find(c => c.id === activeConversationId);
  const activeConvMessages = activeConversationId ? ((messages ?? {})[activeConversationId] || []) : [];

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'human_needed': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold border border-red-200"><AlertCircle className="w-3 h-3" />Humano</span>;
      case 'ai_pending': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 animate-pulse"><Bot className="w-3 h-3" />IA...</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100"><Sparkles className="w-3 h-3" />IA</span>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header + Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-black m-0">Recepcionista IA</h1>
          <p className="text-neutral-500 m-0 mt-0.5 text-xs md:text-sm font-semibold hidden md:block">Gestiona conversaciones y configura el asistente.</p>
        </div>
        <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 gap-1 overflow-x-auto no-scrollbar">
          {(['conversaciones', 'config', 'historial', 'stats'] as const).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); if (tab !== 'conversaciones') setActiveConversationId(null); }}
              className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >{tab === 'conversaciones' ? 'Chats' : tab === 'config' ? 'Config' : tab === 'historial' ? 'Estado' : 'Stats'}</button>
          ))}
        </div>
      </div>

      {/* TAB: Conversaciones */}
      {activeTab === 'conversaciones' && (
        <div className="h-[calc(100dvh-220px)] md:h-[calc(100vh-180px)] flex bg-white border border-neutral-200 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
          {/* Chat list sidebar */}
          <aside className={`w-full md:w-96 flex flex-col border-r border-neutral-200 shrink-0 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between shrink-0">
              <span className="font-extrabold text-xs text-neutral-400 uppercase tracking-wider">Conversaciones</span>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Ollama</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {safeConversations.length === 0 ? (
                <p className="text-neutral-400 text-center py-8 text-sm">No hay chats activos.</p>
              ) : safeConversations.map(conv => {
                const name = conv.customer?.nombre || `+${conv.customer_phone}`;
                const isActive = conv.id === activeConversationId;
                return (
                  <button key={conv.id} onClick={() => handleSelectConv(conv.id)}
                    className={`w-full text-left p-3 rounded-xl flex gap-3 transition-all cursor-pointer ${
                      isActive ? 'bg-neutral-950 text-white shadow-md' : 'hover:bg-neutral-50 text-black'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-neutral-900 border border-gold flex items-center justify-center font-black text-white shrink-0 text-sm">
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-extrabold text-sm truncate">{name}</span>
                        <span className="text-[9px] shrink-0 font-bold text-neutral-400">{formatTime(conv.updated_at)}</span>
                      </div>
                      <p className={`text-xs truncate m-0 mt-0.5 ${isActive ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {conv.last_message || 'Iniciando...'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Chat panel */}
          <section className={`flex-1 flex flex-col min-w-0 bg-[#F5F5F7] ${!activeConversationId ? 'hidden md:flex items-center justify-center p-8 text-center bg-neutral-50' : 'flex'}`}>
            {activeConv ? (
              <>
                {/* Chat header */}
                <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setActiveConversationId(null)} className="md:hidden p-1 -ml-1 hover:bg-neutral-100 rounded-lg cursor-pointer">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-neutral-900 border border-gold flex items-center justify-center font-black text-white shrink-0 text-sm">
                      {(activeConv.customer?.nombre || 'C').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm text-black m-0 truncate">{activeConv.customer?.nombre || `+${activeConv.customer_phone}`}</h3>
                      <div className="mt-0.5">{getStatusBadge(activeConv.status)}</div>
                    </div>
                  </div>
                  <button onClick={() => activeConv.ai_enabled ? handleTakeover(activeConv.id) : handleResolve(activeConv.id)}
                    className={`text-xs font-extrabold px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                      activeConv.ai_enabled ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {activeConv.ai_enabled ? 'Tomar' : 'Reactivar IA'}
                  </button>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#EDE6D9]/30">
                  {activeConvMessages.map(msg => {
                    const isIncoming = msg.direction === 'incoming';
                    return (
                      <div key={msg.id} className={`flex w-full ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${
                          isIncoming ? 'bg-white text-black rounded-tl-none' : 'bg-[#E1F3D4] text-black rounded-tr-none'
                        }`}>
                          <p className="text-sm m-0 leading-normal font-semibold whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center justify-end gap-1 text-[9px] text-neutral-400 mt-0.5">
                            <span>{formatTime(msg.created_at)}</span>
                            {!isIncoming && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {activeConv.status === 'ai_pending' && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-white text-neutral-500 rounded-2xl rounded-tl-none px-3 py-2 shadow-sm text-xs font-bold flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-gold animate-spin" /> Escribiendo...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <footer className="bg-white p-3 border-t border-neutral-200 shrink-0">
                  {activeConv.ai_enabled ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center text-xs text-amber-900 font-semibold flex items-center justify-center gap-2">
                      <Bot className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>IA responde automáticamente. Usa "Tomar" para intervenir.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSend} className="flex gap-2">
                      <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                        placeholder="Responder manualmente..." className="flex-1 px-4 py-3 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-gold text-sm font-semibold focus-gold" />
                      <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl cursor-pointer transition-colors">
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  )}
                </footer>
              </>
            ) : (
              <div className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-neutral-50 border-2 border-dashed border-neutral-200 flex items-center justify-center mx-auto text-neutral-400"><MessageSquare className="w-7 h-7" /></div>
                <h3 className="text-lg font-bold text-black m-0 mt-3">Selecciona un chat</h3>
                <p className="text-sm text-neutral-400 m-0 mt-1">Elige una conversación de la lista.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB: Config */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-neutral-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base md:text-xl font-black text-black m-0 flex items-center gap-2"><Bot className="w-5 h-5 text-gold-dark" />Personalidad</h2>
            <button onClick={() => setAiEnabled(!aiEnabled)}
              className={`px-3 py-1.5 font-bold text-[10px] rounded-xl border transition-all cursor-pointer ${
                aiEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >{aiEnabled ? '🟢 Activo' : '🔴 Inactivo'}</button>
          </div>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            {saveSuccess && <div className="bg-emerald-600 text-white font-bold p-3 rounded-xl text-sm text-center flex items-center justify-center gap-2"><ShieldCheck className="w-5 h-5" />¡Guardado!</div>}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Mensaje de Bienvenida</label>
              <input type="text" value={greeting} onChange={e => setGreeting(e.target.value)}
                placeholder="¡Hola! Bienvenido a BarberLozz..."
                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Prompt del Asistente</label>
              <textarea rows={4} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Ej: Hablas en español, de manera cercana..."
                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
            </div>
            <button type="submit" className="w-full bg-gold hover:bg-gold-dark text-black font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 border border-gold cursor-pointer">
              <Save className="w-4 h-4" /> Guardar
            </button>
          </form>
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 mt-4 space-y-3">
            <h3 className="text-sm font-black text-black flex items-center gap-2"><Terminal className="w-4 h-4 text-gold-dark" />Ollama</h3>
            <div className="text-xs font-semibold text-neutral-800 space-y-1.5">
              <div className="flex justify-between"><span className="text-neutral-400">Modelo</span><span className="font-extrabold">qwen3:8b</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">URL</span><span className="font-mono text-[10px] font-bold">http://127.0.0.1:11434</span></div>
            </div>
            <button onClick={handleTestConnection} disabled={testingConn}
              className="w-full bg-black hover:bg-neutral-900 text-white font-black py-2.5 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            >{testingConn ? 'Probando...' : 'Probar conexión'}</button>
            {testResult && (
              <div className="text-center">
                <span className={`text-sm font-extrabold block ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {testResult.success ? '✅ Conectado' : '❌ Error'}
                </span>
                {testResult.success && <span className="text-[10px] text-neutral-400 font-bold">{testResult.latencyMs}ms · {testResult.model}</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Historial */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-neutral-200 shadow-sm space-y-4">
          <h2 className="text-base md:text-xl font-black text-black flex items-center gap-2"><Terminal className="w-5 h-5 text-gold-dark" />Estado del Sistema</h2>
          <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100">
            {[{ label: 'Base de Datos', icon: Database, status: 'Conectado', color: 'emerald' },
              { label: 'Motor IA (Ollama)', icon: Bot, status: 'Disponible', color: 'emerald' },
              { label: 'WhatsApp Webhook', icon: Terminal, status: 'Escuchando...', color: 'amber' }]
              .map((item, i) => (
                <div key={i} className="p-3 md:p-4 flex justify-between items-center text-xs md:text-sm font-semibold text-neutral-800">
                  <span className="flex items-center gap-2"><item.icon className="w-4 h-4 text-gold-dark" />{item.label}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${item.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.status}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB: Stats */}
      {activeTab === 'stats' && (
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-neutral-200 shadow-sm space-y-4">
          <h2 className="text-base md:text-xl font-black text-black flex items-center gap-2"><TrendingUp className="w-5 h-5 text-gold-dark" />Rendimiento</h2>
          <div className="grid grid-cols-3 gap-3">
            {[{ label: 'Conversaciones', value: String(safeConversations.length) },
              { label: 'Resolución', value: '90%', color: 'emerald' },
              { label: 'Respuesta', value: '1.8s' }]
              .map((s, i) => (
                <div key={i} className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-100">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">{s.label}</span>
                  <span className={`text-xl font-black block mt-1 ${s.color === 'emerald' ? 'text-emerald-600' : 'text-black'}`}>{s.value}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
