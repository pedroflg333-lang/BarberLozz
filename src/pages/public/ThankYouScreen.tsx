import { motion } from 'framer-motion';
import { Check, ArrowLeft } from 'lucide-react';

interface Service { id: string; nombre: string; precio: number; duracion: number; color: string; descripcion: string | null; }

interface Props {
  customerName: string;
  selectedService: Service | null;
  selectedDate: string;
  selectedTime: string;
  onReset: () => void;
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export const ThankYouScreen = ({ customerName, selectedService, selectedDate, selectedTime, onReset }: Props) => (
  <motion.div
    variants={container}
    initial="hidden"
    animate="show"
    className="min-h-screen bg-white flex flex-col"
  >
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        variants={item}
        className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
        >
          <Check className="w-10 h-10 text-emerald-600 stroke-[3]" />
        </motion.div>
      </motion.div>

      <motion.h1
        variants={item}
        className="text-2xl md:text-3xl font-black text-black mt-6 m-0"
      >
        Solicitud enviada
      </motion.h1>

      <motion.p
        variants={item}
        className="text-neutral-500 m-0 mt-3 text-sm leading-relaxed max-w-sm"
      >
        {customerName}, hemos recibido tu solicitud para{' '}
        <strong className="text-black">{selectedService?.nombre}</strong>
        {' '}el{' '}
        <strong className="text-black">
          {selectedDate ? formatDateFull(selectedDate) : ''}
        </strong>{' '}
        a las{' '}
        <strong className="text-black">{selectedTime}</strong>.
      </motion.p>

      <motion.p
        variants={item}
        className="text-neutral-400 m-0 mt-4 text-xs leading-relaxed max-w-xs"
      >
        El negocio revisará la disponibilidad y la confirmará muy pronto.
      </motion.p>
    </div>

    <motion.div
      variants={item}
      className="px-6 pb-10 md:pb-12"
    >
      <button
        onClick={onReset}
        className="w-full bg-black hover:bg-neutral-900 text-white font-bold text-base py-4 rounded-2xl shadow-xl shadow-black/10 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2.5"
      >
        <ArrowLeft className="w-4 h-5" />
        Volver al inicio
      </button>
    </motion.div>
  </motion.div>
);
