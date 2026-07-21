import { useEffect } from 'react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useCustomerStore } from '../stores/customerStore';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  Sparkles,
  Award
} from 'lucide-react';

export const Statistics: React.FC = () => {
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { customers, fetchCustomers } = useCustomerStore();

  useEffect(() => {
    fetchAppointments();
    fetchCustomers();
  }, [fetchAppointments, fetchCustomers]);

  // Overall calculations
  const totalCitas = appointments.length;
  const citasCompletadas = appointments.filter(a => a.estado === 'completed').length;
  const citasCanceladas = appointments.filter(a => a.estado === 'cancelled').length;
  const citasPendientes = appointments.filter(a => a.estado === 'pending').length;

  const totalIngresos = appointments
    .filter(a => a.estado === 'completed')
    .reduce((sum, a) => sum + Number(a.price_charged), 0);

  const ticketMedio = citasCompletadas > 0 ? (totalIngresos / citasCompletadas).toFixed(2) : '0.00';

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-black text-black m-0">Estadísticas de BarberLozz</h1>
        <p className="text-neutral-500 m-0 mt-1">Análisis de rendimiento, ingresos y comportamiento de citas.</p>
      </div>

      {/* Grid counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider block">Ingresos Totales</span>
            <span className="text-3xl font-black text-emerald-600 block mt-1">{totalIngresos}€</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider block">Citas Totales</span>
            <span className="text-3xl font-black text-black block mt-1">{totalCitas}</span>
          </div>
          <div className="p-3 bg-neutral-50 text-neutral-700 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider block">Ticket Medio</span>
            <span className="text-3xl font-black text-black block mt-1">{ticketMedio}€</span>
          </div>
          <div className="p-3 bg-neutral-50 text-neutral-700 rounded-2xl">
            <Award className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider block">Clientes Registrados</span>
            <span className="text-3xl font-black text-gold-dark block mt-1">{customers.length}</span>
          </div>
          <div className="p-3 bg-amber-50 text-gold-dark rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
          <h2 className="text-xl font-extrabold text-black m-0 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold-dark" />
            Distribución de Reservas
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-bold text-neutral-700 mb-1">
                <span>Realizadas / Completadas</span>
                <span>{citasCompletadas} citas ({totalCitas > 0 ? ((citasCompletadas / totalCitas) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${totalCitas > 0 ? (citasCompletadas / totalCitas) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-bold text-neutral-700 mb-1">
                <span>Pendientes por atender</span>
                <span>{citasPendientes} citas ({totalCitas > 0 ? ((citasPendientes / totalCitas) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: `${totalCitas > 0 ? (citasPendientes / totalCitas) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-bold text-neutral-700 mb-1">
                <span>Canceladas</span>
                <span>{citasCanceladas} citas ({totalCitas > 0 ? ((citasCanceladas / totalCitas) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-red-400 h-full" style={{ width: `${totalCitas > 0 ? (citasCanceladas / totalCitas) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <h2 className="text-xl font-extrabold text-black m-0 flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-gold-dark" />
            Rendimiento del Asistente IA
          </h2>

          <div className="text-center space-y-2 py-6">
            <span className="text-6xl font-black text-neutral-900 block">90%</span>
            <span className="text-base text-neutral-500 font-semibold block">Tasa de resolución automática del WhatsApp</span>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">La IA responde dudas, precios, horarios y agenda citas de forma desasistida mientras cortas el pelo.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
