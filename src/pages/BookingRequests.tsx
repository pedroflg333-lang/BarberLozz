import { useState, useEffect } from 'react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useCustomerStore } from '../stores/customerStore';
import { Card, Button, EmptyState } from '../ui';
import { Check, X, Calendar, Clock, Scissors, Loader } from 'lucide-react';
import type { Appointment } from '../types';

export const BookingRequests: React.FC = () => {
  const { appointments, fetchAppointments, confirmAppointment, cancelAppointment } = useAppointmentStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => { fetchAppointments(); fetchCustomers(); }, [fetchAppointments, fetchCustomers]);

  const pendingRequests = appointments.filter(apt => apt.origen === 'WEB' && apt.estado === 'pending')
    .sort((a, b) => `${b.fecha}T${b.hora}`.localeCompare(`${a.fecha}T${a.hora}`));

  const getCustomerName = (custId: string) => customers.find(c => c.id === custId)?.nombre || 'Cargando...';

  const handleAccept = async (apt: Appointment) => {
    setProcessingId(apt.id);
    await confirmAppointment(apt.id);
    setProcessingId(null);
  };

  const handleReject = async (apt: Appointment) => {
    setProcessingId(apt.id);
    await cancelAppointment(apt.id);
    setProcessingId(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-3xl font-black text-text-primary m-0">Solicitudes</h1>
        <p className="text-text-secondary m-0 mt-0.5 text-xs md:text-sm">Citas pendientes de confirmar.</p>
      </div>

      {pendingRequests.length === 0 ? (
        <EmptyState title="No hay solicitudes pendientes" description="Todas las citas están confirmadas o canceladas." />
      ) : (
        <div className="space-y-3">
          {pendingRequests.map(apt => (
            <Card key={apt.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-6">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gold/20 text-gold-dark flex items-center justify-center font-black text-base md:text-xl shrink-0">
                  {getCustomerName(apt.customer_id).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base md:text-xl font-bold text-text-primary m-0 truncate">{getCustomerName(apt.customer_id)}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs md:text-sm text-text-secondary font-semibold">
                    <span className="flex items-center gap-1"><Scissors className="w-3.5 h-3.5 text-gold-dark" />{apt.service?.nombre || 'Servicio'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gold-dark" />{new Date(apt.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gold-dark" />{apt.hora}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 md:shrink-0">
                <Button variant="primary" size="sm" icon={<Check className="w-4 h-4" />}
                  onClick={() => handleAccept(apt)}
                  disabled={processingId === apt.id}
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 md:flex-initial">
                  {processingId === apt.id ? <Loader className="w-4 h-4 animate-spin" /> : 'Aceptar'}
                </Button>
                <Button variant="outline" size="sm" icon={<X className="w-4 h-4" />}
                  onClick={() => handleReject(apt)}
                  disabled={processingId === apt.id}
                  className="text-red-600 border-red-200 hover:bg-red-50 flex-1 md:flex-initial">
                  Rechazar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
