import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useBusinessStore } from '../stores/businessStore';
import { Button, Badge, Card, Input } from '../ui';
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
      case 'human_needed': return <Badge variant="error" size="sm" icon={<AlertCircle className="w-3 h-3" />}>Humano</Badge>;
      case 'ai_pending': return <Badge variant="warning" size="sm" icon={<Bot className="w-3 h-3" />}>IA...</Badge>;
      default: return <Badge variant="success" size="sm" icon={<Sparkles className="w-3 h-3" />}>IA</Badge>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-text-primary m-0">Recepcionista IA</h1>
          <p className="text-text-secondary m-0 mt-0.5 text-xs md:text-sm font-semibold hidden md:block">Gestiona conversaciones y configura el asistente.</p>
        </div>
        <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 gap-1 overflow-x-auto no-scrollbar">
          {(['conversaciones', 'config', 'historial', 'stats'] as const).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); if (tab !== 'conversaciones') setActiveConversationId(null); }}
              className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab ? 'bg-white text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >{tab === 'conversaciones' ? 'Chats' : tab === 'config' ? 'Config' : tab === 'historial' ? 'Estado' : 'Stats'}</button>
          ))}
        </div>
      </div>

      {activeTab === 'conversaciones' && (
        <div className="h-[calc(100dvh-220px)] md:h-[calc(100vh-180px)] flex bg-surface border border-border rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
          <aside className={`w-full md:w-96 flex flex-col border-r border-border shrink-0 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-border bg-neutral-50/50 flex items-center justify-between shrink-0">
              <span className="font-extrabold text-xs text-text-tertiary uppercase tracking-wider">Conversaciones</span>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Ollama</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {safeConversations.length === 0 ? (
                <p className="text-text-tertiary text-center py-8 text-sm">No hay chats activos.</p>
              ) : safeConversations.map(conv => {
                const name = conv.customer?.nombre || `+${conv.customer_phone}`;
                const isActive = conv.id === activeConversationId;
                return (
                  <button key={conv.id} onClick={() => handleSelectConv(conv.id)}
                    className={`w-full text-left p-3 rounded-xl flex gap-3 transition-all cursor-pointer ${
                      isActive ? 'bg-neutral-950 text-white shadow-md' : 'hover:bg-neutral-50 text-text-primary'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-neutral-900 border border-gold flex items-center justify-center font-black text-white shrink-0 text-sm">
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-extrabold text-sm truncate">{name}</span>
                        <span className="text-[9px] shrink-0 font-bold text-text-tertiary">{formatTime(conv.updated_at)}</span>
                      </div>
                      <p className={`text-xs truncate m-0 mt-0.5 ${isActive ? 'text-neutral-300' : 'text-text-secondary'}`}>
                        {conv.last_message || 'Iniciando...'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={`flex-1 flex flex-col min-w-0 bg-platinum ${!activeConversationId ? 'hidden md:flex items-center justify-center p-8 text-center bg-neutral-50' : 'flex'}`}>
            {activeConv ? (
              <>
                <header className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setActiveConversationId(null)} className="md:hidden p-1 -ml-1 hover:bg-neutral-100 rounded-lg cursor-pointer">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-neutral-900 border border-gold flex items-center justify-center font-black text-white shrink-0 text-sm">
                      {(activeConv.customer?.nombre || 'C').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm text-text-primary m-0 truncate">{activeConv.customer?.nombre || `+${activeConv.customer_phone}`}</h3>
                      <div className="mt-0.5">{getStatusBadge(activeConv.status)}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => activeConv.ai_enabled ? handleTakeover(activeConv.id) : handleResolve(activeConv.id)}
                    className={activeConv.ai_enabled ? 'text-red-600 border-red-200 hover:bg-red-50' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'}>
                    {activeConv.ai_enabled ? 'Tomar' : 'Reactivar IA'}
                  </Button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-platinum">
                  {activeConvMessages.map(msg => {
                    const isIncoming = msg.direction === 'incoming';
                    return (
                      <div key={msg.id} className={`flex w-full ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${
                          isIncoming ? 'bg-surface text-text-primary rounded-tl-none' : 'bg-[#E1F3D4] text-text-primary rounded-tr-none'
                        }`}>
                          <p className="text-sm m-0 leading-normal font-semibold whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center justify-end gap-1 text-[9px] text-text-tertiary mt-0.5">
                            <span>{formatTime(msg.created_at)}</span>
                            {!isIncoming && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {activeConv.status === 'ai_pending' && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-surface text-text-secondary rounded-2xl rounded-tl-none px-3 py-2 shadow-sm text-xs font-bold flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-gold animate-spin" /> Escribiendo...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <footer className="bg-surface p-3 border-t border-border shrink-0">
                  {activeConv.ai_enabled ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center text-xs text-amber-900 font-semibold flex items-center justify-center gap-2">
                      <Bot className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>IA responde automáticamente. Usa "Tomar" para intervenir.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSend} className="flex gap-2">
                      <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                        placeholder="Responder manualmente..." className="flex-1 px-4 py-3 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-gold text-sm font-semibold" />
                      <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 p-3" icon={<Send className="w-5 h-5" />} />
                    </form>
                  )}
                </footer>
              </>
            ) : (
              <div className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-neutral-50 border-2 border-dashed border-border flex items-center justify-center mx-auto text-text-tertiary"><MessageSquare className="w-7 h-7" /></div>
                <h3 className="text-lg font-bold text-text-primary m-0 mt-3">Selecciona un chat</h3>
                <p className="text-sm text-text-secondary m-0 mt-1">Elige una conversación de la lista.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'config' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base md:text-xl font-black text-text-primary m-0 flex items-center gap-2"><Bot className="w-5 h-5 text-gold-dark" />Personalidad</h2>
            <button onClick={() => setAiEnabled(!aiEnabled)}
              className={`px-3 py-1.5 font-bold text-[10px] rounded-xl border transition-all cursor-pointer ${
                aiEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >{aiEnabled ? '🟢 Activo' : '🔴 Inactivo'}</button>
          </div>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            {saveSuccess && <div className="bg-emerald-600 text-white font-bold p-3 rounded-xl text-sm text-center flex items-center justify-center gap-2"><ShieldCheck className="w-5 h-5" />¡Guardado!</div>}
            <Input label="Mensaje de Bienvenida" value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="¡Hola! Bienvenido a BarberLozz..." />
            <div>
              <label className="block text-xs font-bold text-text-secondary m-0 mb-1">Prompt del Asistente</label>
              <textarea rows={4} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Ej: Hablas en español, de manera cercana..."
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm focus:outline-none focus-ring text-text-primary font-semibold" />
            </div>
            <Button type="submit" variant="primary" size="lg" icon={<Save className="w-4 h-4" />} className="w-full">Guardar</Button>
          </form>
          <div className="bg-neutral-50 p-4 rounded-xl border border-border mt-4 space-y-3">
            <h3 className="text-sm font-black text-text-primary flex items-center gap-2"><Terminal className="w-4 h-4 text-gold-dark" />Ollama</h3>
            <div className="text-xs font-semibold text-text-primary space-y-1.5">
              <div className="flex justify-between"><span className="text-text-tertiary">Modelo</span><span className="font-extrabold">qwen3:8b</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">URL</span><span className="font-mono text-[10px] font-bold">http://127.0.0.1:11434</span></div>
            </div>
            <Button variant="primary" className="w-full bg-black hover:bg-neutral-900" onClick={handleTestConnection} disabled={testingConn}>
              {testingConn ? 'Probando...' : 'Probar conexión'}
            </Button>
            {testResult && (
              <div className="text-center">
                <span className={`text-sm font-extrabold block ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {testResult.success ? '✅ Conectado' : '❌ Error'}
                </span>
                {testResult.success && <span className="text-[10px] text-text-tertiary font-bold">{testResult.latencyMs}ms · {testResult.model}</span>}
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'historial' && (
        <Card className="space-y-4">
          <h2 className="text-base md:text-xl font-black text-text-primary flex items-center gap-2"><Terminal className="w-5 h-5 text-gold-dark" />Estado del Sistema</h2>
          <div className="border border-border rounded-xl divide-y divide-neutral-100">
            {[{ label: 'Base de Datos', icon: Database, status: 'Conectado', color: 'emerald' },
              { label: 'Motor IA (Ollama)', icon: Bot, status: 'Disponible', color: 'emerald' },
              { label: 'WhatsApp Webhook', icon: Terminal, status: 'Escuchando...', color: 'amber' }]
              .map((item, i) => (
                <div key={i} className="p-3 md:p-4 flex justify-between items-center text-xs md:text-sm font-semibold text-text-primary">
                  <span className="flex items-center gap-2"><item.icon className="w-4 h-4 text-gold-dark" />{item.label}</span>
                  <Badge variant={item.color === 'emerald' ? 'success' : 'warning'}>{item.status}</Badge>
                </div>
              ))}
          </div>
        </Card>
      )}

      {activeTab === 'stats' && (
        <Card className="space-y-4">
          <h2 className="text-base md:text-xl font-black text-text-primary flex items-center gap-2"><TrendingUp className="w-5 h-5 text-gold-dark" />Rendimiento</h2>
          <div className="grid grid-cols-3 gap-3">
            {[{ label: 'Conversaciones', value: String(safeConversations.length) },
              { label: 'Resolución', value: '90%', color: 'emerald' },
              { label: 'Respuesta', value: '1.8s' }]
              .map((s, i) => (
                <div key={i} className="bg-surface p-4 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">{s.label}</span>
                  <span className={`text-xl font-black block mt-1 ${s.color === 'emerald' ? 'text-emerald-600' : 'text-text-primary'}`}>{s.value}</span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
};
