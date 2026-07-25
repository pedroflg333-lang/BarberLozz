import { useEffect, useState } from 'react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { Check, X, Clock, Scissors, User, Phone, Calendar, FileText } from 'lucide-react';
import type { Appointment } from '../types';

export const BookingRequests: React.FC = () => {
  const { pendingRequests, fetchPendingRequests, confirmAppointment, rejectAppointment } = useAppointmentStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 10000);
    return () => clearInterval(interval);
  }, [fetchPendingRequests]);

  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    await confirmAppointment(id);
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    await rejectAppointment(id);
    setActionLoading(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-black m-0">Solicitudes de Citas</h1>
          <p className="text-neutral-500 m-0 mt-0.5 text-xs md:text-sm">Acepta o rechaza las reservas pendientes.</p>
        </div>
        {pendingRequests.length > 0 && (
          <span className="bg-amber-500 text-white font-black px-3 py-1.5 rounded-lg text-sm">{pendingRequests.length} pendientes</span>
        )}
      </div>

      {pendingRequests.length === 0 ? (
        <div className="bg-white rounded-2xl md:rounded-3xl border border-neutral-200 p-8 md:p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-neutral-50 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-neutral-300 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-black m-0 mt-4">No hay solicitudes pendientes</h3>
          <p className="text-sm text-neutral-400 m-0 mt-1">Las nuevas reservas web aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {pendingRequests.map((apt: Appointment) => (
            <div key={apt.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 md:p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center font-bold text-amber-600 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold text-black truncate m-0">{apt.customer?.nombre || 'Cliente'}</h3>
                    <span className="text-xs text-neutral-500 flex items-center gap-1"><Phone className="w-3 h-3" />+{apt.customer?.telefono || apt.customer_id}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 animate-pulse shrink-0">
                    Pendiente
                  </span>
                </div>

                <div className="bg-neutral-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="font-bold text-black">{apt.service?.nombre || 'Servicio'}</span>
                    <span className="font-black text-black ml-auto">{apt.price_charged}€</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="text-neutral-700">{formatDate(apt.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="font-bold text-black">{apt.hora}</span>
                  </div>
                  {apt.notes && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                      <span className="text-neutral-600 italic text-xs">"{apt.notes}"</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-100 grid grid-cols-2">
                <button onClick={() => handleReject(apt.id)} disabled={actionLoading === apt.id}
                  className="flex items-center justify-center gap-1.5 py-3.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50">
                  <X className="w-4 h-5" /> Rechazar
                </button>
                <button onClick={() => handleConfirm(apt.id)} disabled={actionLoading === apt.id}
                  className="flex items-center justify-center gap-1.5 py-3.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer border-l border-neutral-100 disabled:opacity-50">
                  {actionLoading === apt.id ? (
                    <span className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                  ) : <Check className="w-4 h-5" />}
                  Aceptar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
