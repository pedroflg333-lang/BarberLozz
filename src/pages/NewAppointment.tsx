import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerStore } from '../stores/customerStore';
import { useServiceStore } from '../stores/serviceStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useBusinessStore } from '../stores/businessStore';
import { 
  Search, 
  Plus, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  X
} from 'lucide-react';
import type { Customer, Service } from '../types';

export const NewAppointment: React.FC = () => {
  const navigate = useNavigate();
  const { customers, fetchCustomers, addCustomer } = useCustomerStore();
  const { services, fetchServices } = useServiceStore();
  const { appointments, fetchAppointments, addAppointment } = useAppointmentStore();
  const { business, fetchBusiness } = useBusinessStore();

  // Current Step
  const [step, setStep] = useState(1);

  // Selections
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Search filter
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Inline quick customer modal
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchServices();
    fetchAppointments();
    fetchBusiness();
  }, [fetchCustomers, fetchServices, fetchAppointments, fetchBusiness]);

  // Handle step increments
  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  // Step 1: Customer Selection & Creation
  const filteredCustomers = customers.filter(c => {
    const full = `${c.nombre} ${c.telefono}`.toLowerCase();
    return full.includes(customerSearch.toLowerCase());
  });

  const handleCreateCustomerInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;
    
    const created = await addCustomer({
      nombre: newCustName,
      telefono: newCustPhone,
      email: '',
      notas: ''
    });

    if (created) {
      setSelectedCustomer(created);
      setNewCustName('');
      setNewCustPhone('');
      setShowNewCustModal(false);
      nextStep(); // Advance to service selection
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    nextStep();
  };

  // Step 2: Service selection
  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    nextStep();
  };

  // Step 3: Date & Hours Generation
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

  // Check if a slot is already booked on the selected date
  const isSlotBooked = (time: string) => {
    return appointments.some(apt => {
      if (apt.estado === 'cancelled') return false;
      return apt.fecha === selectedDate && apt.hora === time;
    });
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    nextStep();
  };

  // Step 4: Save booking
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

    if (success) {
      navigate('/calendar');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-black m-0">Agendar Cita</h1>
        <div className="flex items-center gap-1.5 text-base font-bold text-neutral-500">
          <span>Paso {step} de 4</span>
        </div>
      </div>

      {/* Elegant Step Ribbon */}
      <div className="bg-white rounded-3xl p-4 border border-neutral-200 shadow-sm flex justify-between items-center gap-1">
        <div className={`flex flex-col items-center flex-1 ${step >= 1 ? 'text-gold' : 'text-neutral-300'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-black text-gold' : 'bg-neutral-100 text-neutral-400'}`}>1</div>
          <span className="text-xs font-bold mt-1.5 hidden sm:inline">Cliente</span>
        </div>
        <div className="h-0.5 bg-neutral-200 flex-1"></div>
        <div className={`flex flex-col items-center flex-1 ${step >= 2 ? 'text-gold' : 'text-neutral-300'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-black text-gold' : 'bg-neutral-100 text-neutral-400'}`}>2</div>
          <span className="text-xs font-bold mt-1.5 hidden sm:inline">Servicio</span>
        </div>
        <div className="h-0.5 bg-neutral-200 flex-1"></div>
        <div className={`flex flex-col items-center flex-1 ${step >= 3 ? 'text-gold' : 'text-neutral-300'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-black text-gold' : 'bg-neutral-100 text-neutral-400'}`}>3</div>
          <span className="text-xs font-bold mt-1.5 hidden sm:inline">Horario</span>
        </div>
        <div className="h-0.5 bg-neutral-200 flex-1"></div>
        <div className={`flex flex-col items-center flex-1 ${step >= 4 ? 'text-gold' : 'text-neutral-300'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 4 ? 'bg-black text-gold' : 'bg-neutral-100 text-neutral-400'}`}>4</div>
          <span className="text-xs font-bold mt-1.5 hidden sm:inline">Confirmar</span>
        </div>
      </div>

      {/* STEP CONTENT CASES */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200 shadow-sm min-h-[400px]">
        
        {/* STEP 1: SELECT CUSTOMER */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-black m-0">1. ¿Para quién es la cita?</h2>
            
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-6 h-6 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o teléfono..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-lg placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold text-black focus-gold"
                />
              </div>
              
              <button
                onClick={() => setShowNewCustModal(true)}
                className="bg-black hover:bg-neutral-900 text-white font-extrabold px-6 py-4 rounded-2xl text-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Nuevo Cliente
              </button>
            </div>

            {/* Customers List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredCustomers.length === 0 ? (
                <p className="text-center text-neutral-400 py-10 text-lg">No se encontraron clientes.</p>
              ) : (
                filteredCustomers.map(cust => (
                  <button
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    className="w-full text-left px-5 py-4 rounded-2xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 flex justify-between items-center transition-all cursor-pointer group"
                  >
                    <div>
                      <p className="text-xl font-bold text-black m-0">{cust.nombre}</p>
                      <p className="text-base text-neutral-400 m-0">+{cust.telefono}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-gold transition-transform group-hover:translate-x-1" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 2: SELECT SERVICE */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button onClick={prevStep} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer">
                <ArrowLeft className="w-6 h-6 text-neutral-700" />
              </button>
              <h2 className="text-2xl font-black text-black m-0">2. Elige el servicio</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.filter(s => s.is_active).map(srv => (
                <button
                  key={srv.id}
                  onClick={() => handleSelectService(srv)}
                  className={`text-left p-6 rounded-3xl border-2 hover:border-black transition-all flex flex-col justify-between h-40 cursor-pointer relative group`}
                  style={{ backgroundColor: `${srv.color}10`, borderColor: srv.color }}
                >
                  <div>
                    <h3 className="text-2xl font-extrabold text-black mb-1.5">{srv.nombre}</h3>
                    <p className="text-base font-bold text-neutral-500 m-0">{srv.duracion} minutos de duración</p>
                  </div>
                  <div className="flex justify-between items-center w-full mt-2">
                    <span className="text-2xl font-black text-black">{srv.precio}€</span>
                    <div className="p-2 rounded-full bg-black text-white group-hover:scale-110 transition-transform">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: DATE & TIME */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button onClick={prevStep} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer">
                <ArrowLeft className="w-6 h-6 text-neutral-700" />
              </button>
              <h2 className="text-2xl font-black text-black m-0">3. Elige el horario</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-lg font-bold text-neutral-700 m-0">Selecciona el día:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-lg font-bold text-black focus:outline-none focus:ring-2 focus:ring-gold focus-gold"
              />
            </div>

            <div className="space-y-4">
              <span className="block text-lg font-bold text-neutral-700">Horarios disponibles:</span>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {timeSlots.map(time => {
                  const booked = isSlotBooked(time);
                  return (
                    <button
                      key={time}
                      disabled={booked}
                      onClick={() => handleSelectTime(time)}
                      className={`py-4 px-2 rounded-2xl text-center font-extrabold text-lg transition-all ${
                        booked 
                          ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed border border-neutral-200' 
                          : 'bg-white border-2 border-neutral-200 hover:border-black text-black cursor-pointer'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMATION */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button onClick={prevStep} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer">
                <ArrowLeft className="w-6 h-6 text-neutral-700" />
              </button>
              <h2 className="text-2xl font-black text-black m-0">4. Confirmar Cita</h2>
            </div>

            <div className="bg-neutral-50 rounded-3xl p-6 border border-neutral-200 space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <span className="text-base text-neutral-500 font-semibold">Cliente</span>
                <span className="text-xl font-bold text-black">
                  {selectedCustomer?.nombre || 'Cliente General'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <span className="text-base text-neutral-500 font-semibold">Servicio</span>
                <span className="text-xl font-bold text-black">{selectedService?.nombre}</span>
              </div>

              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <span className="text-base text-neutral-500 font-semibold">Duración</span>
                <span className="text-xl font-bold text-black">{selectedService?.duracion} minutos</span>
              </div>

              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <span className="text-base text-neutral-500 font-semibold">Día</span>
                <span className="text-xl font-bold text-black">
                  {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <span className="text-base text-neutral-500 font-semibold">Hora</span>
                <span className="text-2xl font-black text-gold-dark">{selectedTime}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-lg text-neutral-600 font-bold">Total a Cobrar</span>
                <span className="text-3xl font-black text-black">{selectedService?.precio}€</span>
              </div>
            </div>

            {/* Note taking (e.g., hair length, style details) */}
            <div className="space-y-2">
              <label className="block text-base font-bold text-neutral-700 m-0">Nota técnica opcional (degradado, navaja, etc):</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Añade aquí cualquier detalle especial..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none focus:ring-2 focus:ring-gold focus-gold"
              />
            </div>

            {/* Big Finish Button */}
            <button
              onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 px-6 rounded-2xl text-xl flex items-center justify-center gap-2.5 cursor-pointer shadow-md transition-all border border-emerald-500"
            >
              <Check className="w-7 h-7 stroke-[3]" />
              Guardar y Finalizar
            </button>
          </div>
        )}
      </div>

      {/* QUICK INLINE CREATE CUSTOMER MODAL */}
      {showNewCustModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 border border-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h2 className="text-xl font-black text-black m-0">Añadir Nuevo Cliente</h2>
              <button onClick={() => setShowNewCustModal(false)} className="p-1 hover:bg-neutral-100 rounded-xl cursor-pointer text-neutral-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerInline} className="space-y-4">
              <div>
                <label className="block text-base font-bold text-neutral-700">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Manuel García"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none focus:ring-2 focus:ring-gold focus-gold mt-1"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-700">Número de Teléfono</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 600111222"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none focus:ring-2 focus:ring-gold focus-gold mt-1"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowNewCustModal(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-4 py-3 rounded-xl text-base flex-1 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gold hover:bg-gold-dark text-black font-black px-4 py-3 rounded-xl text-base flex-1 transition-all border border-gold cursor-pointer"
                >
                  Guardar y Usar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
