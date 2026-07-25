import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useCustomerStore } from '../stores/customerStore';
import { useServiceStore } from '../stores/serviceStore';
import { useChatStore } from '../stores/chatStore';
import { Card, Badge, Button, Modal } from '../ui';
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
      case 'completed': return <Badge variant="success" dot>Realizada</Badge>;
      case 'cancelled': return <Badge variant="error" dot>Cancelada</Badge>;
      default: return <Badge variant="warning" dot pulse>Pendiente</Badge>;
    }
  };

  const getOriginBadge = (origin: string) => {
    switch (origin) {
      case 'IA': case 'WHATSAPP': return <Badge variant="success" size="sm"><Bot className="w-2.5 h-2.5" />IA</Badge>;
      case 'WEB': return <Badge variant="info" size="sm">WEB</Badge>;
      default: return <Badge variant="neutral" size="sm">MANUAL</Badge>;
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
      <Card padding="sm">
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
      </Card>

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
        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
          Hoy
        </Button>
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
              <Card
                key={apt.id}
                hoverable
                className="cursor-pointer flex items-start gap-3 border-l-4"
                style={{ borderLeftColor: apt.service?.color || '#D4AF37' }}
                onClick={() => handleCardClick(apt)}
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
              </Card>
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
      <Modal open={showModal} onClose={() => { setShowAptModal(false); setSelectedApt(null); }} maxWidth="max-w-2xl">
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gold/10 text-gold-dark flex items-center justify-center font-black"><User className="w-4 h-4 md:w-5 md:h-5" /></div>
              <div className="min-w-0"><span className="text-[10px] md:text-xs text-neutral-400 block font-bold">Cliente</span><span className="text-sm md:text-base font-extrabold text-black block truncate">{selectedApt?.customer?.nombre || 'Cliente General'}</span></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-black"><Phone className="w-4 h-4 md:w-5 md:h-5" /></div>
              <div className="min-w-0"><span className="text-[10px] md:text-xs text-neutral-400 block font-bold">WhatsApp</span><span className="text-sm md:text-base font-extrabold text-black block">+{selectedApt?.customer?.telefono}</span></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-black"><Scissors className="w-4 h-4 md:w-5 md:h-5" /></div>
              <div className="min-w-0"><span className="text-[10px] md:text-xs text-neutral-400 block font-bold">Servicio</span><span className="text-sm md:text-base font-extrabold text-black block truncate">{selectedApt?.service?.nombre} ({selectedApt?.service?.duracion} min)</span></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-black"><DollarSign className="w-4 h-4 md:w-5 md:h-5" /></div>
              <div className="min-w-0"><span className="text-[10px] md:text-xs text-neutral-400 block font-bold">Importe</span><span className="text-sm md:text-base font-extrabold text-black block">{selectedApt?.price_charged}€</span></div>
            </div>
          </div>

          {/* Chat history */}
          <div className="border border-border rounded-card overflow-hidden">
            <div className="bg-surface-dark text-text-inverse p-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Bot className="w-4 h-4 text-gold" />Chat IA</div>
            <div className="h-40 overflow-y-auto p-3 space-y-1.5 bg-surface-muted text-xs">
              {activeChatMessages.length === 0 ? (
                <p className="text-text-tertiary text-center py-6">Sin mensajes</p>
              ) : activeChatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'incoming' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-xl p-2 ${msg.direction === 'incoming' ? 'bg-white text-text-primary' : 'bg-[#E1F3D4] text-text-primary'}`}>
                    <p className="m-0 font-semibold whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {selectedApt?.estado !== 'completed' && (
              <Button variant="primary" size="md" icon={<Check className="w-4 h-5" />} onClick={() => handleStatusChange('completed')} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                Realizada
              </Button>
            )}
            {selectedApt?.estado !== 'cancelled' && (
              <Button variant="outline" size="md" icon={<X className="w-4 h-5" />} onClick={() => handleStatusChange('cancelled')} className="flex-1 text-red-700 border-red-200 hover:bg-red-50">
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
