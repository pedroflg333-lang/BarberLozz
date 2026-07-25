import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface Props {
  business: { id: string; nombre: string; logo_url: string | null };
  onStart: () => void;
}

export const WelcomeScreen = ({ business, onStart }: Props) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="min-h-screen bg-white flex flex-col"
  >
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {business.logo_url ? (
          <img src={business.logo_url} alt="" className="w-24 h-24 rounded-3xl object-cover shadow-lg border border-neutral-100" />
        ) : (
          <div className="w-24 h-24 rounded-3xl bg-neutral-900 text-[#D4AF37] flex items-center justify-center font-black text-3xl shadow-lg">
            {business.nombre.slice(0, 2).toUpperCase()}
          </div>
        )}
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-3xl md:text-4xl font-black text-black mt-8 m-0"
      >
        {business.nombre}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-sm font-semibold text-neutral-400 m-0 mt-2 uppercase tracking-[0.2em]"
      >
        Reserva online
      </motion.p>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-neutral-500 m-0 mt-6 text-base leading-relaxed max-w-xs"
      >
        Reserva tu cita en menos de un minuto
      </motion.p>
    </div>

    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="px-6 pb-10 md:pb-12"
    >
      <button
        onClick={onStart}
        className="w-full bg-black hover:bg-neutral-900 text-white font-bold text-lg py-5 rounded-2xl shadow-xl shadow-black/10 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <Sparkles className="w-5 h-5" />
        Reservar ahora
      </button>
    </motion.div>
  </motion.div>
);
