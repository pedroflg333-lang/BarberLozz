import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';

interface TimeSlot { start: string; end: string; employee_id: string; employee_name: string; }

interface Props {
  selectedDate: string;
  selectedTime: string;
  availableSlots: TimeSlot[];
  loadingSlots: boolean;
  onDateChange: (date: string) => void;
  onTimeSelect: (time: string) => void;
}

const today = new Date().toISOString().split('T')[0];

const weekDates = (() => {
  const dates: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
})();

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return {
    dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }),
    dayNum: d.getDate(),
    month: d.toLocaleDateString('es-ES', { month: 'short' }),
    full: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
    isToday: dateStr === today,
  };
}

export const DateTimePicker = ({ selectedDate, selectedTime, availableSlots, loadingSlots, onDateChange, onTimeSelect }: Props) => (
  <div className="space-y-6">
    {/* Date selector */}
    <div>
      <p className="text-xs font-bold text-neutral-400 m-0 mb-3 uppercase tracking-widest">Elige un día</p>
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex gap-2 min-w-min pb-1">
          {weekDates.map(date => {
            const fmt = formatDate(date);
            const isActive = selectedDate === date;
            return (
              <motion.button
                key={date}
                onClick={() => onDateChange(date)}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center py-3 px-4 rounded-2xl border-2 transition-all cursor-pointer shrink-0 min-w-[72px] ${
                  isActive
                    ? 'bg-black text-white border-black shadow-md shadow-black/10'
                    : 'bg-white text-neutral-600 border-neutral-100 hover:border-neutral-300 hover:shadow-sm'
                }`}
              >
                <span className="text-[10px] font-bold uppercase leading-none">{fmt.dayName}</span>
                <span className="text-xl font-black leading-tight mt-1.5">{fmt.dayNum}</span>
                <span className="text-[10px] font-semibold leading-none mt-1">{fmt.month}</span>
                {fmt.isToday && (
                  <span className="w-1 h-1 rounded-full mt-1.5" style={{ backgroundColor: isActive ? '#fff' : '#D4AF37' }} />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>

    {/* Time slots */}
    <AnimatePresence mode="wait">
      {!selectedDate ? (
        <motion.div
          key="prompt"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-neutral-50 rounded-2xl p-8 text-center"
        >
          <Calendar className="w-10 h-10 text-neutral-300 mx-auto" />
          <p className="text-sm text-neutral-400 font-semibold mt-3 m-0">
            Selecciona un día para ver los horarios disponibles.
          </p>
        </motion.div>
      ) : loadingSlots ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-neutral-50 rounded-2xl p-8 text-center"
        >
          <div className="w-10 h-10 rounded-full bg-neutral-200 animate-spin flex items-center justify-center mx-auto">
            <Clock className="w-5 h-5 text-neutral-400" />
          </div>
          <p className="text-sm text-neutral-400 font-semibold mt-3 m-0">Buscando horarios...</p>
        </motion.div>
      ) : availableSlots.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-neutral-50 rounded-2xl p-8 text-center"
        >
          <Calendar className="w-10 h-10 text-neutral-300 mx-auto" />
          <p className="text-sm text-neutral-400 font-semibold mt-3 m-0">
            No hay horas disponibles para este día.
          </p>
          <p className="text-xs text-neutral-300 mt-1 m-0">Prueba con otra fecha.</p>
        </motion.div>
      ) : (
        <motion.div
          key="slots"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <p className="text-xs font-bold text-neutral-400 m-0 mb-3 uppercase tracking-widest">
            {formatDate(selectedDate).full} — {availableSlots.length} horarios
          </p>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5">
            {availableSlots.map(slot => {
              const isActive = selectedTime === slot.start;
              return (
                <motion.button
                  key={slot.start}
                  onClick={() => onTimeSelect(slot.start)}
                  whileTap={{ scale: 0.95 }}
                  className={`py-3.5 px-2 rounded-2xl border-2 font-bold text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-black text-white border-black shadow-md shadow-black/10'
                      : 'bg-white text-neutral-700 border-neutral-100 hover:border-neutral-300 hover:shadow-sm'
                  }`}
                >
                  {slot.start}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
