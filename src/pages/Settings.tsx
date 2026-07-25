import { useState, useEffect } from 'react';
import { useBusinessStore } from '../stores/businessStore';
import { Save, Building, Clock, ShieldCheck, Users, Bot, Lock } from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 1, name: 'L' }, { id: 2, name: 'M' }, { id: 3, name: 'X' },
  { id: 4, name: 'J' }, { id: 5, name: 'V' }, { id: 6, name: 'S' }, { id: 0, name: 'D' }
];

const DAYS_FULL = [
  { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' }, { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' }, { id: 0, name: 'Domingo' }
];

export const Settings: React.FC = () => {
  const { business, fetchBusiness, updateBusiness, loading } = useBusinessStore();
  const [activeTab, setActiveTab] = useState<'empresa' | 'horarios' | 'ia' | 'usuarios'>('empresa');

  const [nombre, setNombre] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('20:30');
  const [openDays, setOpenDays] = useState<number[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [greeting, setGreeting] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { fetchBusiness(); }, [fetchBusiness]);

  useEffect(() => {
    if (business) {
      setNombre(business.nombre || '');
      setLogoUrl(business.logo_url || '');
      setTelefono(business.telefono || '');
      setEmail(business.email || '');
      setDireccion(business.direccion || '');
      setStartTime(business.horarios?.start || '09:00');
      setEndTime(business.horarios?.end || '20:30');
      setOpenDays(business.horarios?.open_days || [1, 2, 3, 4, 5, 6]);
      setCustomPrompt(business.configuracion_ia?.custom_prompt || '');
      setGreeting(business.configuracion_ia?.greeting || '');
      setAiEnabled(business.configuracion_ia?.ai_enabled !== false);
    }
  }, [business]);

  const handleDayToggle = (dayId: number) => {
    if (openDays.includes(dayId)) {
      setOpenDays(openDays.filter(d => d !== dayId));
    } else {
      setOpenDays([...openDays, dayId].sort());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) return;
    const success = await updateBusiness({
      nombre, logo_url: logoUrl || null, telefono: telefono || null, email: email || null, direccion: direccion || null,
      horarios: { start: startTime, end: endTime, open_days: openDays },
      configuracion_ia: { custom_prompt: customPrompt, greeting, ai_enabled: aiEnabled }
    });
    if (success) { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); }
  };

  const tabs = [
    { id: 'empresa' as const, label: 'Empresa', icon: Building },
    { id: 'horarios' as const, label: 'Horarios', icon: Clock },
    { id: 'ia' as const, label: 'IA', icon: Bot },
    { id: 'usuarios' as const, label: 'Usuarios', icon: Users },
  ];

  if (!business && loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-100 rounded-xl w-48" />
          <div className="h-64 bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 space-y-4">
            <div className="h-10 bg-neutral-100 rounded-xl w-1/3" />
            <div className="h-10 bg-neutral-100 rounded-xl w-full" />
            <div className="h-10 bg-neutral-100 rounded-xl w-full" />
            <div className="h-10 bg-neutral-100 rounded-xl w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-3xl font-black text-black m-0">Ajustes</h1>
        <p className="text-neutral-500 m-0 mt-0.5 text-xs md:text-sm">Empresa, horarios e IA.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {saveSuccess && (
          <div className="bg-emerald-600 text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2 animate-bounce">
            <ShieldCheck className="w-5 h-5 stroke-[3]" />¡Ajustes guardados!
          </div>
        )}

        <div className="flex overflow-x-auto no-scrollbar border-b border-neutral-200 gap-1">
          {tabs.map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`px-4 md:px-5 py-3 font-bold text-xs md:text-base border-b-2 flex items-center gap-1.5 md:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}>
              <tab.icon className="w-4 h-5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-neutral-200 shadow-sm">
          {activeTab === 'empresa' && (
            <div className="space-y-4">
              <h2 className="text-base md:text-xl font-black text-black m-0 flex items-center gap-2"><Building className="w-4 h-5 text-gold-dark" />Información</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700">Nombre *</label>
                  <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: BarberLozz Premium"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700">Logo (URL)</label>
                  <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://ejemplo.com/logo.png"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700">Teléfono</label>
                    <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="+34600111222"
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@barberia.com"
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700">Dirección</label>
                  <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Calle Gran Vía 45, Madrid"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'horarios' && (
            <div className="space-y-4">
              <h2 className="text-base md:text-xl font-black text-black m-0 flex items-center gap-2"><Clock className="w-4 h-5 text-gold-dark" />Horarios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700">Apertura</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700">Cierre</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Días laborales</label>
                <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
                  {(isMobile ? DAYS_OF_WEEK : DAYS_FULL).map(day => {
                    const isOpen = openDays.includes(day.id);
                    return (
                      <button key={day.id} type="button" onClick={() => handleDayToggle(day.id)}
                        className={`py-2.5 md:py-3 px-1 rounded-xl text-center font-bold text-xs md:text-sm transition-all border-2 ${
                          isOpen ? 'bg-black text-gold border-black' : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300'
                        }`}>{day.name}</button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ia' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-xl font-black text-black m-0 flex items-center gap-2"><Bot className="w-4 h-5 text-gold-dark" />Recepcionista IA</h2>
                <button type="button" onClick={() => setAiEnabled(!aiEnabled)}
                  className={`px-3 py-2 font-bold text-xs rounded-xl border transition-all ${
                    aiEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>{aiEnabled ? 'Activo' : 'Inactivo'}</button>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700">Mensaje de Bienvenida</label>
                <input type="text" value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="¡Hola! Bienvenido a BarberLozz..."
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700">Directrices de la IA</label>
                <textarea rows={4} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Eres un recepcionista atento y educado..."
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="space-y-4">
              <h2 className="text-base md:text-xl font-black text-black m-0 flex items-center gap-2"><Users className="w-4 h-5 text-gold-dark" />Equipo y Roles</h2>
              <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100">
                <div className="p-3 md:p-4 bg-neutral-50/50 flex justify-between items-center text-xs font-extrabold text-neutral-700">
                  <span>Colaborador</span>
                  <span>Rol</span>
                </div>
                <div className="p-3 md:p-4 flex justify-between items-center text-xs md:text-sm font-semibold text-neutral-800">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-neutral-900 text-gold flex items-center justify-center font-bold text-xs">M</div>
                    <span>Master Barber (Dueño)</span>
                  </div>
                  <span className="px-2 md:px-3 py-1 bg-neutral-900 text-white rounded-lg text-xs font-bold flex items-center gap-1"><Lock className="w-3 h-3 text-gold" />Admin</span>
                </div>
                <div className="p-3 md:p-4 flex justify-between items-center text-xs md:text-sm font-semibold text-neutral-800">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs">E</div>
                    <span>Barbero Junior</span>
                  </div>
                  <span className="px-2 md:px-3 py-1 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-bold">Empleado</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-black hover:bg-neutral-900 text-white font-black py-4 md:py-5 rounded-xl md:rounded-2xl text-base md:text-xl flex items-center justify-center gap-2 cursor-pointer shadow-md">
          <Save className="w-5 h-6 stroke-[3]" />{loading ? 'Guardando...' : 'Guardar Ajustes'}
        </button>
      </form>
    </div>
  );
};
