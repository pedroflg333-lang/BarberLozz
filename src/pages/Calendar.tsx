import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useCustomerStore } from '../stores/customerStore';
import { useServiceStore } from '../stores/serviceStore';
import { useChatStore } from '../stores/chatStore';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Check, X, Clock, Scissors, User, Phone, DollarSign, Bot, PlusCircle
} from 'lucide-react';
import type { Appointment } from '../types';

export const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const { appointments, fetchAppointments, updateAppointment } = useAppointmentStore();
  const { fetchCustomers } = useCustomerStore();
  const { fetchServices } = useServiceStore();
  const { conversations, messages, fetchConversations, fetchMessages } = useChatStore();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showModal, setShowAptModal] = useState(false);
  const dayScrollRef = useRef<HTMLDivElement>(null);

  // Generate day row: 7 days starting from today
  const today = new Date();
  const dayRow = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  useEffect(() => {
    fetchAppointments(); fetchCustomers(); fetchServices(); fetchConversations();
  }, [fetchAppointments, fetchCustomers, fetchServices, fetchConversations]);

  useEffect(() => {
    const interval = setInterval(() => { fetchAppointments(); fetchCustomers(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchAppointments, fetchCustomers]);

  useEffect(() => {
    if (selectedApt && selectedApt.customer?.telefono) {
      const conv = conversations.find(c => c.customer_phone === selectedApt.customer?.telefono);
      if (conv) fetchMessages(conv.id);
    }
  }, [selectedApt, conversations, fetchMessages]);

  const getSelectedDateStr = () => selectedDate.toISOString().split('T')[0];

  // Scroll today into view on mount
  useEffect(() => {
    if (dayScrollRef.current) {
      const el = dayScrollRef.current.querySelector('[data-today]');
      if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  const filteredAppointments = appointments
    .filter(apt => apt.fecha === getSelectedDateStr())
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const formatDateLabel = (date: Date) => {
    const t = new Date();
    const tm = new Date(t); tm.setDate(t.getDate() + 1);
    const y = new Date(t); y.setDate(t.getDate() - 1);
    if (date.toDateString() === t.toDateString()) return 'Hoy';
    if (date.toDateString() === tm.toDateString()) return 'Mañana';
    if (date.toDateString() === y.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Realizada</span>;
      case 'cancelled': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Cancelada</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Pendiente</span>;
    }
  };

  const getOriginBadge = (origin: string) => {
    switch (origin) {
      case 'IA': case 'WHATSAPP': return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black border border-emerald-200"><Bot className="w-2.5 h-2.5" />IA</span>;
      case 'WEB': return <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[9px] font-black border border-blue-200">WEB</span>;
      default: return <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-neutral-900 text-white text-[9px] font-black border border-neutral-800">MANUAL</span>;
    }
  };

  const handleCardClick = (apt: Appointment) => { setSelectedApt(apt); setShowAptModal(true); };
  const handleStatusChange = async (status: 'completed' | 'cancelled') => {
    if (!selectedApt) return;
    const res = await updateAppointment(selectedApt.id, { estado: status });
    if (res) { setShowAptModal(false); setSelectedApt(null); }
  };

  const activeConv = selectedApt ? conversations.find(c => c.customer_phone === selectedApt.customer?.telefono) : null;
  const activeChatMessages = activeConv ? (messages[activeConv.id] || []) : [];

  const DAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Horizontal day selector */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-3">
        <div ref={dayScrollRef} className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {dayRow.map(date => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === today.toDateString();
            return (
              <button
                key={date.toISOString()}
                data-today={isToday ? true : undefined}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 md:px-4 rounded-xl transition-all shrink-0 min-w-[52px] md:min-w-[64px] cursor-pointer ${
                  isSelected ? 'bg-neutral-900 text-white shadow-md' : 'hover:bg-neutral-100 text-neutral-600'
                }`}
              >
                <span className="text-[9px] md:text-xs font-bold uppercase">{DAY_ABBR[date.getDay()]}</span>
                <span className={`text-sm md:text-lg font-black leading-tight ${isToday && !isSelected ? 'text-gold-dark' : ''}`}>
                  {date.getDate()}
                </span>
                {isToday && <span className="w-1 h-1 rounded-full bg-gold" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date label + nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} className="p-2 hover:bg-neutral-100 rounded-lg cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base md:text-2xl font-black text-black m-0 capitalize mx-2">{formatDateLabel(selectedDate)}</h2>
          <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} className="p-2 hover:bg-neutral-100 rounded-lg cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button onClick={() => setSelectedDate(new Date())} className="text-xs font-bold text-neutral-500 hover:text-black px-3 py-1.5 bg-neutral-100 rounded-lg cursor-pointer">
          Hoy
        </button>
      </div>

      {/* Appointments */}
      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-neutral-200 p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400"><CalendarIcon className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-black m-0 mt-2">No hay citas</h3>
            <p className="text-neutral-500 m-0 mt-1 text-sm">Sin citas para este día.</p>
          </div>
        ) : (
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4">
            {filteredAppointments.map(apt => (
              <div
                key={apt.id}
                onClick={() => handleCardClick(apt)}
                className="bg-white rounded-2xl border border-neutral-200 p-4 cursor-pointer flex items-start gap-3 border-l-4 hover:shadow-md transition-shadow"
                style={{ borderLeftColor: apt.service?.color || '#D4AF37' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span className="text-lg font-black text-black">{apt.hora}</span>
                  </div>
                  <h3 className="text-base font-bold text-black truncate m-0 mt-0.5">{apt.customer?.nombre || 'Cliente'}</h3>
                  <p className="text-xs text-neutral-500 font-semibold m-0 flex items-center gap-1 truncate mt-0.5">
                    <Scissors className="w-3 h-3 text-gold shrink-0" />
                    {apt.service?.nombre || 'Servicio'} · {apt.service?.duracion || '—'} min
                  </p>
                  {apt.notes && <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{apt.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {getStatusBadge(apt.estado)}
                  {getOriginBadge(apt.origen)}
                  <span className="text-base font-black text-black mt-1">{apt.price_charged}€</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/new-appointment')}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 bg-gold hover:bg-gold-dark text-black w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all border border-gold cursor-pointer"
        aria-label="Nueva cita"
      >
        <PlusCircle className="w-7 h-7 stroke-[2]" />
      </button>

      {/* Modal / Bottom sheet */}
      {showModal && selectedApt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center animate-fade-in">
          <div className="bg-white w-full md:max-w-2xl md:rounded-3xl md:m-4 rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 md:p-6 border-b border-neutral-100 rounded-t-3xl">
              <h2 className="text-lg md:text-2xl font-black text-black m-0">Detalles</h2>
              <button onClick={() => setShowAptModal(false)} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gold/10 text-gold-dark flex items-center justify-center font-black"><User className="w-4 h-4 md:w-5 md:h-5" /></div>
                  <div className="min-w-0"><span className="text-[10px] md:text-xs text-neutral-400 block font-bold">Cliente</span><span className="text-sm md:text-base font-extrabold text-black block truncate">{selectedApt.customer?.nombre || 'Cliente General'}</span></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-black"><Phone className="w-4 h-4 md:w-5 md:h-5" /></div>
                  <div className="min-w-0"><span className="text-[10px] md:text-xs text-neutral-400 block font-bold">WhatsApp</span><span className="text-sm md:text-base font-extrabold text-black block">+{selectedApt.customer?.telefono}</span></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-black"><Scissors className="w-4 h-4 md:w-5 md:h-5" /></div>
                  <div className="min-w-0"><span className="text-[10px] md:text-xs text-neutral-400 block font-bold">Servicio</span><span className="text-sm md:text-base font-extrabold text-black block truncate">{selectedApt.service?.nombre} ({selectedApt.service?.duracion} min)</span></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-black"><DollarSign className="w-4 h-4 md:w-5 md:h-5" /></div>
                  <div className="min-w-0"><span className="text-[10px] md:text-xs text-neutral-400 block font-bold">Importe</span><span className="text-sm md:text-base font-extrabold text-black block">{selectedApt.price_charged}€</span></div>
                </div>
              </div>

              {/* Chat history */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                <div className="bg-neutral-900 text-white p-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Bot className="w-4 h-4 text-gold" />Chat IA</div>
                <div className="h-40 overflow-y-auto p-3 space-y-1.5 bg-neutral-50/50 text-xs">
                  {activeChatMessages.length === 0 ? (
                    <p className="text-neutral-400 text-center py-6">Sin mensajes</p>
                  ) : activeChatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.direction === 'incoming' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-xl p-2 ${msg.direction === 'incoming' ? 'bg-white text-black' : 'bg-[#E1F3D4] text-black'}`}>
                        <p className="m-0 font-semibold whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t border-neutral-100 p-4 flex gap-3">
              {selectedApt.estado !== 'completed' && (
                <button onClick={() => handleStatusChange('completed')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer">
                  <Check className="w-5 h-5" /> Realizada
                </button>
              )}
              {selectedApt.estado !== 'cancelled' && (
                <button onClick={() => handleStatusChange('cancelled')} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer">
                  <X className="w-5 h-5" /> Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
