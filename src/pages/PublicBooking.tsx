import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { BACKEND_URL } from '../config/backend';
import {
  Scissors, ChevronLeft, Check, Clock,
  ArrowRight, Calendar, User, Phone, FileText, Sparkles
} from 'lucide-react';

type Step = 'service' | 'employee' | 'datetime' | 'info' | 'done';

interface Service { id: string; nombre: string; precio: number; duracion: number; color: string; descripcion: string | null; }
interface Employee { id: string; full_name: string; }
interface TimeSlot { start: string; end: string; employee_id: string; employee_name: string; }

const PageContainer = ({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) => (
  <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
    {onBack && (
      <button onClick={onBack} className="flex items-center gap-1.5 text-neutral-500 hover:text-black font-semibold text-sm cursor-pointer">
        <ChevronLeft className="w-4 h-5" />Atrás
      </button>
    )}
    <div>{children}</div>
  </div>
);

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-1.5 mb-6">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= current ? 'bg-black w-6' : 'bg-neutral-200 w-6'}`} />
    ))}
  </div>
);

export const PublicBooking: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [step, setStep] = useState<Step>('service');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [business, setBusiness] = useState<{ id: string; nombre: string; logo_url: string | null } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const bizRes = await fetch(`${BACKEND_URL}/api/public/business/slug/${slug}`);
        if (!bizRes.ok) { setError('Negocio no encontrado'); setLoading(false); return; }
        const biz = await bizRes.json();
        setBusiness(biz);

        const [svcRes, empRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/public/business/${biz.id}/services`),
          fetch(`${BACKEND_URL}/api/public/business/${biz.id}/employees`)
        ]);
        if (svcRes.ok) setServices(await svcRes.json());
        if (empRes.ok) setEmployees(await empRes.json());
      } catch (e: any) {
        setError(e.message || 'Error al cargar');
      }
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  const resetFlow = () => {
    setStep('service');
    setSelectedService(null);
    setSelectedEmployee(null);
    setSelectedDate('');
    setSelectedTime('');
    setAvailableSlots([]);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setSubmitError(null);
  };

  const handleSelectService = (srv: Service) => {
    setSelectedService(srv);
    setSelectedEmployee(null);
    setSelectedDate('');
    setSelectedTime('');
    setAvailableSlots([]);
    if (employees.length <= 1) {
      if (employees.length === 1) setSelectedEmployee(employees[0]);
      setStep('datetime');
    } else {
      setStep('employee');
    }
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setStep('datetime');
  };

  const fetchSlots = async (serviceId: string, employeeId: string | null, date: string) => {
    setLoadingSlots(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/public/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business!.id,
          service_id: serviceId,
          employee_id: employeeId,
          date
        })
      });
      if (res.ok) {
        const data = await res.json();
        const slots = data.slots || [];
        const uniqueSlots = slots.filter((s: TimeSlot, i: number, a: TimeSlot[]) =>
          a.findIndex((x: TimeSlot) => x.start === s.start) === i
        );
        setAvailableSlots(uniqueSlots);
      } else {
        setAvailableSlots([]);
      }
    } catch {
      setAvailableSlots([]);
    }
    setLoadingSlots(false);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    if (selectedService) {
      fetchSlots(selectedService.id, selectedEmployee?.id || null, date);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/public/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          nombre: customerName,
          telefono: customerPhone,
          servicio_id: selectedService.id,
          employee_id: selectedEmployee?.id || null,
          fecha: selectedDate,
          hora: selectedTime,
          notes: notes || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Error al reservar');
        setSubmitting(false);
        return;
      }
      setStep('done');
    } catch (e: any) {
      setSubmitError(e.message || 'Error de conexión');
    }
    setSubmitting(false);
  };

  const today = new Date().toISOString().split('T')[0];

  const weekDates = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return {
      dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('es-ES', { month: 'short' }),
      full: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border-2 border-gold flex items-center justify-center animate-spin mx-auto">
            <Scissors className="w-6 h-6 text-gold" />
          </div>
          <p className="text-neutral-500 font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-neutral-200 text-center max-w-md shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <Scissors className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-black text-black mt-4 m-0">Negocio no encontrado</h1>
          <p className="text-neutral-500 m-0 mt-2 text-sm">{error || 'El enlace no es válido.'}</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-neutral-200 text-center max-w-md shadow-sm animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto animate-bounce-in">
            <Check className="w-10 h-10 text-emerald-600 stroke-[3]" />
          </div>
          <h1 className="text-2xl font-black text-black mt-6 m-0">Solicitud enviada</h1>
          <p className="text-neutral-500 m-0 mt-3 text-sm leading-relaxed">
            {customerName}, hemos recibido tu solicitud para{' '}
            <strong>{selectedService?.nombre}</strong> el{' '}
            <strong>{selectedDate ? formatDate(selectedDate).full : ''}</strong> a las{' '}
            <strong>{selectedTime}</strong>.
          </p>
          <p className="text-neutral-400 m-0 mt-4 text-xs">Te confirmaremos la cita en breve.</p>
          <button onClick={resetFlow}
            className="mt-6 bg-black hover:bg-neutral-900 text-white font-black px-8 py-4 rounded-2xl text-base transition-all cursor-pointer shadow-md">
            Nueva Reserva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-4 md:py-6 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {business?.logo_url ? (
            <img src={business.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-gold" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-gold flex items-center justify-center font-bold text-lg">
              {(business?.nombre || 'B').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-base font-black text-black m-0">{business?.nombre || 'Barbería'}</h1>
            <p className="text-xs text-neutral-400 m-0 font-medium">Reserva online</p>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6">
        <div className="max-w-lg mx-auto">
          <StepIndicator current={step === 'service' ? 0 : step === 'employee' ? 1 : step === 'datetime' ? 2 : 3} total={4} />

          {/* STEP 1: Service */}
          {step === 'service' && (
            <PageContainer>
              <h2 className="text-2xl font-black text-black m-0 mb-1">Elige tu servicio</h2>
              <p className="text-sm text-neutral-400 m-0 mb-5">Selecciona lo que necesitas.</p>

              {services.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-neutral-200 text-center">
                  <p className="text-neutral-400 font-semibold">No hay servicios disponibles.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map(srv => (
                    <button key={srv.id} onClick={() => handleSelectService(srv)}
                      className="w-full text-left bg-white rounded-2xl border border-neutral-200 p-4 md:p-5 hover:border-black transition-all cursor-pointer shadow-sm hover:shadow-md group">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg md:text-xl font-extrabold text-black m-0 truncate flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: srv.color }} />
                            {srv.nombre}
                          </h3>
                          {srv.descripcion && (
                            <p className="text-xs text-neutral-400 font-medium m-0 mt-0.5 truncate">{srv.descripcion}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-sm font-bold text-neutral-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />{srv.duracion} min
                            </span>
                            <span className="text-lg font-black text-black">{srv.precio}€</span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-black transition-all shrink-0 ml-2" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </PageContainer>
          )}

          {/* STEP 2: Employee */}
          {step === 'employee' && (
            <PageContainer onBack={() => { setStep('service'); setSelectedService(null); }}>
              <h2 className="text-2xl font-black text-black m-0 mb-1">Elige profesional</h2>
              <p className="text-sm text-neutral-400 m-0 mb-5">¿Con quién prefieres?</p>

              <div className="space-y-3">
                {employees.map(emp => (
                  <button key={emp.id} onClick={() => handleSelectEmployee(emp)}
                    className="w-full text-left bg-white rounded-2xl border border-neutral-200 p-4 hover:border-black transition-all cursor-pointer shadow-sm hover:shadow-md group flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-lg text-neutral-700 shrink-0">
                      {emp.full_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-black m-0 truncate">{emp.full_name}</h3>
                    </div>
                    <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-black transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </PageContainer>
          )}

          {/* STEP 3: Date & Time */}
          {step === 'datetime' && (
            <PageContainer onBack={() => { setStep(employees.length > 1 ? 'employee' : 'service'); }}>
              <h2 className="text-2xl font-black text-black m-0 mb-1">Elige fecha y hora</h2>
              <p className="text-sm text-neutral-400 m-0 mb-5">Selecciona un día y una hora disponible.</p>

              {/* Date selector */}
              <div className="overflow-x-auto no-scrollbar -mx-4 px-4 mb-5">
                <div className="flex gap-2 min-w-min">
                  {weekDates.map(date => {
                    const fmt = formatDate(date);
                    const isActive = selectedDate === date;
                    const isToday = date === today;
                    return (
                      <button key={date} onClick={() => handleDateChange(date)}
                        className={`flex flex-col items-center py-3 px-4 rounded-xl border-2 transition-all cursor-pointer shrink-0 min-w-[70px] ${
                          isActive ? 'bg-black text-white border-black' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                        }`}>
                        <span className="text-[10px] font-bold uppercase">{fmt.dayName}</span>
                        <span className="text-lg font-black leading-tight mt-0.5">{fmt.dayNum}</span>
                        <span className="text-[10px] font-semibold">{fmt.month}</span>
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  {loadingSlots ? (
                    <div className="bg-white rounded-2xl p-8 border border-neutral-200 text-center">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 animate-spin flex items-center justify-center mx-auto">
                        <Clock className="w-4 h-4 text-neutral-400" />
                      </div>
                      <p className="text-sm text-neutral-400 mt-3 font-semibold">Cargando horarios...</p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 border border-neutral-200 text-center">
                      <p className="text-neutral-400 font-semibold">No hay horas disponibles para este día.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider">
                        Horas disponibles — {availableSlots.length}
                      </p>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {availableSlots.map(slot => (
                          <button key={slot.start} onClick={() => handleTimeSelect(slot.start)}
                            className={`py-3 px-2 rounded-xl border-2 font-extrabold text-sm transition-all cursor-pointer ${
                              selectedTime === slot.start
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                            }`}>
                            {slot.start}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {!selectedDate && (
                <div className="bg-white rounded-2xl p-8 border border-neutral-200 text-center">
                  <Calendar className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p className="text-sm text-neutral-400 mt-3 font-semibold">Selecciona un día para ver horarios.</p>
                </div>
              )}
            </PageContainer>
          )}

          {/* STEP 4: Customer Info */}
          {step === 'info' && (
            <PageContainer onBack={() => { setStep('datetime'); setSelectedTime(''); }}>
              <h2 className="text-2xl font-black text-black m-0 mb-1">Tus datos</h2>
              <p className="text-sm text-neutral-400 m-0 mb-5">Para confirmar la reserva.</p>

              {/* Summary */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 mb-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Servicio</span>
                  <span className="font-bold text-black">{selectedService?.nombre}</span>
                </div>
                {selectedEmployee && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Profesional</span>
                    <span className="font-bold text-black">{selectedEmployee.full_name}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Fecha</span>
                  <span className="font-bold text-black">{selectedDate ? formatDate(selectedDate).full : ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Hora</span>
                  <span className="font-bold text-black">{selectedTime}</span>
                </div>
                <div className="border-t border-neutral-200 pt-2 flex justify-between">
                  <span className="text-neutral-600 font-bold">Precio</span>
                  <span className="text-xl font-black text-black">{selectedService?.precio}€</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold text-neutral-700 mb-1">
                    <User className="w-4 h-4 text-neutral-400" />Nombre *
                  </label>
                  <input type="text" required placeholder="Tu nombre" value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-black font-semibold" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold text-neutral-700 mb-1">
                    <Phone className="w-4 h-4 text-neutral-400" />Teléfono *
                  </label>
                  <input type="tel" required placeholder="Ej: 600111222" value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-black font-semibold" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold text-neutral-700 mb-1">
                    <FileText className="w-4 h-4 text-neutral-400" />Observaciones
                  </label>
                  <textarea placeholder="Algo que debamos saber..." value={notes}
                    onChange={e => setNotes(e.target.value)} rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-black font-semibold" />
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">{submitError}</div>
                )}

                <button type="submit" disabled={submitting || !customerName || !customerPhone}
                  className="w-full bg-black hover:bg-neutral-900 text-white font-black py-4 rounded-2xl text-base flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
                  {submitting ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</span>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Solicitar Cita</>
                  )}
                </button>
              </form>
            </PageContainer>
          )}
        </div>
      </main>
    </div>
  );
};
