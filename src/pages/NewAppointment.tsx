import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerStore } from '../stores/customerStore';
import { useServiceStore } from '../stores/serviceStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useBusinessStore } from '../stores/businessStore';
import { Search, Plus, Check, ArrowRight, ArrowLeft, X } from 'lucide-react';
import type { Customer, Service } from '../types';

const NewApptSheet = ({ show, onClose, title, children }: any) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md md:rounded-3xl md:m-4 rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b border-neutral-100 rounded-t-3xl">
          <h2 className="text-lg font-black text-black m-0">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const NewAppointment: React.FC = () => {
  const navigate = useNavigate();
  const { customers, fetchCustomers, addCustomer } = useCustomerStore();
  const { services, fetchServices } = useServiceStore();
  const { appointments, fetchAppointments, addAppointment } = useAppointmentStore();
  const { business, fetchBusiness } = useBusinessStore();

  const [step, setStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchServices();
    fetchAppointments();
    fetchBusiness();
  }, [fetchCustomers, fetchServices, fetchAppointments, fetchBusiness]);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const filteredCustomers = customers.filter(c => {
    const full = `${c.nombre} ${c.telefono}`.toLowerCase();
    return full.includes(customerSearch.toLowerCase());
  });

  const handleCreateCustomerInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;
    const created = await addCustomer({ nombre: newCustName, telefono: newCustPhone, email: '', notas: '' });
    if (created) {
      setSelectedCustomer(created);
      setNewCustName(''); setNewCustPhone('');
      setShowNewCustModal(false);
      nextStep();
    }
  };

  const handleSelectCustomer = (customer: Customer) => { setSelectedCustomer(customer); nextStep(); };

  const handleSelectService = (service: Service) => { setSelectedService(service); nextStep(); };

  const timeSlots = useMemo(() => {
    if (!business) return [];
    const startStr = business.horarios?.start || '09:00';
    const endStr = business.horarios?.end || '20:30';
    const duration = selectedService?.duracion || 30;
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const slots: string[] = [];
    for (let m = startMinutes; m < endMinutes; m += duration) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    return slots;
  }, [business, selectedService]);

  const isSlotBooked = (time: string) => {
    return appointments.some(apt => apt.estado !== 'cancelled' && apt.fecha === selectedDate && apt.hora === time);
  };

  const handleSelectTime = (time: string) => { setSelectedTime(time); nextStep(); };

  const handleSave = async () => {
    if (!selectedCustomer || !selectedService || !selectedTime) return;
    const success = await addAppointment({
      customer_id: selectedCustomer.id,
      servicio_id: selectedService.id,
      employee_id: null,
      fecha: selectedDate,
      hora: selectedTime,
      estado: 'pending',
      origen: 'MANUAL',
      notes: notes || null,
      price_charged: selectedService.precio
    });
    if (success) navigate('/calendar');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-3xl font-extrabold text-black m-0">Agendar Cita</h1>
        <span className="text-sm md:text-base font-bold text-neutral-500">Paso {step} de 4</span>
      </div>

      {/* Step ribbon */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-4 border border-neutral-200 shadow-sm flex items-center gap-1">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex flex-col items-center flex-1 ${step >= s ? 'text-gold' : 'text-neutral-300'}`}>
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm ${step >= s ? 'bg-black text-gold' : 'bg-neutral-100 text-neutral-400'}`}>{s}</div>
              <span className="text-[10px] md:text-xs font-bold mt-1 hidden md:inline">{s === 1 ? 'Cliente' : s === 2 ? 'Servicio' : s === 3 ? 'Horario' : 'Confirmar'}</span>
            </div>
            {s < 4 && <div className="h-px md:h-0.5 bg-neutral-200 flex-1" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-neutral-200 shadow-sm">

        {/* STEP 1: CUSTOMER */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg md:text-2xl font-black text-black m-0">¿Para quién es la cita?</h2>
            <div className="flex gap-2 md:gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-5 md:w-6 md:h-6 text-neutral-400 absolute left-3 md:left-4 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Buscar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-3 md:py-4 rounded-xl md:rounded-2xl bg-neutral-50 border border-neutral-200 text-sm md:text-lg placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold text-black font-semibold" />
              </div>
              <button onClick={() => setShowNewCustModal(true)}
                className="bg-black hover:bg-neutral-900 text-white font-extrabold px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-lg flex items-center gap-1 cursor-pointer whitespace-nowrap">
                <Plus className="w-4 h-5" /><span className="hidden md:inline">Nuevo</span>
              </button>
            </div>
            <div className="space-y-1.5 md:space-y-2 max-h-[300px] overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <p className="text-center text-neutral-400 py-8 md:py-10 text-sm md:text-lg">No se encontraron clientes.</p>
              ) : (
                filteredCustomers.map(cust => (
                  <button key={cust.id} onClick={() => handleSelectCustomer(cust)}
                    className="w-full text-left px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 flex justify-between items-center transition-all cursor-pointer group">
                    <div className="min-w-0">
                      <p className="text-base md:text-xl font-bold text-black m-0 truncate">{cust.nombre}</p>
                      <p className="text-xs md:text-base text-neutral-400 m-0">+{cust.telefono}</p>
                    </div>
                    <ArrowRight className="w-4 h-5 text-neutral-300 group-hover:text-gold transition-transform group-hover:translate-x-1 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 2: SERVICE */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={prevStep} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer"><ArrowLeft className="w-5 h-6 text-neutral-700" /></button>
              <h2 className="text-lg md:text-2xl font-black text-black m-0">Elige el servicio</h2>
            </div>
            <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {services.filter(s => s.is_active).map(srv => (
                <button key={srv.id} onClick={() => handleSelectService(srv)}
                  className="text-left p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 hover:border-black transition-all flex items-center justify-between cursor-pointer group"
                  style={{ backgroundColor: `${srv.color}10`, borderColor: srv.color }}>
                  <div className="min-w-0">
                    <h3 className="text-base md:text-2xl font-extrabold text-black truncate">{srv.nombre}</h3>
                    <p className="text-xs md:text-base font-bold text-neutral-500 m-0">{srv.duracion} min</p>
                    <span className="text-lg md:text-2xl font-black text-black mt-1 block">{srv.precio}€</span>
                  </div>
                  <div className="p-2 rounded-full bg-black text-white group-hover:scale-110 transition-transform shrink-0 ml-2">
                    <ArrowRight className="w-4 h-5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: DATE & TIME */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={prevStep} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer"><ArrowLeft className="w-5 h-6 text-neutral-700" /></button>
              <h2 className="text-lg md:text-2xl font-black text-black m-0">Elige el horario</h2>
            </div>
            <div>
              <label className="block text-sm md:text-lg font-bold text-neutral-700 m-0 mb-1">Día:</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 md:py-4 rounded-xl md:rounded-2xl bg-neutral-50 border border-neutral-200 text-sm md:text-lg font-bold text-black focus:outline-none focus:ring-2 focus:ring-gold" />
            </div>
            <div>
              <span className="block text-sm md:text-lg font-bold text-neutral-700 mb-2">Horarios disponibles:</span>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                {timeSlots.length === 0 && (
                  <p className="col-span-full text-center text-neutral-400 py-8 text-sm">No hay horarios disponibles.</p>
                )}
                {timeSlots.map(time => {
                  const booked = isSlotBooked(time);
                  return (
                    <button key={time} disabled={booked} onClick={() => handleSelectTime(time)}
                      className={`py-3 md:py-4 px-1 rounded-xl md:rounded-2xl text-center font-extrabold text-sm md:text-lg transition-all ${
                        booked ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed border border-neutral-200' : 'bg-white border-2 border-neutral-200 hover:border-black text-black cursor-pointer'
                      }`}>{time}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRM */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={prevStep} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer"><ArrowLeft className="w-5 h-6 text-neutral-700" /></button>
              <h2 className="text-lg md:text-2xl font-black text-black m-0">Confirmar Cita</h2>
            </div>

            <div className="bg-neutral-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-neutral-200 space-y-3 md:space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-2 md:pb-3">
                <span className="text-xs md:text-base text-neutral-500 font-semibold">Cliente</span>
                <span className="text-sm md:text-xl font-bold text-black">{selectedCustomer?.nombre || 'Cliente General'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-neutral-200 pb-2 md:pb-3">
                <span className="text-xs md:text-base text-neutral-500 font-semibold">Servicio</span>
                <span className="text-sm md:text-xl font-bold text-black">{selectedService?.nombre}</span>
              </div>
              <div className="flex justify-between items-center border-b border-neutral-200 pb-2 md:pb-3">
                <span className="text-xs md:text-base text-neutral-500 font-semibold">Duración</span>
                <span className="text-sm md:text-xl font-bold text-black">{selectedService?.duracion} min</span>
              </div>
              <div className="flex justify-between items-center border-b border-neutral-200 pb-2 md:pb-3">
                <span className="text-xs md:text-base text-neutral-500 font-semibold">Día</span>
                <span className="text-sm md:text-xl font-bold text-black">{new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex justify-between items-center border-b border-neutral-200 pb-2 md:pb-3">
                <span className="text-xs md:text-base text-neutral-500 font-semibold">Hora</span>
                <span className="text-lg md:text-2xl font-black text-gold-dark">{selectedTime}</span>
              </div>
              <div className="flex justify-between items-center pt-1 md:pt-2">
                <span className="text-sm md:text-lg text-neutral-600 font-bold">Total</span>
                <span className="text-xl md:text-3xl font-black text-black">{selectedService?.precio}€</span>
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-base font-bold text-neutral-700 m-0 mb-1">Nota técnica opcional:</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Añade detalles especiales..." rows={2} className="w-full px-4 py-3 rounded-xl md:rounded-2xl bg-neutral-50 border border-neutral-200 text-sm md:text-base text-black focus:outline-none focus:ring-2 focus:ring-gold" />
            </div>

            <button onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 md:py-5 rounded-xl md:rounded-2xl text-base md:text-xl flex items-center justify-center gap-2 cursor-pointer shadow-md">
              <Check className="w-5 h-6 stroke-[3]" />Guardar Cita
            </button>
          </div>
        )}
      </div>

      {/* New Customer Modal */}
      <NewApptSheet show={showNewCustModal} onClose={() => setShowNewCustModal(false)} title="Nuevo Cliente">
        <form onSubmit={handleCreateCustomerInline} className="space-y-4 py-4">
          <div className="px-4">
            <label className="block text-sm font-bold text-neutral-700">Nombre *</label>
            <input type="text" required placeholder="Ej: Manuel García" value={newCustName} onChange={e => setNewCustName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
          </div>
          <div className="px-4">
            <label className="block text-sm font-bold text-neutral-700">Teléfono *</label>
            <input type="tel" required placeholder="Ej: 600111222" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
          </div>
          <div className="flex gap-3 px-4 pt-2">
            <button type="button" onClick={() => setShowNewCustModal(false)} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" className="flex-1 bg-black hover:bg-neutral-900 text-white font-black py-3 rounded-xl text-sm transition-all cursor-pointer">Guardar y Usar</button>
          </div>
        </form>
      </NewApptSheet>
    </div>
  );
};
