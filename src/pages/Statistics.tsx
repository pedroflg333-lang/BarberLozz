import { useEffect, useMemo } from 'react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useCustomerStore } from '../stores/customerStore';
import { BarChart3, TrendingUp, Users, Calendar, Sparkles, Award } from 'lucide-react';

export const Statistics: React.FC = () => {
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { customers, fetchCustomers } = useCustomerStore();

  useEffect(() => {
    fetchAppointments();
    fetchCustomers();
  }, [fetchAppointments, fetchCustomers]);

  const totalCitas = appointments.length;
  const citasCompletadas = useMemo(() => appointments.filter(a => a.estado === 'completed').length, [appointments]);
  const citasCanceladas = useMemo(() => appointments.filter(a => a.estado === 'cancelled').length, [appointments]);
  const citasPendientes = useMemo(() => appointments.filter(a => a.estado === 'pending').length, [appointments]);

  const totalIngresos = useMemo(() => appointments
    .filter(a => a.estado === 'completed')
    .reduce((sum, a) => sum + Number(a.price_charged), 0), [appointments]);

  const ticketMedio = citasCompletadas > 0 ? (totalIngresos / citasCompletadas).toFixed(2) : '0.00';

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-3xl font-black text-black m-0">Estadísticas</h1>
        <p className="text-neutral-500 m-0 mt-0.5 text-xs md:text-sm">Rendimiento e ingresos.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] md:text-sm font-bold text-neutral-400 uppercase tracking-wider block">Ingresos</span>
            <span className="text-xl md:text-3xl font-black text-emerald-600 block mt-1">{totalIngresos}€</span>
          </div>
          <div className="p-2 md:p-3 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl">
            <TrendingUp className="w-5 h-6 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] md:text-sm font-bold text-neutral-400 uppercase tracking-wider block">Citas</span>
            <span className="text-xl md:text-3xl font-black text-black block mt-1">{totalCitas}</span>
          </div>
          <div className="p-2 md:p-3 bg-neutral-50 text-neutral-700 rounded-xl md:rounded-2xl">
            <Calendar className="w-5 h-6 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] md:text-sm font-bold text-neutral-400 uppercase tracking-wider block">Ticket Medio</span>
            <span className="text-xl md:text-3xl font-black text-black block mt-1">{ticketMedio}€</span>
          </div>
          <div className="p-2 md:p-3 bg-neutral-50 text-neutral-700 rounded-xl md:rounded-2xl">
            <Award className="w-5 h-6 md:w-6 md:h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] md:text-sm font-bold text-neutral-400 uppercase tracking-wider block">Clientes</span>
            <span className="text-xl md:text-3xl font-black text-gold-dark block mt-1">{customers.length}</span>
          </div>
          <div className="p-2 md:p-3 bg-amber-50 text-gold-dark rounded-xl md:rounded-2xl">
            <Users className="w-5 h-6 md:w-6 md:h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-neutral-200 shadow-sm space-y-4 md:space-y-6">
          <h2 className="text-base md:text-xl font-extrabold text-black m-0 flex items-center gap-2">
            <BarChart3 className="w-4 h-5 text-gold-dark" />Reservas
          </h2>
          <div className="space-y-3 md:space-y-4">
            {[
              { label: 'Completadas', count: citasCompletadas, color: 'bg-emerald-500' },
              { label: 'Pendientes', count: citasPendientes, color: 'bg-amber-500' },
              { label: 'Canceladas', count: citasCanceladas, color: 'bg-red-400' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs md:text-sm font-bold text-neutral-700 mb-1">
                  <span>{item.label}</span>
                  <span>{item.count} ({totalCitas > 0 ? ((item.count / totalCitas) * 100).toFixed(0) : 0}%)</span>
                </div>
                <div className="w-full bg-neutral-100 h-2 md:h-2.5 rounded-full overflow-hidden">
                  <div className={`${item.color} h-full`} style={{ width: `${totalCitas > 0 ? (item.count / totalCitas) * 100 : 0}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <h2 className="text-base md:text-xl font-extrabold text-black m-0 flex items-center gap-2 mb-4 md:mb-6">
            <Sparkles className="w-4 h-5 text-gold-dark" />Rendimiento IA
          </h2>
          <div className="text-center space-y-2 py-4 md:py-6">
            <span className="text-4xl md:text-6xl font-black text-neutral-900 block">90%</span>
            <span className="text-xs md:text-base text-neutral-500 font-semibold block">Tasa de resolución automática</span>
            <p className="text-[10px] md:text-xs text-neutral-400 max-w-xs mx-auto">La IA responde y agenda citas de forma desasistida.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
