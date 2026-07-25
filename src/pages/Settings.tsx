import { useState, useEffect } from 'react';
import { useBusinessStore } from '../stores/businessStore';
import { Button, Input, Card } from '../ui';
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
          <div className="h-8 bg-surface rounded-xl w-48" />
          <div className="h-64 bg-surface rounded-2xl border border-border shadow-sm p-8 space-y-4">
            <div className="h-10 bg-surface rounded-xl w-1/3" />
            <div className="h-10 bg-surface rounded-xl w-full" />
            <div className="h-10 bg-surface rounded-xl w-full" />
            <div className="h-10 bg-surface rounded-xl w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-3xl font-black text-text-primary m-0">Ajustes</h1>
        <p className="text-text-secondary m-0 mt-0.5 text-xs md:text-sm">Empresa, horarios e IA.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {saveSuccess && (
          <div className="bg-emerald-600 text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5 stroke-[3]" />¡Ajustes guardados!
          </div>
        )}

        <div className="flex overflow-x-auto no-scrollbar border-b border-border gap-1">
          {tabs.map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`px-4 md:px-5 py-3 font-bold text-xs md:text-base border-b-2 flex items-center gap-1.5 md:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === tab.id ? 'border-text-primary text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}>
              <tab.icon className="w-4 h-5 shrink-0" /><span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <Card>
          {activeTab === 'empresa' && (
            <div className="space-y-4">
              <h2 className="text-base md:text-xl font-black text-text-primary m-0 flex items-center gap-2"><Building className="w-4 h-5 text-gold-dark" />Información</h2>
              <Input label="Nombre *" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: BarberLozz Premium" />
              <Input label="Logo (URL)" type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://ejemplo.com/logo.png" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Teléfono" type="tel" value={telefono} onChange={e => setTelefono(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="+34600111222" />
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@barberia.com" />
              </div>
              <Input label="Dirección" type="text" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Calle Gran Vía 45, Madrid" />
            </div>
          )}

          {activeTab === 'horarios' && (
            <div className="space-y-4">
              <h2 className="text-base md:text-xl font-black text-text-primary m-0 flex items-center gap-2"><Clock className="w-4 h-5 text-gold-dark" />Horarios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Apertura" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                <Input label="Cierre" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold text-text-secondary m-0 mb-2">Días laborales</label>
                <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
                  {(isMobile ? DAYS_OF_WEEK : DAYS_FULL).map(day => {
                    const isOpen = openDays.includes(day.id);
                    return (
                      <button key={day.id} type="button" onClick={() => handleDayToggle(day.id)}
                        className={`py-2.5 md:py-3 px-1 rounded-xl text-center font-bold text-xs md:text-sm transition-all border-2 cursor-pointer ${
                          isOpen ? 'bg-text-primary text-gold border-text-primary' : 'bg-surface border-border text-text-tertiary hover:border-neutral-300'
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
                <h2 className="text-base md:text-xl font-black text-text-primary m-0 flex items-center gap-2"><Bot className="w-4 h-5 text-gold-dark" />Recepcionista IA</h2>
                <button type="button" onClick={() => setAiEnabled(!aiEnabled)}
                  className={`px-3 py-2 font-bold text-xs rounded-xl border transition-all cursor-pointer ${
                    aiEnabled ? 'bg-success-bg border-success-border text-success' : 'bg-error-bg border-error-border text-error'
                  }`}>{aiEnabled ? 'Activo' : 'Inactivo'}</button>
              </div>
              <Input label="Mensaje de Bienvenida" value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="¡Hola! Bienvenido a BarberLozz..." />
              <div>
                <label className="block text-sm font-bold text-text-secondary m-0 mb-1">Directrices de la IA</label>
                <textarea rows={4} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Eres un recepcionista atento y educado..."
                  className="w-full px-4 py-3 rounded-btn bg-surface border border-border text-sm focus-ring outline-none text-text-primary font-semibold" />
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="space-y-4">
              <h2 className="text-base md:text-xl font-black text-text-primary m-0 flex items-center gap-2"><Users className="w-4 h-5 text-gold-dark" />Equipo y Roles</h2>
              <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
                <div className="p-3 md:p-4 bg-surface-muted/50 flex justify-between items-center text-xs font-extrabold text-text-secondary">
                  <span>Colaborador</span><span>Rol</span>
                </div>
                <div className="p-3 md:p-4 flex justify-between items-center text-xs md:text-sm font-semibold text-text-primary">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-neutral-900 text-gold flex items-center justify-center font-bold text-xs">M</div>
                    <span>Master Barber (Dueño)</span>
                  </div>
                  <span className="px-2 md:px-3 py-1 bg-neutral-900 text-white rounded-lg text-xs font-bold flex items-center gap-1"><Lock className="w-3 h-3 text-gold" />Admin</span>
                </div>
                <div className="p-3 md:p-4 flex justify-between items-center text-xs md:text-sm font-semibold text-text-primary">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs">E</div>
                    <span>Barbero Junior</span>
                  </div>
                  <span className="px-2 md:px-3 py-1 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-bold">Empleado</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Button type="submit" disabled={loading} variant="primary" size="lg" icon={<Save className="w-5 h-6 stroke-[3]" />} className="w-full">
          {loading ? 'Guardando...' : 'Guardar Ajustes'}
        </Button>
      </form>
    </div>
  );
};
