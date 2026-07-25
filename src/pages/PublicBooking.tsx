import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BACKEND_URL } from '../config/backend';
import {
  Scissors, ChevronLeft, Clock,
  ArrowRight, User, Phone, FileText, Sparkles
} from 'lucide-react';
import { WelcomeScreen } from './public/WelcomeScreen';
import { ProgressBar } from './public/ProgressBar';
import { ServiceCard } from './public/ServiceCard';
import { DateTimePicker } from './public/DateTimePicker';
import { ThankYouScreen } from './public/ThankYouScreen';

type Step = 'welcome' | 'service' | 'employee' | 'datetime' | 'info' | 'done';

interface Service { id: string; nombre: string; precio: number; duracion: number; color: string; descripcion: string | null; }
interface Employee { id: string; full_name: string; }
interface TimeSlot { start: string; end: string; employee_id: string; employee_name: string; }

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  return {
    dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }),
    dayNum: d.getDate(),
    month: d.toLocaleDateString('es-ES', { month: 'short' }),
    full: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
};

const stepToIndex: Record<Step, number> = {
  welcome: -1,
  service: 0,
  employee: 1,
  datetime: 2,
  info: 3,
  done: 4,
};

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

export const PublicBooking: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [step, setStep] = useState<Step>('welcome');
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
    setStep('welcome');
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

  const wizardStep = stepToIndex[step];
  const progressCurrent = wizardStep >= 0 && wizardStep <= 3 ? wizardStep : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border-2 border-[#D4AF37] flex items-center justify-center animate-spin mx-auto">
            <Scissors className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <p className="text-neutral-400 font-semibold">Cargando...</p>
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

  // Welcome screen (separate from wizard)
  if (step === 'welcome') {
    return <WelcomeScreen business={business} onStart={() => setStep('service')} />;
  }

  // Done screen (separate)
  if (step === 'done') {
    return (
      <ThankYouScreen
        customerName={customerName}
        selectedService={selectedService}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onReset={resetFlow}
      />
    );
  }

  const wizardSteps = step === 'service' || step === 'employee' || step === 'datetime' || step === 'info';

  return (
    <div className="min-h-screen bg-[#F5F5F7]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Minimal header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-neutral-100 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {business?.logo_url ? (
              <img src={business.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-[#D4AF37] flex items-center justify-center font-bold text-xs">
                {(business?.nombre || 'B').slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-bold text-black">{business?.nombre}</span>
          </div>
          {wizardSteps && (
            <span className="text-xs font-semibold text-neutral-400">
              Paso {progressCurrent + 1} de 4
            </span>
          )}
        </div>
      </header>

      {/* Progress bar */}
      {wizardSteps && (
        <div className="bg-white/50 px-4 py-4">
          <ProgressBar current={progressCurrent} />
        </div>
      )}

      {/* Main content */}
      <main className="px-4 pt-6 pb-32">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {/* STEP 1: Service */}
            {step === 'service' && (
              <motion.div
                key="service"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-black">1</span>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-black m-0">Elige tu servicio</h2>
                    <p className="text-sm text-neutral-400 m-0 mt-0.5">Selecciona lo que necesitas.</p>
                  </div>
                </div>

                {services.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-neutral-100 text-center">
                    <p className="text-neutral-400 font-semibold">No hay servicios disponibles.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((srv, i) => (
                      <motion.div
                        key={srv.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <ServiceCard
                          service={srv}
                          isSelected={selectedService?.id === srv.id}
                          onSelect={handleSelectService}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: Employee */}
            {step === 'employee' && (
              <motion.div
                key="employee"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <button
                  onClick={() => { setStep('service'); setSelectedService(null); }}
                  className="flex items-center gap-1.5 text-neutral-400 hover:text-black font-semibold text-sm mb-4 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-5" />
                  Atrás
                </button>

                <div className="flex items-center gap-2 mb-6">
                  <span className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-black">2</span>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-black m-0">Elige profesional</h2>
                    <p className="text-sm text-neutral-400 m-0 mt-0.5">¿Con quién prefieres?</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {employees.map(emp => (
                    <motion.button
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      whileTap={{ scale: 0.98 }}
                      className="w-full text-left bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-300 transition-all cursor-pointer shadow-sm hover:shadow-md flex items-center gap-4 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-lg text-neutral-600 shrink-0">
                        {emp.full_name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-black m-0 truncate">{emp.full_name}</h3>
                      </div>
                      <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-600 transition-all shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Date & Time */}
            {step === 'datetime' && (
              <motion.div
                key="datetime"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <button
                  onClick={() => { setStep(employees.length > 1 ? 'employee' : 'service'); }}
                  className="flex items-center gap-1.5 text-neutral-400 hover:text-black font-semibold text-sm mb-4 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-5" />
                  Atrás
                </button>

                <div className="flex items-center gap-2 mb-6">
                  <span className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-black">3</span>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-black m-0">Elige fecha y hora</h2>
                    <p className="text-sm text-neutral-400 m-0 mt-0.5">Selecciona un día y una hora.</p>
                  </div>
                </div>

                <DateTimePicker
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  availableSlots={availableSlots}
                  loadingSlots={loadingSlots}
                  onDateChange={handleDateChange}
                  onTimeSelect={handleTimeSelect}
                />
              </motion.div>
            )}

            {/* STEP 4: Customer Info */}
            {step === 'info' && (
              <motion.div
                key="info"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <button
                  onClick={() => { setStep('datetime'); setSelectedTime(''); }}
                  className="flex items-center gap-1.5 text-neutral-400 hover:text-black font-semibold text-sm mb-4 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-5" />
                  Atrás
                </button>

                <div className="flex items-center gap-2 mb-6">
                  <span className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-black">4</span>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-black m-0">Tus datos</h2>
                    <p className="text-sm text-neutral-400 m-0 mt-0.5">Para confirmar la reserva.</p>
                  </div>
                </div>

                {/* Summary card */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-100 mb-6 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">Servicio</span>
                    <div className="flex items-center gap-2">
                      {selectedService && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedService.color }} />
                      )}
                      <span className="text-sm font-bold text-black">{selectedService?.nombre}</span>
                    </div>
                  </div>
                  {selectedEmployee && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-400">Profesional</span>
                      <span className="text-sm font-bold text-black">{selectedEmployee.full_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">Fecha</span>
                    <span className="text-sm font-bold text-black">{selectedDate ? formatDate(selectedDate).full : ''}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">Hora</span>
                    <span className="text-sm font-bold text-black">{selectedTime}</span>
                  </div>
                  <div className="border-t border-neutral-100 pt-3 flex justify-between items-center">
                    <span className="text-sm font-bold text-neutral-600">Total</span>
                    <span className="text-xl font-black text-black">{selectedService?.precio}€</span>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">
                      <User className="w-3.5 h-3.5" />Nombre
                    </label>
                    <input
                      type="text" required placeholder="Tu nombre" value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-white border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 font-semibold placeholder:text-neutral-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">
                      <Phone className="w-3.5 h-3.5" />Teléfono
                    </label>
                    <input
                      type="tel" required placeholder="Ej: 600 111 222" value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-4 py-3.5 rounded-xl bg-white border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 font-semibold placeholder:text-neutral-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5" />Observaciones
                    </label>
                    <textarea
                      placeholder="Algo que debamos saber..." value={notes}
                      onChange={e => setNotes(e.target.value)} rows={2}
                      className="w-full px-4 py-3.5 rounded-xl bg-white border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 font-semibold placeholder:text-neutral-300 transition-all resize-none"
                    />
                  </div>

                  {submitError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold"
                    >
                      {submitError}
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={submitting || !customerName || !customerPhone}
                    whileTap={!submitting && customerName && customerPhone ? { scale: 0.98 } : {}}
                    className="w-full bg-black hover:bg-neutral-900 text-white font-bold text-base py-4 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-black/10"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </span>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> Solicitar Cita</>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating summary bar (visible after service is selected) */}
      {wizardSteps && selectedService && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-neutral-100 px-4 py-3 z-50"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {selectedService && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedService.color }} />
                )}
                <span className="text-sm font-bold text-black truncate">{selectedService.nombre}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-neutral-400">
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {selectedService.duracion} min
                </span>
                {selectedEmployee && (
                  <span className="text-xs text-neutral-400">· {selectedEmployee.full_name}</span>
                )}
                {selectedDate && (
                  <span className="text-xs text-neutral-400">· {formatDate(selectedDate).dayName} {selectedDate.slice(8, 10)}</span>
                )}
                {selectedTime && (
                  <span className="text-xs text-neutral-400">· {selectedTime}</span>
                )}
              </div>
            </div>
            <span className="text-lg font-black text-black ml-3 shrink-0">{selectedService.precio}€</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
