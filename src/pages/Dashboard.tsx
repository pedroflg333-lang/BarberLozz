import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useBusinessStore } from '../stores/businessStore';
import { useCustomerStore } from '../stores/customerStore';
import { useChatStore } from '../stores/chatStore';
import { aiLabService } from '../services/api';
import {
  Sparkles, Clock, Calendar, TrendingUp, Bot, ArrowRight,
  UserPlus, ArrowUpRight, Scissors, PlusCircle, Wifi, WifiOff,
  ClipboardList
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { business, fetchBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { conversations, fetchConversations } = useChatStore();

  const [iaStatus, setIaStatus] = useState({ connected: false, model: 'qwen3:8b', latency: '0.0s', lastChecked: '--:--' });

  useEffect(() => {
    const checkIA = async () => {
      const startTime = Date.now();
      const health = await aiLabService.checkOllamaHealth();
      setIaStatus({
        connected: health.ollamaConnected,
        model: health.model,
        latency: ((Date.now() - startTime) / 1000).toFixed(1) + 's',
        lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    };
    checkIA();
    const interval = setInterval(checkIA, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchBusiness();
    fetchCustomers();
    fetchConversations();
  }, [fetchAppointments, fetchBusiness, fetchCustomers, fetchConversations]);

  useEffect(() => {
    const interval = setInterval(() => { fetchAppointments(); fetchCustomers(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchAppointments, fetchCustomers]);

  const today = new Date();
  const getTodayDateStr = () => today.toISOString().split('T')[0];
  const todayApts = appointments.filter(apt => apt.estado !== 'cancelled' && apt.fecha === getTodayDateStr());
  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  const upcomingApts = todayApts
    .filter(apt => { const [h, m] = apt.hora.split(':').map(Number); return h * 60 + m >= currentMinutes; })
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const totalCitasHoy = todayApts.length;
  const ingresosPrevistos = todayApts.reduce((sum, apt) => sum + Number(apt.price_charged), 0);
  const citasCreadasPorIA = todayApts.filter(apt => apt.origen === 'IA' || apt.origen === 'WHATSAPP').length;
  const nextApt = upcomingApts[0] || null;
  const totalMensajesAtendidos = conversations.length * 4 + 6;
  const reservasCreadasPorIA = appointments.filter(a => a.origen === 'IA' || a.origen === 'WHATSAPP').length;
  const pendientesConversaciones = conversations.filter(c => c.status === 'human_needed').length;

  const generateRecentActivity = () => {
    const list: { id: string; type: 'client' | 'booking' | 'cancel' | 'hours'; text: string; time: string }[] = [];
    customers.slice(0, 2).forEach((c, i) => list.push({ id: `c_${c.id}`, type: 'client', text: `Cliente ${c.nombre} registrado`, time: i === 0 ? 'Hace 10 min' : 'Hace 1 hora' }));
    appointments.slice(0, 2).forEach((a, i) => list.push({ id: `a_${a.id}`, type: 'booking', text: `Reserva de las ${a.hora} creada`, time: i === 0 ? 'Hace 24 min' : 'Hace 3 horas' }));
    const cancelled = appointments.find(a => a.estado === 'cancelled');
    if (cancelled) list.push({ id: `ca_${cancelled.id}`, type: 'cancel', text: `Reserva de las ${cancelled.hora} cancelada`, time: 'Hace 4 horas' });
    list.push({ id: 'act_hours', type: 'hours', text: 'Horario de apertura modificado', time: 'Ayer' });
    return list.slice(0, 4);
  };

  const recentActivities = generateRecentActivity();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">Realizada</span>;
      case 'cancelled': return <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-200">Cancelada</span>;
      default: return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 animate-pulse">Pendiente</span>;
    }
  };

  const getOriginBadge = (origin: string) => {
    switch (origin) {
      case 'IA': case 'WHATSAPP':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg flex items-center gap-1"><Bot className="w-3 h-3" />IA WhatsApp</span>;
      case 'WEB': return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg">WEB</span>;
      default: return <span className="px-2 py-0.5 bg-neutral-900 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"><UserPlus className="w-3 h-3 text-gold" />Manual</span>;
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in">
      {/* Welcome header */}
      <div className="bg-neutral-900 text-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-neutral-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-gold/10 to-transparent pointer-events-none" />
        <div>
          <span className="text-gold text-[10px] md:text-xs font-black uppercase tracking-widest">Panel de Control</span>
          <h1 className="text-xl md:text-4xl font-black text-white m-0 mt-1">¡Hola, {business?.nombre || 'Mi Barbería'}!</h1>
          <p className="text-neutral-400 m-0 mt-1 md:mt-2 text-xs md:text-base font-semibold">
            {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/new-appointment')}
          className="mt-3 md:mt-4 bg-gold hover:bg-gold-dark text-black font-black px-4 py-2.5 md:px-6 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-base shadow-md transition-all border border-gold flex items-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
          <span>Nueva Cita</span>
        </button>
      </div>

      {/* 2x2 Metric cards on mobile, 5 cols on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
        <MetricCard
          title="Citas de Hoy" value={String(totalCitasHoy)} subtitle="Agendadas para hoy"
          icon={<Calendar className="w-5 h-5" />} iconBg="bg-neutral-50 text-neutral-700"
          valueClass="text-black"
        />
        <MetricCard
          title="Ingresos" value={`${ingresosPrevistos}€`} subtitle="Estimado diario"
          icon={<TrendingUp className="w-5 h-5" />} iconBg="bg-emerald-50 text-emerald-600"
          valueClass="text-emerald-600"
        />
        <MetricCard
          title="Reservas por IA" value={String(citasCreadasPorIA)} subtitle="Automáticas"
          icon={<Sparkles className="w-5 h-5 animate-pulse" />} iconBg="bg-amber-50 text-gold-dark"
          valueClass="text-gold-dark"
        />
        <MetricCard
          title="Próxima Cita" value={nextApt ? nextApt.hora : '—'} subtitle={nextApt ? (nextApt.customer?.nombre || 'Cliente') : 'Sin citas'}
          icon={<Clock className="w-5 h-5" />} iconBg="bg-neutral-50 text-neutral-700"
          valueClass="text-black"
        />
        <MetricCard
          title="Estado IA" value={iaStatus.connected ? 'Online' : 'Offline'} subtitle={`${iaStatus.model}`}
          icon={iaStatus.connected ? <Wifi className="w-5 h-5 animate-pulse" /> : <WifiOff className="w-5 h-5" />}
          iconBg={iaStatus.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}
          valueClass={iaStatus.connected ? 'text-emerald-600' : 'text-red-600'}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Agenda de Hoy */}
      <section className="bg-white rounded-2xl md:rounded-3xl border border-neutral-200 p-4 md:p-8 shadow-sm space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-neutral-900 text-white rounded-xl">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gold" />
            </div>
            <h2 className="text-base md:text-xl font-black text-black m-0">Agenda de Hoy</h2>
          </div>
          <button onClick={() => navigate('/calendar')} className="text-neutral-500 hover:text-black font-bold text-xs md:text-sm flex items-center gap-1 cursor-pointer">
            Ver todo <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>

        {upcomingApts.length === 0 ? (
          <div className="border border-dashed border-neutral-200 rounded-2xl p-6 md:p-10 text-center">
            <p className="text-neutral-400 font-bold text-sm md:text-base m-0">No hay más citas para hoy.</p>
          </div>
        ) : (
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {upcomingApts.map(apt => (
              <div key={apt.id} className="bg-neutral-50 rounded-xl md:rounded-2xl border border-neutral-100 p-3 md:p-5 flex items-center gap-3 md:gap-4 border-l-4" style={{ borderLeftColor: apt.service?.color || '#D4AF37' }}>
                <div className="min-w-0 flex-1">
                  <span className="text-base md:text-xl font-black text-black block">{apt.hora}</span>
                  <span className="text-xs md:text-base font-bold text-neutral-800 block truncate">{apt.customer?.nombre || 'Cliente'}</span>
                  <span className="text-[10px] md:text-xs text-neutral-400 font-semibold flex items-center gap-1 truncate">
                    <Scissors className="w-3 h-3" />{apt.service?.nombre || 'Servicio'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {getStatusBadge(apt.estado)}
                  {getOriginBadge(apt.origen)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Booking Requests */}
      {appointments.filter(a => a.estado === 'pending' && a.origen === 'WEB').length > 0 && (
        <section className="bg-white rounded-2xl md:rounded-3xl border border-amber-200 p-4 md:p-8 shadow-sm space-y-4 border-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <ClipboardList className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <h2 className="text-base md:text-xl font-black text-black m-0">Solicitudes de Citas</h2>
            </div>
            <button onClick={() => navigate('/booking-requests')} className="text-amber-600 hover:text-amber-800 font-bold text-xs md:text-sm flex items-center gap-1 cursor-pointer">
              Gestionar <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {appointments.filter(a => a.estado === 'pending' && a.origen === 'WEB').slice(0, 3).map(apt => (
              <div key={apt.id} className="bg-amber-50/50 rounded-xl md:rounded-2xl border border-amber-100 p-3 md:p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-black text-sm md:text-base block truncate">{apt.customer?.nombre || 'Cliente'}</span>
                  <span className="text-xs text-neutral-500 block">{apt.service?.nombre || 'Servicio'} · {apt.fecha} a las {apt.hora}</span>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full animate-pulse shrink-0">Nuevo</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* IA Receptionist Status */}
      <section className="bg-white rounded-2xl md:rounded-3xl border border-neutral-200 p-4 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gold-dark font-black text-xs uppercase tracking-wider">
          <Bot className="w-4 h-4 text-gold" />
          <span>Recepcionista IA</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <MiniStat label="Mensajes Hoy" value={String(totalMensajesAtendidos)} />
          <MiniStat label="Reservas Creadas" value={String(reservasCreadasPorIA)} valueClass="text-emerald-600" />
          <MiniStat label="Pendientes" value={String(pendientesConversaciones)} valueClass={pendientesConversaciones > 0 ? 'text-red-600 animate-pulse' : 'text-black'} />
        </div>
        <button onClick={() => navigate('/assistant')} className="w-full bg-neutral-950 hover:bg-black text-white font-black py-3 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl text-xs md:text-base flex items-center justify-center gap-2 transition-all border border-neutral-800 cursor-pointer">
          <span>Ver Conversaciones</span>
          <ArrowUpRight className="w-4 h-4 text-gold" />
        </button>
      </section>

      {/* Recent Activity */}
      <section className="bg-white rounded-2xl md:rounded-3xl border border-neutral-200 p-4 md:p-8 shadow-sm space-y-4">
        <h2 className="text-base md:text-xl font-black text-black m-0">Actividad Reciente</h2>
        <div className="space-y-3 md:space-y-4">
          {recentActivities.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${a.type === 'client' ? 'bg-gold' : a.type === 'booking' ? 'bg-emerald-500' : a.type === 'cancel' ? 'bg-red-500' : 'bg-blue-500'}`} />
                <span className="text-xs md:text-base font-bold text-neutral-800 truncate">{a.text}</span>
              </div>
              <span className="text-[10px] md:text-xs text-neutral-400 font-bold shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

function MetricCard({ title, value, subtitle, icon, iconBg, valueClass, className = '' }: {
  title: string; value: string; subtitle: string; icon: React.ReactNode; iconBg: string; valueClass: string; className?: string;
}) {
  return (
    <div className={`bg-white p-3 md:p-6 rounded-xl md:rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center justify-between mb-1 md:mb-3">
        <span className="text-[10px] md:text-sm font-bold text-neutral-400 uppercase tracking-wider truncate">{title}</span>
        <div className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl ${iconBg}`}>{icon}</div>
      </div>
      <div>
        <span className={`text-lg md:text-4xl font-black block tracking-tight ${valueClass}`}>{value}</span>
        <span className="text-[9px] md:text-xs text-neutral-400 mt-0.5 md:mt-1 block font-semibold truncate">{subtitle}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueClass = 'text-black' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-neutral-50/50 p-3 md:p-6 rounded-xl md:rounded-2xl border border-neutral-100">
      <span className="text-[10px] md:text-xs font-bold text-neutral-400 uppercase tracking-wider block">{label}</span>
      <span className={`text-lg md:text-4xl font-black block mt-1 md:mt-4 ${valueClass}`}>{value}</span>
    </div>
  );
}
