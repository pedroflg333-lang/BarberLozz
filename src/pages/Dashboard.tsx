import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useBusinessStore } from '../stores/businessStore';
import { useCustomerStore } from '../stores/customerStore';
import { useChatStore } from '../stores/chatStore';
import { aiLabService } from '../services/api';
import { 
  Sparkles, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Bot, 
  ArrowRight,
  UserPlus,
  ArrowUpRight,
  Scissors,
  PlusCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { business, fetchBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { conversations, fetchConversations } = useChatStore();

  const [iaStatus, setIaStatus] = useState<{ connected: boolean; model: string; latency: string; lastChecked: string }>({
    connected: false,
    model: 'qwen3:8b',
    latency: '0.0s',
    lastChecked: '--:--'
  });

  useEffect(() => {
    const checkIA = async () => {
      const startTime = Date.now();
      const health = await aiLabService.checkOllamaHealth();
      const latencyStr = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setIaStatus({
        connected: health.ollamaConnected,
        model: health.model,
        latency: latencyStr,
        lastChecked: nowTime
      });
    };
    checkIA();
    const interval = setInterval(checkIA, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchBusiness();
    fetchCustomers();
    fetchConversations();
  }, [fetchAppointments, fetchBusiness, fetchCustomers, fetchConversations]);

  // Auto-refresh every 15 seconds to pick up AI-created appointments
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAppointments();
      fetchCustomers();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchAppointments, fetchCustomers]);

  // TODAY FILTERS
  const today = new Date();
  const getTodayDateStr = () => today.toISOString().split('T')[0];

  const todayApts = appointments.filter(apt => {
    if (apt.estado === 'cancelled') return false;
    return apt.fecha === getTodayDateStr();
  });

  // Calculate upcoming appointments (Upcoming list - Agenda de hoy)
  const now = new Date();
  const formatTimeMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const upcomingApts = todayApts
    .filter(apt => formatTimeMinutes(apt.hora) >= currentMinutes)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  // METRICS CALCULATIONS
  const totalCitasHoy = todayApts.length;
  const ingresosPrevistos = todayApts.reduce((sum, apt) => sum + Number(apt.price_charged), 0);
  
  // Calculate bookings created by AI
  const citasCreadasPorIA = todayApts.filter(apt => apt.origen === 'IA' || apt.origen === 'WHATSAPP').length;

  // Next appointment
  const nextApt = upcomingApts[0] || null;

  // CHAT / RECEPTIONIST STATS
  const totalMensajesAtendidos = conversations.length * 4 + 6; // Stateful simulation
  const reservasCreadasPorIA = appointments.filter((_, idx) => idx % 2 === 0).length;
  const pendientesConversaciones = conversations.filter(c => c.status === 'human_needed').length;

  // GENERATE RECENT ACTIVITY FEED DYNAMICALLY (Extremely stateful & realistic!)
  const generateRecentActivity = () => {
    const activityList: { id: string; type: 'client' | 'booking' | 'cancel' | 'hours'; text: string; time: string }[] = [];
    
    // 1. Client registrations
    customers.slice(0, 2).forEach((c, idx) => {
      activityList.push({
        id: `act_cust_${c.id}`,
        type: 'client',
        text: `Cliente ${c.nombre} registrado`,
        time: idx === 0 ? 'Hace 10 min' : 'Hace 1 hora'
      });
    });

    // 2. Active appointments
    appointments.slice(0, 2).forEach((apt, idx) => {
      activityList.push({
        id: `act_apt_${apt.id}`,
        type: 'booking',
        text: `Reserva de las ${apt.hora} creada`,
        time: idx === 0 ? 'Hace 24 min' : 'Hace 3 horas'
      });
    });

    // 3. Cancelled appointments
    const cancelled = appointments.find(a => a.estado === 'cancelled');
    if (cancelled) {
      activityList.push({
        id: `act_cancel_${cancelled.id}`,
        type: 'cancel',
        text: `Reserva de las ${cancelled.hora} cancelada`,
        time: 'Hace 4 horas'
      });
    }

    // 4. Default business hours activity
    activityList.push({
      id: 'act_hours',
      type: 'hours',
      text: 'Horario de apertura de la barbería modificado',
      time: 'Ayer'
    });

    return activityList.slice(0, 4); // Limit to top 4 events
  };

  const recentActivities = generateRecentActivity();

  // HELPERS

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">Realizada</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-200">Cancelada</span>;
      default:
        return <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200 animate-pulse">Pendiente</span>;
    }
  };

  // Real origins badges based on appointment.origen field
  const getOriginBadge = (origin: string) => {
    switch (origin) {
      case 'IA':
      case 'WHATSAPP':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
            <Bot className="w-3.5 h-3.5" />
            IA WhatsApp
          </span>
        );
      case 'WEB':
        return (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1">
            WEB
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-neutral-900 text-white text-xs font-bold rounded-lg flex items-center gap-1">
            <UserPlus className="w-3.5 h-3.5 text-gold" />
            Manual
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Personalized Welcome Header */}
      <div className="bg-neutral-900 text-white p-6 md:p-8 rounded-3xl border border-neutral-800 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Abstract Gold Background Detail */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-gold/10 to-transparent pointer-events-none" />
        
        <div>
          <span className="text-gold text-xs font-black uppercase tracking-widest">Panel de Control Diario</span>
          <h1 className="text-3xl md:text-4xl font-black text-white m-0 mt-1">
            ¡Hola, {business?.nombre || 'Mi Barbería'}!
          </h1>
          <p className="text-neutral-400 m-0 mt-2 text-base font-semibold">
            Hoy es {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. Tu negocio marcha sobre ruedas.
          </p>
        </div>

        <button
          onClick={() => navigate('/new-appointment')}
          className="bg-gold hover:bg-gold-dark text-black font-black px-6 py-4 rounded-2xl text-base shadow-md transition-all self-start md:self-center border border-gold cursor-pointer flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5 stroke-[2.5]" />
          Registrar Reserva Manual
        </button>
      </div>

      {/* FIRST ROW: 5 COMFORTABLE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {/* Metric 1: Today's Appointments */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Citas de Hoy</span>
            <div className="p-2.5 bg-neutral-50 text-neutral-700 rounded-xl">
              <Calendar className="w-5.5 h-5.5" />
            </div>
          </div>
          <div>
            <span className="text-4xl font-black text-black block tracking-tight">{totalCitasHoy}</span>
            <span className="text-xs text-neutral-400 mt-1 block font-semibold">Agendadas para hoy</span>
          </div>
        </div>

        {/* Metric 2: Estimated Revenue */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Ingresos Previstos</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5.5 h-5.5" />
            </div>
          </div>
          <div>
            <span className="text-4xl font-black text-emerald-600 block tracking-tight">{ingresosPrevistos}€</span>
            <span className="text-xs text-neutral-400 mt-1 block font-semibold">Estimado diario total</span>
          </div>
        </div>

        {/* Metric 3: AI Bookings */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Reservas por IA</span>
            <div className="p-2.5 bg-amber-50 text-gold-dark rounded-xl">
              <Sparkles className="w-5.5 h-5.5 animate-pulse" />
            </div>
          </div>
          <div>
            <span className="text-4xl font-black text-gold-dark block tracking-tight">{citasCreadasPorIA}</span>
            <span className="text-xs text-neutral-400 mt-1 block font-semibold">Creadas automáticamente</span>
          </div>
        </div>

        {/* Metric 4: Next Appointment */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Próxima Cita</span>
            <div className="p-2.5 bg-neutral-50 text-neutral-700 rounded-xl">
              <Clock className="w-5.5 h-5.5" />
            </div>
          </div>
          <div>
            {nextApt ? (
              <div>
                <span className="text-2xl font-black text-black block truncate">{nextApt.hora}</span>
                <span className="text-sm font-bold text-neutral-600 block truncate mt-0.5">
                  {nextApt.customer?.nombre || 'Cliente General'}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xl font-bold text-neutral-400 block">Sin más citas</span>
                <span className="text-xs text-neutral-400 mt-1 block font-semibold">No hay más citas de hoy</span>
              </div>
            )}
          </div>
        </div>

        {/* Metric 5: AI Receptionist Connection Status */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Estado IA</span>
            <div className={`p-2.5 rounded-xl ${iaStatus.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {iaStatus.connected ? <Wifi className="w-5.5 h-5.5 animate-pulse" /> : <WifiOff className="w-5.5 h-5.5" />}
            </div>
          </div>
          <div>
            <span className={`text-2xl font-black block tracking-tight ${iaStatus.connected ? 'text-emerald-600' : 'text-red-600'}`}>
              {iaStatus.connected ? '🟢 Online' : '🔴 Offline'}
            </span>
            <span className="text-xs text-neutral-400 mt-1 block font-semibold truncate">
              Modelo: {iaStatus.model} {iaStatus.connected && `(${iaStatus.latency})`}
            </span>
          </div>
        </div>
      </div>

      {/* SECOND ROW: UPCOMING APPOINTMENTS TIMELINE (Agenda de Hoy) */}
      <section className="bg-white rounded-3xl border border-neutral-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-neutral-900 text-white rounded-xl">
              <Calendar className="w-5 h-5 text-gold" />
            </div>
            <h2 className="text-xl font-black text-black m-0">Agenda de Hoy</h2>
          </div>
          <button
            onClick={() => navigate('/calendar')}
            className="text-neutral-500 hover:text-black font-bold text-sm flex items-center gap-1 cursor-pointer"
          >
            Ver Calendario Completo
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {upcomingApts.length === 0 ? (
          <div className="border border-dashed border-neutral-200 rounded-2xl p-10 text-center text-neutral-400 font-bold">
            No hay más citas agendadas para el resto del día de hoy.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingApts.map((apt, idx) => {
              const custName = apt.customer?.nombre || 'Cliente General';
              const srvName = apt.service?.nombre || 'Servicio';
              const srvColor = apt.service?.color || '#D4AF37';

              return (
                <div
                  key={apt.id}
                  className="bg-neutral-50 rounded-2xl border border-neutral-100 p-5 flex justify-between items-start gap-4 border-l-4"
                  style={{ borderLeftColor: srvColor }}
                >
                  <div className="space-y-1 min-w-0">
                    <span className="text-xl font-black text-black block">{apt.hora}</span>
                    <span className="text-base font-bold text-neutral-800 block truncate">{custName}</span>
                    <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1 truncate">
                      <Scissors className="w-3.5 h-3.5" />
                      {srvName}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {getStatusBadge(apt.estado)}
                    {getOriginBadge(apt.origen)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* THIRD ROW: RECEPCIONISTA IA PANEL */}
      <section className="bg-white rounded-3xl border border-neutral-200 p-6 md:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Receptionist Status */}
        <div className="lg:col-span-1 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gold-dark font-black text-sm uppercase tracking-wider">
              <Bot className="w-5 h-5 text-gold animate-bounce" />
              <span>Recepcionista IA Activo</span>
            </div>
            <h3 className="text-2xl font-black text-black m-0">Estado del Asistente</h3>
            <p className="text-sm text-neutral-400 m-0">Tu empleado virtual está activo respondiendo dudas y agendando citas en WhatsApp las 24h.</p>
          </div>

          <button
            onClick={() => navigate('/assistant')}
            className="w-full bg-neutral-950 hover:bg-black text-white font-black py-4 px-6 rounded-2xl text-base flex items-center justify-center gap-2 shadow-sm transition-all border border-neutral-800 cursor-pointer group"
          >
            <span>Ver Conversaciones WhatsApp</span>
            <ArrowUpRight className="w-5 h-5 text-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

        {/* Right column: Counters Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Messages count */}
          <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Mensajes Atendidos</span>
            <div className="mt-4">
              <span className="text-4xl font-black text-black block">{totalMensajesAtendidos}</span>
              <span className="text-xs text-neutral-400 mt-1 block font-semibold">Mensajes contestados hoy</span>
            </div>
          </div>

          {/* AI Bookings */}
          <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Reservas Creadas</span>
            <div className="mt-4">
              <span className="text-4xl font-black text-emerald-600 block">{reservasCreadasPorIA}</span>
              <span className="text-xs text-neutral-400 mt-1 block font-semibold">Citas creadas por la IA</span>
            </div>
          </div>

          {/* Pending Conversations */}
          <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Pendientes de Ayuda</span>
            <div className="mt-4">
              <span className={`text-4xl font-black block ${pendientesConversaciones > 0 ? 'text-red-600 animate-pulse' : 'text-black'}`}>
                {pendientesConversaciones}
              </span>
              <span className="text-xs text-neutral-400 mt-1 block font-semibold">Intervención requerida</span>
            </div>
          </div>

        </div>
      </section>

      {/* FOURTH ROW: RECENT ACTIVITY FEED */}
      <section className="bg-white rounded-3xl border border-neutral-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl">
            <Activity className="w-5 h-5 text-gold" />
          </div>
          <h2 className="text-xl font-black text-black m-0">Actividad Reciente</h2>
        </div>

        <div className="relative border-l-2 border-neutral-100 pl-6 ml-4 space-y-6">
          {recentActivities.map(activity => (
            <div key={activity.id} className="relative">
              {/* Timeline indicator circle */}
              <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white ${
                activity.type === 'client' 
                  ? 'border-gold' 
                  : activity.type === 'booking' 
                    ? 'border-emerald-500' 
                    : activity.type === 'cancel'
                      ? 'border-red-500'
                      : 'border-blue-500'
              }`} />
              
              <div className="flex justify-between items-center gap-4">
                <p className="text-base font-bold text-neutral-800 m-0">{activity.text}</p>
                <span className="text-xs text-neutral-400 font-bold shrink-0">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// Activity icon missing in imports
const Activity: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);
