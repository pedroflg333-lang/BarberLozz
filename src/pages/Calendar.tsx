import React, { useState, useEffect } from 'react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useCustomerStore } from '../stores/customerStore';
import { useServiceStore } from '../stores/serviceStore';
import { useChatStore } from '../stores/chatStore';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Check, 
  X, 
  Clock, 
  Scissors, 
  User, 
  Phone,
  DollarSign,
  Bot
} from 'lucide-react';
import type { Appointment } from '../types';

export const Calendar: React.FC = () => {
  const { appointments, fetchAppointments, updateAppointment } = useAppointmentStore();
  const { fetchCustomers } = useCustomerStore();
  const { fetchServices } = useServiceStore();
  const { conversations, messages, fetchConversations, fetchMessages } = useChatStore();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showModal, setShowAptModal] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchCustomers();
    fetchServices();
    fetchConversations();
  }, [fetchAppointments, fetchCustomers, fetchServices, fetchConversations]);

  // Auto-refresh every 15 seconds to pick up AI-created appointments
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAppointments();
      fetchCustomers();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchAppointments, fetchCustomers]);

  // Fetch client chat logs dynamically when opening details modal
  useEffect(() => {
    if (selectedApt && selectedApt.customer?.telefono) {
      const conv = conversations.find(c => c.customer_phone === selectedApt.customer?.telefono);
      if (conv) {
        fetchMessages(conv.id);
      }
    }
  }, [selectedApt, conversations, fetchMessages]);

  const getSelectedDateStr = () => {
    return selectedDate.toISOString().split('T')[0];
  };

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(selectedDate.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + 1);
    setSelectedDate(next);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date());
  };

  // Filter appointments for the SELECTED date (V3 Date string matches)
  const filteredAppointments = appointments.filter(apt => {
    return apt.fecha === getSelectedDateStr();
  }).sort((a, b) => a.hora.localeCompare(b.hora));

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }

    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Realizada
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Pendiente
          </span>
        );
    }
  };

  const getOriginBadge = (origin: string) => {
    switch (origin) {
      case 'IA':
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-wider border border-emerald-200">
            <Bot className="w-3 h-3 shrink-0" />
            IA WhatsApp
          </span>
        );
      case 'WEB':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black tracking-wider border border-blue-200">
            WEB
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-900 text-white text-[10px] font-black tracking-wider border border-neutral-800">
            MANUAL
          </span>
        );
    }
  };

  const handleCardClick = (apt: Appointment) => {
    setSelectedApt(apt);
    setShowAptModal(true);
  };

  const handleStatusChange = async (status: 'completed' | 'cancelled') => {
    if (!selectedApt) return;
    const res = await updateAppointment(selectedApt.id, { estado: status });
    if (res) {
      setShowAptModal(false);
      setSelectedApt(null);
    }
  };

  // Find related chat messages for active modal client phone
  const activeConv = selectedApt ? conversations.find(c => c.customer_phone === selectedApt.customer?.telefono) : null;
  const activeChatMessages = activeConv ? (messages[activeConv.id] || []) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Date Switcher Ribbon */}
      <div className="bg-white rounded-3xl p-4 border border-neutral-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-3 hover:bg-neutral-100 rounded-xl text-black transition-colors focus-gold cursor-pointer"
            aria-label="Día anterior"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <div className="text-center min-w-[200px]">
            <h2 className="text-2xl font-black text-black m-0 capitalize">
              {formatDateLabel(selectedDate)}
            </h2>
            <p className="text-sm text-neutral-500 m-0 mt-1 font-semibold">
              {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <button
            onClick={handleNextDay}
            className="p-3 hover:bg-neutral-100 rounded-xl text-black transition-colors focus-gold cursor-pointer"
            aria-label="Siguiente día"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        <button
          onClick={handleSetToday}
          className="bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold px-6 py-3 rounded-2xl text-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <CalendarIcon className="w-5 h-5" />
          Volver a Hoy
        </button>
      </div>

      {/* Appointments Day List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-neutral-200 p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
              <CalendarIcon className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-black m-0">No hay citas registradas</h3>
            <p className="text-neutral-500 m-0 max-w-sm mx-auto text-lg">
              No tienes ninguna cita agendada para este día. ¡Crea una nueva pulsando el botón superior!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAppointments.map((apt) => {
              const customerName = apt.customer?.nombre || 'Cliente General';
              const serviceName = apt.service?.nombre || 'Servicio';
              const serviceColor = apt.service?.color || '#D4AF37';

              return (
                <div
                  key={apt.id}
                  onClick={() => handleCardClick(apt)}
                  className={`bg-white rounded-3xl border border-neutral-200 shadow-sm hover:shadow-md transition-all p-6 cursor-pointer flex flex-col justify-between gap-4 border-l-8`}
                  style={{ borderLeftColor: serviceColor }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-black">
                        <Clock className="w-5 h-5 text-neutral-500 shrink-0" />
                        <span className="text-2xl font-black">
                          {apt.hora}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-black line-clamp-1 m-0">
                        {customerName}
                      </h3>
                      <p className="text-base text-neutral-500 font-semibold m-0 flex items-center gap-1.5 truncate">
                        <Scissors className="w-4 h-4 text-gold shrink-0" />
                        {serviceName} • {apt.service?.duracion} min
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {getStatusBadge(apt.estado)}
                      {getOriginBadge(apt.origen)}
                    </div>
                  </div>

                  {apt.notes && (
                    <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-100 text-neutral-600 text-sm line-clamp-2">
                      {apt.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-neutral-100 pt-3 mt-1 shrink-0">
                    <span className="text-xs text-neutral-400">Pulsa para ver ficha y chat IA</span>
                    <span className="text-xl font-black text-black">{apt.price_charged}€</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPREHENSIVE V3 APPOINTMENT DETAILS & CHAT MODAL */}
      {showModal && selectedApt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-neutral-100 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
              <h2 className="text-2xl font-black text-black m-0">Detalles de la Reserva</h2>
              <button 
                onClick={() => setShowAptModal(false)}
                className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer text-neutral-500"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Modal Body: Two column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Column 1: Client and Booking Details */}
              <div className="space-y-4">
                <span className="block text-sm font-black text-neutral-400 uppercase tracking-wider">Ficha Cliente & Reserva</span>
                
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold-dark flex items-center justify-center font-black">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-neutral-400 block font-bold">Cliente</span>
                      <span className="text-base font-extrabold text-black block">{selectedApt.customer?.nombre || 'Cliente General'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-black">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-neutral-400 block font-bold">WhatsApp</span>
                      <span className="text-base font-extrabold text-black block">+{selectedApt.customer?.telefono}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-black">
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-neutral-400 block font-bold">Servicio solicitado</span>
                      <span className="text-base font-extrabold text-black block">{selectedApt.service?.nombre} ({selectedApt.service?.duracion} min)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-black">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-neutral-400 block font-bold">Importe Cobrado</span>
                      <span className="text-base font-extrabold text-black block">{selectedApt.price_charged}€</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-3.5 mt-2">
                    <div>
                      <span className="text-xs text-neutral-400 block font-bold">Visitas Totales</span>
                      <span className="text-lg font-black text-neutral-900 block">{selectedApt.customer?.numero_visitas || 0} visitas</span>
                    </div>
                    <div>
                      <span className="text-xs text-neutral-400 block font-bold">Última Visita</span>
                      <span className="text-sm font-bold text-neutral-800 block truncate">
                        {selectedApt.customer?.ultima_visita 
                          ? new Date(selectedApt.customer.ultima_visita).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                          : 'Primera cita'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedApt.notes && (
                  <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                    <span className="text-xs text-neutral-400 font-bold block">Notas técnicas</span>
                    <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-100 text-neutral-700 text-sm">
                      {selectedApt.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Stateful WhatsApp Conversation logs */}
              <div className="flex flex-col h-[320px] md:h-full min-h-[300px] border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50/50">
                <div className="bg-neutral-900 text-white p-3 flex items-center gap-2 shrink-0">
                  <Bot className="w-5 h-5 text-gold" />
                  <span className="text-xs font-bold uppercase tracking-wider">Historial de WhatsApp IA</span>
                </div>
                
                {/* Scrollable messages box */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs bg-neutral-100/40">
                  {activeChatMessages.length === 0 ? (
                    <div className="text-center py-20 text-neutral-400 font-medium">No hay mensajes registrados para este teléfono.</div>
                  ) : (
                    activeChatMessages.map(msg => {
                      const isIncoming = msg.direction === 'incoming';
                      return (
                        <div key={msg.id} className={`flex w-full ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-xl p-2.5 shadow-sm ${
                            isIncoming ? 'bg-white text-black rounded-tl-none' : 'bg-[#E1F3D4] text-black rounded-tr-none'
                          }`}>
                            <p className="m-0 leading-normal font-semibold whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Quick Actions Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-neutral-100 shrink-0">
              {selectedApt.estado !== 'completed' && (
                <button
                  onClick={() => handleStatusChange('completed')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 text-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-6 h-6 stroke-[3]" />
                  Marcar Realizada
                </button>
              )}
              
              {selectedApt.estado !== 'cancelled' && (
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 text-lg transition-colors cursor-pointer animate-pulse"
                >
                  <X className="w-6 h-6 stroke-[3]" />
                  Cancelar Cita
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
