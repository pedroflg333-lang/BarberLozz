import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerStore } from '../stores/customerStore';
import { useServiceStore } from '../stores/serviceStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useBusinessStore } from '../stores/businessStore';
import { Card, Button, Modal, Input } from '../ui';
import { Search, Plus, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import type { Customer, Service } from '../types';

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

  useEffect(() => { fetchCustomers(); fetchServices(); fetchAppointments(); fetchBusiness(); }, [fetchCustomers, fetchServices, fetchAppointments, fetchBusiness]);

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
    if (created) { setSelectedCustomer(created); setNewCustName(''); setNewCustPhone(''); setShowNewCustModal(false); nextStep(); }
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

  const isSlotBooked = (time: string) => appointments.some(apt => apt.estado !== 'cancelled' && apt.fecha === selectedDate && apt.hora === time);

  const handleSelectTime = (time: string) => { setSelectedTime(time); nextStep(); };

  const handleSave = async () => {
    if (!selectedCustomer || !selectedService || !selectedTime) return;
    const success = await addAppointment({
      customer_id: selectedCustomer.id, servicio_id: selectedService.id, employee_id: null,
      fecha: selectedDate, hora: selectedTime, estado: 'pending', origen: 'MANUAL',
      notes: notes || null, price_charged: selectedService.precio
    });
    if (success) navigate('/calendar');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-3xl font-extrabold text-text-primary m-0">Agendar Cita</h1>
        <span className="text-sm md:text-base font-bold text-text-secondary">Paso {step} de 4</span>
      </div>

      <Card padding="sm" className="flex items-center gap-1">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex flex-col items-center flex-1 ${step >= s ? 'text-gold' : 'text-neutral-300'}`}>
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm ${step >= s ? 'bg-black text-gold' : 'bg-neutral-100 text-neutral-400'}`}>{s}</div>
              <span className="text-[10px] md:text-xs font-bold mt-1 hidden md:inline">{s === 1 ? 'Cliente' : s === 2 ? 'Servicio' : s === 3 ? 'Horario' : 'Confirmar'}</span>
            </div>
            {s < 4 && <div className="h-px md:h-0.5 bg-neutral-200 flex-1" />}
          </div>
        ))}
      </Card>

      <Card padding="lg">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg md:text-2xl font-black text-text-primary m-0">¿Para quién es la cita?</h2>
            <div className="flex gap-2 md:gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-5 md:w-6 md:h-6 text-text-tertiary absolute left-3 md:left-4 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Buscar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-3 md:py-4 rounded-btn bg-neutral-50 border border-border text-sm md:text-lg placeholder:text-text-tertiary focus-ring outline-none text-text-primary font-semibold" />
              </div>
              <Button variant="primary" onClick={() => setShowNewCustModal(true)} icon={<Plus className="w-4 h-5" />}>
                <span className="hidden md:inline">Nuevo</span>
              </Button>
            </div>
            <div className="space-y-1.5 md:space-y-2 max-h-[300px] overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <p className="text-center text-text-tertiary py-8 md:py-10 text-sm md:text-lg">No se encontraron clientes.</p>
              ) : filteredCustomers.map(cust => (
                <button key={cust.id} onClick={() => handleSelectCustomer(cust)}
                  className="w-full text-left px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl hover:bg-neutral-50 border border-transparent hover:border-border flex justify-between items-center transition-all cursor-pointer group">
                  <div className="min-w-0">
                    <p className="text-base md:text-xl font-bold text-text-primary m-0 truncate">{cust.nombre}</p>
                    <p className="text-xs md:text-base text-text-tertiary m-0">+{cust.telefono}</p>
                  </div>
                  <ArrowRight className="w-4 h-5 text-neutral-300 group-hover:text-gold transition-transform group-hover:translate-x-1 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={prevStep} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer"><ArrowLeft className="w-5 h-6 text-neutral-700" /></button>
              <h2 className="text-lg md:text-2xl font-black text-text-primary m-0">Elige el servicio</h2>
            </div>
            <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {services.filter(s => s.is_active).map(srv => (
                <button key={srv.id} onClick={() => handleSelectService(srv)}
                  className="text-left p-4 md:p-6 rounded-card border-2 hover:border-black transition-all flex items-center justify-between cursor-pointer group"
                  style={{ backgroundColor: `${srv.color}10`, borderColor: srv.color }}>
                  <div className="min-w-0">
                    <h3 className="text-base md:text-2xl font-extrabold text-text-primary truncate">{srv.nombre}</h3>
                    <p className="text-xs md:text-base font-bold text-text-secondary m-0">{srv.duracion} min</p>
                    <span className="text-lg md:text-2xl font-black text-text-primary mt-1 block">{srv.precio}€</span>
                  </div>
                  <div className="p-2 rounded-full bg-black text-white group-hover:scale-110 transition-transform shrink-0 ml-2">
                    <ArrowRight className="w-4 h-5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={prevStep} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer"><ArrowLeft className="w-5 h-6 text-neutral-700" /></button>
              <h2 className="text-lg md:text-2xl font-black text-text-primary m-0">Elige el horario</h2>
            </div>
            <div>
              <label className="block text-sm md:text-lg font-bold text-neutral-700 m-0 mb-1">Día:</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 md:py-4 rounded-btn bg-neutral-50 border border-border text-sm md:text-lg font-bold text-text-primary focus-ring outline-none" />
            </div>
            <div>
              <span className="block text-sm md:text-lg font-bold text-neutral-700 mb-2">Horarios disponibles:</span>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                {timeSlots.length === 0 && <p className="col-span-full text-center text-text-tertiary py-8 text-sm">No hay horarios disponibles.</p>}
                {timeSlots.map(time => {
                  const booked = isSlotBooked(time);
                  return (
                    <button key={time} disabled={booked} onClick={() => handleSelectTime(time)}
                      className={`py-3 md:py-4 px-1 rounded-btn text-center font-extrabold text-sm md:text-lg transition-all ${booked ? 'bg-neutral-100 text-text-tertiary cursor-not-allowed border border-border' : 'bg-surface border-2 border-border hover:border-black text-text-primary cursor-pointer'}`}>{time}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={prevStep} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer"><ArrowLeft className="w-5 h-6 text-neutral-700" /></button>
              <h2 className="text-lg md:text-2xl font-black text-text-primary m-0">Confirmar Cita</h2>
            </div>

            <div className="bg-neutral-50 rounded-card p-4 md:p-6 border border-border space-y-3 md:space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-2 md:pb-3">
                <span className="text-xs md:text-base text-text-secondary font-semibold">Cliente</span>
                <span className="text-sm md:text-xl font-bold text-text-primary">{selectedCustomer?.nombre || 'Cliente General'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2 md:pb-3">
                <span className="text-xs md:text-base text-text-secondary font-semibold">Servicio</span>
                <span className="text-sm md:text-xl font-bold text-text-primary">{selectedService?.nombre}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2 md:pb-3">
                <span className="text-xs md:text-base text-text-secondary font-semibold">Duración</span>
                <span className="text-sm md:text-xl font-bold text-text-primary">{selectedService?.duracion} min</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2 md:pb-3">
                <span className="text-xs md:text-base text-text-secondary font-semibold">Día</span>
                <span className="text-sm md:text-xl font-bold text-text-primary">{new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2 md:pb-3">
                <span className="text-xs md:text-base text-text-secondary font-semibold">Hora</span>
                <span className="text-lg md:text-2xl font-black text-gold-dark">{selectedTime}</span>
              </div>
              <div className="flex justify-between items-center pt-1 md:pt-2">
                <span className="text-sm md:text-lg text-text-secondary font-bold">Total</span>
                <span className="text-xl md:text-3xl font-black text-text-primary">{selectedService?.precio}€</span>
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-base font-bold text-neutral-700 m-0 mb-1">Nota técnica opcional:</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Añade detalles especiales..." rows={2}
                className="w-full px-4 py-3 rounded-btn bg-neutral-50 border border-border text-sm md:text-base text-text-primary focus-ring outline-none" />
            </div>

            <Button variant="primary" size="lg" icon={<Check className="w-5 h-6 stroke-[3]" />} onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700">
              Guardar Cita
            </Button>
          </div>
        )}
      </Card>

      <Modal open={showNewCustModal} onClose={() => setShowNewCustModal(false)} title="Nuevo Cliente">
        <form onSubmit={handleCreateCustomerInline} className="space-y-4 py-2">
          <Input label="Nombre *" required placeholder="Ej: Manuel García" value={newCustName} onChange={e => setNewCustName(e.target.value)} />
          <Input label="Teléfono *" required type="tel" placeholder="Ej: 600111222" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowNewCustModal(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1">Guardar y Usar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
