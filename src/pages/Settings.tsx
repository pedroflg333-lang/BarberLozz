import { useState, useEffect } from 'react';
import { useBusinessStore } from '../stores/businessStore';
import { 
  Save, 
  Building, 
  Clock, 
  ShieldCheck, 
  Users, 
  Bot,
  Lock
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 0, name: 'Domingo' }
];

export const Settings: React.FC = () => {
  const { business, fetchBusiness, updateBusiness, loading } = useBusinessStore();

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<'empresa' | 'horarios' | 'ia' | 'usuarios'>('empresa');

  // Form local states
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

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  // Sync states
  useEffect(() => {
    if (business) {
      setNombre(business.nombre || '');
      setLogoUrl(business.logo_url || '');
      setTelefono(business.telefono || '');
      setEmail(business.email || '');
      setDireccion(business.direccion || '');

      setStartTime(business.horarios?.start || '09:00');
      setEndTime(business.horarios?.end || '20:30');
      setOpenDays(business.horarios?.open_days || [1,2,3,4,5,6]);

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
      nombre,
      logo_url: logoUrl || null,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
      horarios: {
        start: startTime,
        end: endTime,
        open_days: openDays
      },
      configuracion_ia: {
        custom_prompt: customPrompt,
        greeting: greeting,
        ai_enabled: aiEnabled
      }
    });

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-black m-0">Ajustes Generales</h1>
        <p className="text-neutral-500 m-0 mt-1 font-semibold">Configura la empresa, horarios, perfiles de usuarios e instrucciones del asistente de IA.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {saveSuccess && (
          <div className="bg-emerald-600 border border-emerald-500 text-white font-bold px-6 py-4 rounded-2xl text-lg text-center flex items-center justify-center gap-2 animate-bounce">
            <ShieldCheck className="w-6 h-6 stroke-[3]" />
            ¡Ajustes del SaaS guardados correctamente!
          </div>
        )}

        {/* Categories Tab Ribbon (Highly professional layout!) */}
        <div className="flex border-b border-neutral-200 gap-1 overflow-x-auto pb-px shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('empresa')}
            className={`px-5 py-3 font-bold text-base border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'empresa' 
                ? 'border-black text-black' 
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Building className="w-5 h-5 shrink-0" />
            Empresa
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('horarios')}
            className={`px-5 py-3 font-bold text-base border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'horarios' 
                ? 'border-black text-black' 
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Clock className="w-5 h-5 shrink-0" />
            Horarios y Días
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ia')}
            className={`px-5 py-3 font-bold text-base border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ia' 
                ? 'border-black text-black' 
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Bot className="w-5 h-5 shrink-0 text-gold-dark" />
            Recepcionista IA
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`px-5 py-3 font-bold text-base border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'usuarios' 
                ? 'border-black text-black' 
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Users className="w-5 h-5 shrink-0" />
            Usuarios y Roles
          </button>
        </div>

        {/* TAB CONTENT CARDS */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200 shadow-sm min-h-[350px]">
          
          {/* TAB 1: EMPRESA */}
          {activeTab === 'empresa' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-black m-0 flex items-center gap-2">
                <Building className="w-5 h-5 text-gold-dark" />
                Información de la Peluquería
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: BarberLozz Premium"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-neutral-700">Imagen de Logotipo (URL)</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-neutral-700">Teléfono / WhatsApp de Contacto</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/[^0-9+]/g, ''))}
                    placeholder="Ej: +34600111222"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-neutral-700">Correo Electrónico de Consultas</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ej: info@barberia.com"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-neutral-700">Dirección Física del Local</label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Calle Gran Vía 45, Madrid, España"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HORARIOS */}
          {activeTab === 'horarios' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-black m-0 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold-dark" />
                Horarios de Apertura y Cierre
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700">Hora de Apertura</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-neutral-700">Hora de Cierre</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>
              </div>

              {/* Day checkbox targets */}
              <div className="space-y-3">
                <span className="block text-sm font-bold text-neutral-700">Días Laborales Abiertos</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
                  {DAYS_OF_WEEK.map(day => {
                    const isOpen = openDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => handleDayToggle(day.id)}
                        className={`py-3 px-1 rounded-xl text-center font-bold text-sm transition-all border-2 ${
                          isOpen 
                            ? 'bg-black text-gold border-black' 
                            : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300'
                        }`}
                      >
                        {day.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RECEPCIONISTA IA */}
          {activeTab === 'ia' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-black m-0 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-gold-dark" />
                  Instrucciones del Recepcionista IA
                </h2>
                
                {/* AI Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`px-4 py-2 font-bold text-xs rounded-xl border transition-all ${
                    aiEnabled 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {aiEnabled ? '🟢 Recepcionista IA: Activo' : '🔴 Recepcionista IA: Inactivo'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700">Mensaje de Bienvenida de WhatsApp</label>
                  <input
                    type="text"
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                    placeholder="Ej: ¡Hola! Bienvenido a BarberLozz. ¿Quieres reservar una cita hoy?"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1.5 font-semibold">Este mensaje se envía de manera automática al abrir un nuevo chat en WhatsApp.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-neutral-700">Directrices Personalizadas de la IA (Prompt de Persona)</label>
                  <textarea
                    rows={4}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ej: Eres un recepcionista atento y educado. Llama al cliente por su nombre y ofrécele café si pregunta por servicios..."
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1.5 font-semibold">Configura la personalidad y comportamiento de tu recepcionista virtual. La IA combinará estas directrices con los horarios y precios cargados de forma dinámica.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: USUARIOS */}
          {activeTab === 'usuarios' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-black m-0 flex items-center gap-2">
                <Users className="w-5 h-5 text-gold-dark" />
                Equipo y Gestión de Roles
              </h2>

              {/* Simulated user list */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100">
                <div className="p-4 bg-neutral-50/50 flex justify-between items-center text-sm font-extrabold text-neutral-700">
                  <span>Colaborador / Empleado</span>
                  <span>Rol asignado</span>
                </div>

                <div className="p-4 flex justify-between items-center text-sm font-semibold text-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 text-gold flex items-center justify-center font-bold text-xs">M</div>
                    <span>Master Barber (Dueño)</span>
                  </div>
                  <span className="px-3 py-1 bg-neutral-900 text-white rounded-lg text-xs font-bold border border-neutral-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-gold" />
                    Dueño / Admin
                  </span>
                </div>

                <div className="p-4 flex justify-between items-center text-sm font-semibold text-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs">E</div>
                    <span>Barbero Junior</span>
                  </div>
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-bold border border-neutral-200">
                    Empleado
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Huge Save Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold hover:bg-gold-dark text-black font-black py-5 px-6 rounded-2xl text-xl flex items-center justify-center gap-2.5 cursor-pointer shadow-md border border-gold"
        >
          <Save className="w-7 h-7 stroke-[3]" />
          {loading ? 'Guardando...' : 'Guardar Todos los Ajustes'}
        </button>

      </form>
    </div>
  );
};
